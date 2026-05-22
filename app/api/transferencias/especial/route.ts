import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchGanamosAPI, getUsuarioSaldo } from "@/lib/ganamosApi";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { usuarioCasino, tipo } = await req.json();

    if (!usuarioCasino || !tipo) {
      return NextResponse.json({ error: "Faltan datos (Usuario o Tipo de Carga)" }, { status: 400 });
    }

    const safeUsername = usuarioCasino.trim().toLowerCase();
    const monto = tipo === 'CANAL' ? 1000 : 500;

    // 1. Obtener ID de usuario en Ganamos
    const usuarioData = await getUsuarioSaldo(safeUsername);
    const userId = usuarioData.id;

    if (!userId) {
      return NextResponse.json({ error: "Usuario no encontrado en Ganamos" }, { status: 404 });
    }

    // 2. Realizar la transferencia de regalo en Ganamos
    // Ganamos usa el endpoint de transferencia para acreditar fondos
    const ganamosResponse = await fetchGanamosAPI(`/api/agent_admin/transfer/`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        amount: monto,
        type: "DEPOSIT", // O el tipo correcto según tu integración de Ganamos
        comment: `Regalo especial: ${tipo}`
      })
    });

    if (ganamosResponse && ganamosResponse.status !== 0) {
      return NextResponse.json({ error: `Ganamos rechazó: ${ganamosResponse.error_message}` }, { status: 400 });
    }

    // 3. Registrar en nuestra BD
    const timestamp = Date.now();
    await Transferencia.create({
      remitente: tipo,
      monto: monto,
      montoBono: 0,
      cuit: "S/D",
      coelsaCode: `ESPECIAL-${timestamp}`,
      estado: "CARGADA",
      usuarioCasino: safeUsername,
      cajeroAsignado: (session.user as any).id,
      fechaCarga: new Date(),
      conBono: true,
      transaccionId: `ESPECIAL-${timestamp}`
    });

    return NextResponse.json({ success: true, acreditado: monto });
  } catch (error: any) {
    console.error("ERROR CARGA ESPECIAL:", error);
    return NextResponse.json({ error: "Error de servidor: " + error.message }, { status: 500 });
  }
}