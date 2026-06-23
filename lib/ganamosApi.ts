// lib/ganamosApi.ts

const NUEVA_API_URL = "https://caja-api.ganamosnet.win";

// ⚠️ ACORDATE DE CAMBIAR LA CONTRASEÑA POR LA REAL DE LA CAPTURA
const BASIC_AUTH_USER = "yjyt7jmQDxE2kWc9"; 
const BASIC_AUTH_PASS = process.env.NUEVA_API_PASS || "yjyt7jmQDxE2kWc9"; 

/**
 * Helper para generar los headers de Basic Auth
 */
function getAuthHeaders() {
  const credentials = Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Obtener Saldo usando la nueva API
 */
export async function getUsuarioSaldo(username: string) {
  try {
    console.log(`🔍 Resolviendo ID para el usuario: ${username}...`);
    
    // 1. Obtener el ID del usuario
    const resolveUrl = `${NUEVA_API_URL}/users/resolve?username=${username}`;
    const resolveRes = await fetch(resolveUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store'
    });

    if (!resolveRes.ok) {
      throw new Error(`Fallo al resolver usuario. Status: ${resolveRes.status}`);
    }

    const resolveData = await resolveRes.json();
    const userId = resolveData.userId;

    if (!userId) {
      throw new Error("El usuario no existe o la API no devolvió un ID.");
    }

    console.log(`✅ Usuario encontrado. ID: ${userId}. Consultando saldo...`);

    // 2. Obtener el balance usando el ID
    const balanceUrl = `${NUEVA_API_URL}/users/${userId}/balance`;
    const balanceRes = await fetch(balanceUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store'
    });

    if (!balanceRes.ok) {
      throw new Error(`Fallo al obtener balance. Status: ${balanceRes.status}`);
    }

    const balanceData = await balanceRes.json();

    if (!balanceData.success) {
      throw new Error(balanceData.error || "La API devolvió success: false");
    }

    console.log(`💰 Saldo obtenido: $${balanceData.balanceTotal}`);

    // 3. Devolvemos el formato exacto que espera tu frontend/backend actual
    return {
      id: userId,
      username: resolveData.username,
      balance: balanceData.balanceTotal,
      // La nueva API no parece devolver saldo de bono separado, así que mandamos 0 para que no rompa nada
      bonus_balance: 0 
    };

  } catch (error: any) {
    console.error("❌ Error en la nueva API de Ganamos:", error.message);
    throw new Error(`Error de API: ${error.message}`);
  }
}

export async function cargarSaldoGanamos(userId: number, amount: number, bonus_amount: number = 0, percent_amount: number = 0) {
  const url = `${NUEVA_API_URL}/users/${userId}/balance`;
  
  const bodyParams = {
    amount: amount,
    bonus_amount: bonus_amount,
    percent_amount: percent_amount
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(bodyParams),
    cache: 'no-store'
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error en la API de carga (Status ${res.status}): ${errorText}`);
  }

  const data = await res.json();
  
  if (!data.success) {
    throw new Error(data.error || "La API devolvió success: false al intentar cargar.");
  }

  return data;
}

export async function retirarSaldoGanamos(userId: number, amount: number) {
  const url = `${NUEVA_API_URL}/users/${userId}/balance/withdraw`;
  
  const bodyParams = {
    amount: amount,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(bodyParams),
    cache: 'no-store'
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error en la API de retiro (Status ${res.status}): ${errorText}`);
  }

  const data = await res.json();
  
  if (!data.success) {
    throw new Error(data.error || "La API devolvió success: false al intentar retirar.");
  }

  return data;
}

export async function crearUsuarioGanamos(username: string, password: string) {
  const url = `${NUEVA_API_URL}/users`;
  
  const bodyParams = {
    username: username,
    password: password
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(bodyParams),
    cache: 'no-store'
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error en la API de creación (Status ${res.status}): ${errorText}`);
  }

  const data = await res.json();
  
  // Verificamos si la API devolvió success true
  if (!data.success) {
    throw new Error(data.error || "La API devolvió success: false al intentar crear el usuario.");
  }

  return data;
}


// Dejo estas exportadas vacías por si las estás importando en otro lado (para que no te tire error de import)
export async function fetchGanamosAPI() { throw new Error("Usando nueva API"); }
export async function getGanamosSessionToken() { return "NUEVA_API_NO_USA_TOKEN"; }