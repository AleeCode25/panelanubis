import Config from "@/models/Config";

export async function getValidGanamosToken() {
  // 1. Buscamos el token actual en la DB
  let config = await Config.findOne({ key: "ganamos_session" });
  let rawToken = config?.value || "";
  // Quitamos el prefijo "session=" si existe para poder decodificar el JWT
  let token = rawToken.startsWith("session=") ? rawToken.replace("session=", "") : rawToken;
  let needsRefresh = true;

  if (token) {
    try {
      // 2. Magia JWT: Decodificamos la parte central del token para leer la fecha
      const payloadBase64 = token.split('.')[1];
      const payloadString = Buffer.from(payloadBase64, 'base64').toString();
      const payload = JSON.parse(payloadString);

      // payload.exp está en segundos. Le damos un margen de 1 día (86400 seg) de seguridad
      if (payload.exp && (payload.exp * 1000) > Date.now() + 86400000) {
        needsRefresh = false; 
      }
    } catch (e) {
      console.error("Error leyendo token viejo, forzando renovación...");
    }
  }

  // 3. Si el token está flama, lo devolvemos y cortamos acá
  if (!needsRefresh) {
    return token;
  }

  // 4. Si no hay token o está vencido, hacemos el Login
  console.log("🔄 Generando nuevo token de Ganamos...");
  
  const loginResponse = await fetch("https://agents.ganamosnet.org/api/user/login", {
    method: "POST",
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "es-ES,es;q=0.9",
      "content-type": "application/json;charset=UTF-8",
      "origin": "https://agents.ganamosnet.org",
      "referer": "https://agents.ganamosnet.org/",
      "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"iOS"',
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"
    },
    body: JSON.stringify({
      username: process.env.GANAMOS_USER, 
      password: process.env.GANAMOS_PASS  
    })
  });

  const data = await loginResponse.json();

  if (loginResponse.ok && data.status === 0) {
    // Extraemos el Set-Cookie de los headers
    const setCookieHeader = loginResponse.headers.get("set-cookie");
    
    // Usamos una expresión regular para sacar solo el valor de "session="
    const sessionMatch = setCookieHeader?.match(/session=([^;]+)/);

    if (sessionMatch && sessionMatch[1]) {
      const newToken = sessionMatch[1];

      // 5. Guardamos o actualizamos en MongoDB para la próxima vez
      if (config) {
        config.value = newToken;
        await config.save();
      } else {
        await Config.create({ key: "ganamos_session", value: newToken });
      }

      console.log("✅ Nuevo token de Ganamos guardado en DB.");
      return newToken;
    }
  }

  // 🔥 MODO DEBUG: Si falla, que nos diga exactamente por qué
  console.error("❌ Falló el login en Ganamos. Respuesta del servidor:", data);
  throw new Error(`No se pudo generar el token de Ganamos. Motivo: ${data.error_message || 'Desconocido'}`);
}