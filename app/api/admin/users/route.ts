import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    
    // 🔥 EL FIX MÁGICO PARA EL ERROR E11000:
    // Le decimos a MongoDB que borre la regla vieja de "username" si todavía existe
    try {
      await User.collection.dropIndex("username_1");
      console.log("🧹 Índice viejo 'username_1' eliminado de la base de datos.");
    } catch (indexError) {
      // Lo ignoramos, significa que ya se borró antes.
    }

    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { nombre, usuario, password, canPay } = body;

    if (!nombre || !usuario || !password) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    // Verificar si el usuario nuevo ya existe (usando el campo correcto)
    const existe = await User.findOne({ usuario });
    if (existe) {
      return NextResponse.json({ error: "El nombre de usuario ya existe" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await User.create({
      nombre,
      usuario,
      password: hashedPassword,
      role: "CAJERO",
      canPay: canPay || false
    });

    console.log("✅ Usuario creado:", nuevoUsuario.usuario);
    return NextResponse.json({ success: true, user: { id: nuevoUsuario._id, usuario: nuevoUsuario.usuario } });

  } catch (error: any) {
    console.error("❌ ERROR AL CREAR USUARIO:", error.message);
    return NextResponse.json({ error: "Error interno al crear usuario" }, { status: 500 });
  }
}