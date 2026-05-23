import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
// 👇 IMPORTANTE: Importamos el nuevo modelo de Ganamos
import UserGanamos from "@/models/UserGanamos"; 
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await dbConnect();
    
    // Verificamos si ya existe el admin buscando por "usuario" (el campo correcto)
    const adminExists = await UserGanamos.findOne({ usuario: "adminsito" });
    if (adminExists) {
      return NextResponse.json({ msg: "El Admin ya existe en la nueva base de datos." });
    }

    const hashedPassword = await bcrypt.hash("Prime2026@", 10);
    
    // Creamos el admin en la colección 'users_ganamos'
    await UserGanamos.create({
      usuario: "adminsito", // Usamos solo 'usuario' como dice tu esquema
      password: hashedPassword,
      nombre: "El Admin",
      canPay: true,
      role: "ADMIN"
    });

    return NextResponse.json({ msg: "Admin creado con éxito. User: adminsito, Pass: Prime2026@" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}