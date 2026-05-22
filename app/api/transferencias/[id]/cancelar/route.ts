import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // En versiones nuevas de Next.js, params debe ser esperado
    const { id } = await params;
    
    console.log("Intentando cancelar la transferencia ID:", id);

    const check = await Transferencia.findById(id);
    if (!check) {
      console.log("No se encontró la transferencia con ese ID");
      return NextResponse.json({ error: "Transferencia no encontrada" }, { status: 404 });
    }

    // Forzamos el cambio de estado
    const actualizado = await Transferencia.findByIdAndUpdate(
      id, 
      { $set: { estado: 'CANCELADA' } }, 
      { new: true }
    );

    console.log("Resultado de la actualización:", actualizado.estado);

    return NextResponse.json({ success: true, nuevoEstado: actualizado.estado });
  } catch (error: any) {
    console.error("Error en API cancelar:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}