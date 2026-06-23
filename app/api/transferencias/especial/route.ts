import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// 👇 Importamos las funciones de la nueva API limpia
import { getUsuarioSaldo, cargarSaldoGanamos } from "@/lib/ganamosApi";

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
    let userId;
    try {
      const usuarioData = await getUsuarioSaldo(safeUsername);
      userId = usuarioData.id;
    } catch (e) {
      return NextResponse.json({ error: "Usuario no encontrado en Ganamos" }, { status: 404 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Usuario no encontrado en Ganamos" }, { status: 404 });
    }

    // 2. Realizar la carga usando el nuevo endpoint limpio
    try {
      // Le mandamos el userId, el monto base, 0 de bono fijo y 0 de bono porcentual
      await cargarSaldoGanamos(userId, monto, 0, 0);
    } catch (ganamosError: any) {
      return NextResponse.json({ 
        error: `Ganamos rechazó la carga especial: ${ganamosError.message}` 
      }, { status: 400 });
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