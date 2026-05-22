import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Config from "@/models/Config";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { toCBU, amount } = await req.json();

    const configToken = await Config.findOne({ key: "WALLET_TOKEN" });
    const configAccount = await Config.findOne({ key: "WALLET_ACCOUNT_ID" });

    if (!configToken?.value || !configAccount?.value) {
      return NextResponse.json({ error: "Billetera no configurada en Ajustes" }, { status: 500 });
    }

    const resp = await fetch(`https://hg.cash/api/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${configToken.value}`
      },
      body: JSON.stringify({
        accountId: configAccount.value,
        toCBU: toCBU.trim(),
        amount: Number(amount),
        concept: "Retiro Club Prime"
      })
    });

    const data = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: data.message || "Error en billetera" }, { status: 400 });

    // REGISTRAMOS EL PAGO EN LA BASE DE DATOS
    await Transferencia.create({
      remitente: "PAGO_BILLETERA", 
      monto: Number(amount), 
      cuit: "S/D",
      coelsaCode: data.id, 
      estado: "CARGADA", 
      usuarioCasino: "PAGO DIRECTO", 
      cajeroAsignado: (session.user as any).id,
      fechaCarga: new Date(),
      montoBono: 0,
      conBono: false,
      transaccionId: `PAGO-${data.id}`
    });

    return NextResponse.json({ success: true, transactionId: data.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}