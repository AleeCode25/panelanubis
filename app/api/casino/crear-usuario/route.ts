import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { crearUsuarioGanamos } from "@/lib/ganamosApi"; // 👇 Importamos el nuevo helper limpio

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { username, password } = body;
    
    // Validación básica de datos
    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña son obligatorios" }, { status: 400 });
    }

    const safeUsername = username.trim().toLowerCase();

    console.log(`👤 Intentando crear usuario: ${safeUsername} vía nueva API...`);

    try {
      // Llamamos directo a nuestra nueva función que usa Basic Auth
      const data = await crearUsuarioGanamos(safeUsername, password);
      
      return NextResponse.json({ 
        success: true, 
        message: "Usuario creado con éxito",
        data: data 
      });

    } catch (ganamosError: any) {
      console.error(`❌ La API de Ganamos rechazó la creación:`, ganamosError.message);
      return NextResponse.json({
        success: false,
        error: ganamosError.message || "Error al crear usuario en Ganamos"
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("🔥 Error interno creando usuario:", error);
    return NextResponse.json({ error: error.message || "Error de servidor" }, { status: 500 });
  }
}