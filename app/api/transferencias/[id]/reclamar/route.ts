import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const transfer = await Transferencia.findOneAndUpdate(
      { _id: id, estado: "PENDIENTE" },
      { 
        estado: "EN_PROCESO", 
        cajeroAsignado: (session.user as any).id 
      },
      { returnDocument: 'after' }
    );

    if (!transfer) {
      return NextResponse.json({ error: "La transferencia ya fue tomada." }, { status: 409 });
    }

    return NextResponse.json(transfer);
  } catch (err) {
    return NextResponse.json({ error: "Error al reclamar" }, { status: 500 });
  }
}