import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { fetchGanamosAPI, getUsuarioSaldo } from "@/lib/ganamosApi";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { username, amount } = body;

    if (!username || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Faltan datos o el monto es inválido" }, { status: 400 });
    }

    const safeUsername = username.trim().toLowerCase();

    // 1. Buscamos el ID del usuario en Ganamos usando el helper blindado
    const saldoData = await getUsuarioSaldo(safeUsername);
    const userId = saldoData.id;

    // 2. Realizamos la operación de retiro (operation: 1 = OUTCOME)
    // Nos aseguramos de enviar SOLO lo que el curl pide: operation y amount
    const paymentBody = {
      operation: 1, 
      amount: Number(amount)
    };

    // Aseguramos que la URL termine en barra y pasamos el método POST explícito
    const ganamosResponse = await fetchGanamosAPI(`/api/agent_admin/user/${userId}/payment/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentBody)
    });

    // Control de errores de Ganamos
    if (ganamosResponse.status !== 0) {
      return NextResponse.json({ 
        error: `Ganamos rechazó el retiro: ${ganamosResponse.error_message || 'Error desconocido'}` 
      }, { status: 400 });
    }

    // 3. REGISTRO EN LA BASE DE DATOS
    const timestamp = Date.now();
    await Transferencia.create({
      remitente: "RETIRO",
      monto: Number(amount),
      cuit: "00-00000000-0",
      coelsaCode: `RETIRO-${timestamp}`,
      estado: "CARGADA", 
      usuarioCasino: safeUsername,
      cajeroAsignado: (session.user as any).id,
      fechaCarga: new Date(),
      montoBono: 0,
      conBono: false,
      transaccionId: `RETIRO-${timestamp}`
    });

    return NextResponse.json({ 
      success: true, 
      amount, 
      username: safeUsername
    });

  } catch (error: any) {
    console.error("ERROR EN RETIRO GANAMOS:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
  }
}