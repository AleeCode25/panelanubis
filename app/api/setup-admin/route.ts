import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET() {
  await dbConnect();
  
  // Verificamos si ya existe un admin para no duplicar
  const adminExists = await User.findOne({ username: "admin" });
  if (adminExists) return NextResponse.json({ msg: "Admin ya existe" });

  const hashedPassword = await bcrypt.hash("Prime2026@", 10); // CAMBIA ESTO LUEGO
  
  await User.create({
    username: "adminsito",
    usuario: "adminsito",
    password: hashedPassword,
    nombre: "El Admin",
    canPay: true,
    role: "ADMIN"
  });

  return NextResponse.json({ msg: "Admin creado con éxito. User: admin, Pass: Prime2026@" });
}