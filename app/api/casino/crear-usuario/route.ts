import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getValidGanamosToken } from "@/lib/ganamosAuth"; // Importamos el helper

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { username, password, email = "", first_name = "", last_name = "", role = 0 } = body;
    const safeUsername = username.trim().toLowerCase();

    // 🚀 Llama al helper. Si hay token, lo trae al instante. Si no, loguea, guarda y trae el nuevo.
    const token = await getValidGanamosToken();

    const ganamosUrl = "https://agents.ganamosnet.org/api/agent_admin/user/";
    
    const response = await fetch(ganamosUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${token.replace('session=', '')}`, // Aseguramos que solo el valor del token se envíe en la cookie
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
        'Origin': 'https://agents.ganamosnet.org',
        'Referer': 'https://agents.ganamosnet.org/',
        'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"iOS"'
      },
      body: JSON.stringify({
        username: safeUsername,
        password: password,
        email: email,
        first_name: first_name,
        last_name: last_name,
        role: role
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 0) {
      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json({
        success: false,
        error: data.error_message || "Error al crear usuario en Ganamos"
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Error creando usuario en Ganamos:", error);
    return NextResponse.json({ error: error.message || "Error de servidor" }, { status: 500 });
  }
}