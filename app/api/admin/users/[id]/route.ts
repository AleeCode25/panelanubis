// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request, { params }: any) {
  try {
    await dbConnect();
    const { id } = await params; // IMPORTANTE: await en los params
    const { nombre, usuario, password, canPay } = await req.json();

    const updateData: any = { nombre, usuario, canPay };
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await User.findByIdAndUpdate(id, updateData);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: any) {
  await dbConnect();
  const { id } = await params;
  await User.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}