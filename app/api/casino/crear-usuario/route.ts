import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getValidGanamosToken } from "@/lib/ganamosAuth"; // Importamos el helper

// 1. HEADERS EXACTOS DEL NAVEGADOR (Para pasar desapercibidos)
const GANAMOS_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'es-419,es;q=0.9,en;q=0.8,fr;q=0.7,ru;q=0.6',
  'content-type': 'application/json;charset=UTF-8',
  'origin': 'https://agents.ganamosnet.org',
  'priority': 'u=1, i',
  'referer': 'https://agents.ganamosnet.org/user/create-player',
  'sec-ch-ua': '"Chromium";v="148", "Opera GX";v="132", "Not/A)Brand";v="99"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36'
};

// 2. COOKIES HARDCODEADAS (Seguridad y Analíticas, SIN la sesión)
const HARDCODED_TRACKING_COOKIES = "_ga=GA1.1.1924775346.1778017632; _ym_uid=1778795784175439850; _ym_d=1778795784; twk_uuid_6479ead6ad80445890f0a9e8=%7B%22uuid%22%3A%221.7xbICvIALHNrffUjCjdju6c6MVAV7031eyAu3fzJCtAxs3m3a4Z0W7ZNzku1iGcR72zDN7jXwrSQp0BtMv3f6uzrZ5sB0RC7PhPOD2720gEaYaUmwtgnz9VR%22%2C%22version%22%3A3%2C%22domain%22%3A%22ganamosnet.org%22%2C%22ts%22%3A1779519961370%7D; _clck=1eiyn5e%5E2%5Eg70%5E0%5E2360; spid=1781807599728_28f405a0a9a0ff6434dd3bf90d66ea0b_8rpuuc0gcjxd1cx9; spsc=1781808183155_02102f40359c46ca1da1b79984343b8e_Llb6hnkpzvmyLgzwApqrL4IpqPVUyHk82-qNYmYMtJAZ; _clsk=b6s00j%5E1781809447925%5E3%5E1%5Et.clarity.ms%2Fcollect; _ga_KVDL5XPDJM=GS2.1.s1781807768$o14$g1$t1781809448$j60$l0$h0";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { username, password, email = "", first_name = "", last_name = "", role = 0 } = body;
    const safeUsername = username.trim().toLowerCase();

    // 🚀 Llama al helper para traer el token vivo
    const token = await getValidGanamosToken();
    const cleanToken = token.startsWith('session=') ? token : `session=${token}`;

    // 👇 MAGIA: Juntamos las cookies de seguridad + tu sesión real
    const finalCookies = `${HARDCODED_TRACKING_COOKIES}; ${cleanToken}`;

    const ganamosUrl = "https://agents.ganamosnet.org/api/agent_admin/user/";
    
    console.log(`👤 Intentando crear usuario: ${safeUsername}...`);

    const response = await fetch(ganamosUrl, {
      method: 'POST',
      headers: {
        ...GANAMOS_HEADERS,
        'Cookie': finalCookies
      },
      body: JSON.stringify({
        username: safeUsername,
        password: password,
        email: email,
        first_name: first_name,
        last_name: last_name,
        role: role
      }),
      redirect: 'manual' // Para que no entre en bucles si Cloudflare molesta
    });

    // Leemos texto plano primero para evitar crashes si el server devuelve HTML/Blank
    const textResponse = await response.text();

    if (response.status === 307 || response.type === 'opaqueredirect') {
      console.error("Cloudflare bloqueó la creación (307).");
      return NextResponse.json({ error: "Bloqueo de seguridad de Ganamos. Intentá de nuevo en unos minutos." }, { status: 400 });
    }

    let data;
    try {
      data = JSON.parse(textResponse);
    } catch (e) {
      console.error(`❌ La API devolvió un error inesperado (Status ${response.status}). Body: "${textResponse}"`);
      return NextResponse.json({ error: `La API de Ganamos falló (Status ${response.status})` }, { status: 500 });
    }

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