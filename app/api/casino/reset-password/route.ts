import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchGanamosAPI, getUsuarioSaldo } from "@/lib/ganamosApi";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Recibimos el usuario y la clave desde el body
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña son requeridos" }, { status: 400 });
    }

    const safeUsername = username.trim().toLowerCase();
    const nuevaClave = password.trim();

    // 1. Obtenemos el ID del usuario en Ganamos usando la función que ya usamos para saldo
    // Esta función busca al usuario por nombre y nos devuelve su objeto incluyendo el ID
    const usuarioData = await getUsuarioSaldo(safeUsername);
    const userId = usuarioData.id;

    if (!userId) {
      return NextResponse.json({ error: "Usuario no encontrado en Ganamos" }, { status: 404 });
    }

    // 2. Llamamos a la API de Ganamos para hacer el PATCH de contraseña
    // Estructura: /api/agent_admin/user/{userId}/
    const ganamosResponse = await fetchGanamosAPI(`/api/agent_admin/user/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ password: nuevaClave })
    });

    // 3. Verificamos respuesta (Ganamos suele responder con status: 0 para éxito)
    if (ganamosResponse && ganamosResponse.status === 0) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({
        error: ganamosResponse?.error_message || "Error al actualizar la contraseña en Ganamos"
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("ERROR EN RESET PASSWORD:", error);
    return NextResponse.json({ 
      error: error.message || "Error interno del servidor" 
    }, { status: 500 });
  }
}