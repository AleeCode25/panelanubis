import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Config from "@/models/Config";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Función para CARGAR los datos cuando abris la pantalla
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 👇 Buscamos exactamente la clave "ganamos_session" que mostraste en la BD
    const ganamosToken = await Config.findOne({ key: "ganamos_session" });
    const wallet = await Config.findOne({ key: "WALLET_TOKEN" });
    const account = await Config.findOne({ key: "WALLET_ACCOUNT_ID" });
    const bono = await Config.findOne({ key: "BONO_PORCENTAJE" }); 

    return NextResponse.json({
      zeusToken: ganamosToken?.value || "", // Usamos zeusToken para que el frontend lo entienda sin tocarlo
      walletToken: wallet?.value || "",
      walletAccountId: account?.value || "",
      bonoPorcentaje: bono?.value || "0" 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Función para GUARDAR los datos
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { zeusToken, walletToken, walletAccountId, bonoPorcentaje } = await req.json();

    // 👇 Guardamos sobre "ganamos_session"
    if (zeusToken !== undefined) {
      await Config.findOneAndUpdate({ key: "ganamos_session" }, { value: zeusToken }, { upsert: true });
    }
    if (walletToken !== undefined) {
      await Config.findOneAndUpdate({ key: "WALLET_TOKEN" }, { value: walletToken }, { upsert: true });
    }
    if (walletAccountId !== undefined) {
      await Config.findOneAndUpdate({ key: "WALLET_ACCOUNT_ID" }, { value: walletAccountId }, { upsert: true });
    }
    if (bonoPorcentaje !== undefined) {
      await Config.findOneAndUpdate({ key: "BONO_PORCENTAJE" }, { value: String(bonoPorcentaje) }, { upsert: true }); 
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}