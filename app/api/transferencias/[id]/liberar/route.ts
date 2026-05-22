import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    
    // 1. Extraemos el ID y le quitamos cualquier espacio en blanco accidental
    const { id } = await params;
    const cleanId = id.trim(); 
    
    console.log(`Intentando liberar el _id exacto: '${cleanId}'`);

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // 2. Buscamos EXPLÍCITAMENTE por _id como sugeriste
    const transfer = await Transferencia.findOneAndUpdate(
      { _id: cleanId }, 
      { 
        estado: "PENDIENTE", 
        cajeroAsignado: null 
      },
      { new: true }
    );

    if (!transfer) {
      console.log("❌ Error: No se encontró la transferencia con _id:", cleanId);
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    console.log("✅ Transferencia liberada con éxito:", cleanId);
    return NextResponse.json({ mensaje: "Transferencia liberada correctamente" });

  } catch (err: any) {
    console.error("❌ Error en la API de liberar:", err.message);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}