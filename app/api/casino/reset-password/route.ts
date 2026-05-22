import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Config from "@/models/Config";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // 👇 Ahora recibimos tanto el usuario como la clave elegida
    const { username, password } = await req.json();
    
    const safeUsername = username.trim().toLowerCase();
    const nuevaClave = password ? password.trim() : "12345678"; // Si mandan vacío por error, atajamos con 12345678

    const zeusUrl = `https://admin.casino-zeus.eu/api/operator/v1/users/${safeUsername}/reset-password`;
    const config = await Config.findOne({ key: "ZEUS_TOKEN" });

    if (!config || !config.value) {
      return NextResponse.json({ error: "Falta configurar el Token de Zeus en el panel de Admin" }, { status: 500 });
    }

    const token = config.value;

    const response = await fetch(zeusUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PostmanRuntime/7.51.0'
      },
      // 👇 Mandamos la clave personalizada a Zeus
      body: JSON.stringify({ password: nuevaClave })
    });

    if (response.ok) {
      return NextResponse.json({ success: true });
    } else {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: errorData.message || "No se pudo encontrar al usuario o error en Zeus"
      }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}