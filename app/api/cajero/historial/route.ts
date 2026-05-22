import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) return NextResponse.json({ error: "Falta el usuario" }, { status: 400 });

    // Buscamos todas las transferencias de ese usuario, ordenadas por la más reciente
    const historial = await Transferencia.find({ 
      usuarioCasino: { $regex: new RegExp(`^${username.trim()}$`, "i") },
      estado: "CARGADA" 
    })
    .populate("cajeroAsignado", "nombre")
    .sort({ fechaCarga: -1 });

    return NextResponse.json(historial);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}