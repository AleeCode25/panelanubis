import dbConnect from "@/lib/mongodb";
import Config from "@/models/Config";

// Tus credenciales maestras de Ganamos (idealmente ponelas en tu .env)
const GANAMOS_USER = process.env.GANAMOS_USER || "Anubis031";
const GANAMOS_PASS = process.env.GANAMOS_PASS || "alan123";

// Los headers estrictos que sacamos del bash para que no nos tire error de request_from
const GANAMOS_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'es-ES,es;q=0.9',
  'content-type': 'application/json;charset=UTF-8',
  'origin': 'https://agents.ganamosnet.org',
  'referer': 'https://agents.ganamosnet.org/',
  'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"iOS"',
  'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
};

/**
 * Función maestra para obtener el token válido
 */
export async function getGanamosSessionToken() {
  await dbConnect();
  const now = new Date();

  // 1. Buscamos el token en la base de datos
  let sessionConfig = await Config.findOne({ key: 'ganamos_session' });

  // 2. Si existe y vence en más de 1 hora, lo usamos
  if (sessionConfig && sessionConfig.expiresAt > new Date(now.getTime() + 60 * 60 * 1000)) {
    console.log("✅ Usando token de Ganamos desde MongoDB");
    return sessionConfig.value;
  }

  // 3. Si no existe o está por expirar, hacemos Login en Ganamos
  console.log("🔄 Generando nuevo token en Ganamos...");
  
  try {
    const response = await fetch('https://agents.ganamosnet.org/api/user/login', {
      method: 'POST',
      headers: GANAMOS_HEADERS,
      body: JSON.stringify({ username: GANAMOS_USER, password: GANAMOS_PASS }),
      cache: 'no-store'
    });

    const data = await response.json();

    if (data.status !== 0) {
      throw new Error(`Error en login de Ganamos: ${data.error_message || 'Desconocido'}`);
    }

    // Extraemos las cookies de los headers de respuesta
    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) throw new Error("No se recibió la cookie de sesión de Ganamos");

    // Buscamos la cookie que empieza con 'session=' y la cortamos hasta el punto y coma
    const sessionMatch = setCookieHeader.match(/session=([^;]+)/);
    if (!sessionMatch) throw new Error("No se encontró el token de sesión en las cookies");

    const tokenExtraido = `session=${sessionMatch[1]}`;

    // Calculamos vencimiento a 15 días
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);

    // 4. Guardamos en MongoDB
    await Config.findOneAndUpdate(
      { key: 'ganamos_session' },
      { 
        value: tokenExtraido,
        expiresAt: expiresAt 
      },
      { upsert: true, new: true }
    );

    console.log("💾 Nuevo token de Ganamos guardado por 15 días");
    return tokenExtraido;

  } catch (error) {
    console.error("🔥 Error crítico al conectar con Ganamos:", error);
    throw error;
  }
}

/**
 * Función para hacer peticiones a la API de Ganamos ya autenticado
 */
export async function fetchGanamosAPI(endpoint: string, options: RequestInit = {}) {
  const token = await getGanamosSessionToken();

  const finalOptions: RequestInit = {
    ...options,
    headers: {
      ...GANAMOS_HEADERS,
      ...options.headers,
      'Cookie': token // Inyectamos la sesión acá
    }
  };

  const url = `https://agents.ganamosnet.org${endpoint}`;
  
  const response = await fetch(url, finalOptions);
  
  // Si nos da 401, el token expiró prematuramente. Lo borramos para que se regenere la próxima.
  if (response.status === 401) {
    await Config.deleteOne({ key: 'ganamos_session' });
    throw new Error("Token expirado (401). Se forzará relogin en el próximo intento.");
  }

  return response.json();
}

export async function getUsuarioSaldo(username: string) {
  // 1. Buscamos el usuario para obtener su ID
  const searchResult = await fetchGanamosAPI(`/api/agent_admin/user/search/?username=${username}&is_direct_structure=false`);
  
  if (searchResult.status !== 0 || !searchResult.result.data || searchResult.result.data.length === 0) {
    throw new Error("Usuario no encontrado en Ganamos");
  }

  const userId = searchResult.result.data[0].id;

  // 2. Con el ID, buscamos el perfil completo (que incluye el balance)
  const userProfile = await fetchGanamosAPI(`/api/agent_admin/user/${userId}/`);

  if (userProfile.status !== 0) {
    throw new Error("No se pudo obtener el saldo del usuario");
  }

  return {
    id: userId,
    balance: userProfile.result.user.balance,
    bonus_balance: userProfile.result.user.bonus_balance,
    username: userProfile.result.user.username
  };
}