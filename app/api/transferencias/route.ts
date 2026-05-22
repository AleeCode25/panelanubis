import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import User from "@/models/User"; // <-- SÚPER IMPORTANTE PARA QUE NO FALLE EL POPULATE

// 🔥 Esto le dice a Vercel/Next.js: "No me congeles esta ruta, los datos cambian todo el tiempo"
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    // Leemos el parámetro de la URL (ej: ?estado=PENDIENTE)
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado');

    let query: any = {};
    if (estado) {
      query.estado = estado;
    }

    // Buscamos en la base de datos
    const transferencias = await Transferencia.find(query)
      .populate('cajeroAsignado', 'nombre') // Trae el nombre del cajero
      .sort({ createdAt: -1 }); // Las más nuevas primero

    return NextResponse.json(transferencias);

  } catch (error: any) {
    console.error("🔥 Error en GET /api/transferencias:", error.message);
    return NextResponse.json({ error: "Error al obtener las transferencias" }, { status: 500 });
  }
}

// Si tenías un método POST en este mismo archivo para crear transferencias,
// asegúrate de dejarlo aquí abajo. Si no lo tenías, ignora este comentario.