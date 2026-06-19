import dbConnect from "@/lib/mongodb";
import Config from "@/models/Config";
import { SocksProxyAgent } from 'socks-proxy-agent';

const GANAMOS_USER = process.env.GANAMOS_USER || "Anubis031";
const GANAMOS_PASS = process.env.GANAMOS_PASS || "Fortuna1511_";

// Proxy SOCKS5 para salir con IP de USA y saltar bloqueos
const PROXY_URL = "socks5://XnDosS:xKeV65@23.236.128.44:8000";
const agent = new SocksProxyAgent(PROXY_URL);

const GANAMOS_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'es-419,es;q=0.9,en;q=0.8,fr;q=0.7,ru;q=0.6',
  'content-type': 'application/json;charset=UTF-8',
  'origin': 'https://agents.ganamosnet.org',
  'priority': 'u=1, i',
  'referer': 'https://agents.ganamosnet.org/users/all',
  'sec-ch-ua': '"Chromium";v="148", "Opera GX";v="132", "Not/A)Brand";v="99"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36'
};

const HARDCODED_TRACKING_COOKIES = "_ga=GA1.1.1924775346.1778017632; _ym_uid=1778795784175439850; _ym_d=1778795784; twk_uuid_6479ead6ad80445890f0a9e8=%7B%22uuid%22%3A%221.7xbICvIALHNrffUjCjdju6c6MVAV7031eyAu3fzJCtAxs3m3a4Z0W7ZNzku1iGcR72zDN7jXwrSQp0BtMv3f6uzrZ5sB0RC7PhPOD2720gEaYaUmwtgnz9VR%22%2C%22version%22%3A3%2C%22domain%22%3A%22ganamosnet.org%22%2C%22ts%22%3A1779519961370%7D; _clck=1eiyn5e%5E2%5Eg70%5E0%5E2360; spid=1781807599728_28f405a0a9a0ff6434dd3bf90d66ea0b_8rpuuc0gcjxd1cx9; spsc=1781808183155_02102f40359c46ca1da1b79984343b8e_Llb6hnkpzvmyLgzwApqrL4IpqPVUyHk82-qNYmYMtJAZ; _clsk=b6s00j%5E1781809755068%5E5%5E1%5Et.clarity.ms%2Fcollect; _ga_KVDL5XPDJM=GS2.1.s1781807768$o14$g1$t1781809754$j60$l0$h0";

export async function getGanamosSessionToken() {
  await dbConnect();
  let sessionConfig = await Config.findOne({ key: 'ganamos_session' });
  
  if (sessionConfig && sessionConfig.expiresAt > new Date()) {
    return sessionConfig.value;
  }
  
  try {
    const response = await fetch('https://agents.ganamosnet.org/api/user/login', {
      method: 'POST',
      headers: { ...GANAMOS_HEADERS, 'Cookie': HARDCODED_TRACKING_COOKIES },
      body: JSON.stringify({ username: GANAMOS_USER, password: GANAMOS_PASS }),
      // @ts-ignore
      dispatcher: agent,
      cache: 'no-store'
    });

    const data = await response.json();
    if (data.status !== 0) throw new Error("Error en login");

    const setCookie = response.headers.get('set-cookie');
    const tokenExtraido = setCookie?.match(/session=([^;]+)/)?.[0] || "";

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4);

    await Config.findOneAndUpdate({ key: 'ganamos_session' }, { value: tokenExtraido, expiresAt }, { upsert: true });
    return tokenExtraido;
  } catch (error) {
    throw new Error("No se pudo refrescar la sesión.");
  }
}

export async function fetchGanamosAPI(endpoint: string, options: RequestInit = {}) {
  const token = await getGanamosSessionToken();
  let currentCookies = `${HARDCODED_TRACKING_COOKIES}; ${token}`; 

  const finalOptions: RequestInit = {
    ...options,
    headers: { ...GANAMOS_HEADERS, ...options.headers, 'Cookie': currentCookies },
    // @ts-ignore
    dispatcher: agent, 
    redirect: 'manual'
  };

  const url = `https://agents.ganamosnet.org${endpoint}`;
  let response = await fetch(url, finalOptions);
  
  // Manejo de redirecciones del Firewall (307)
  if (response.status === 307) {
    const setCookiesArray = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    let extraCookies = setCookiesArray.map(c => c.split(';')[0]).join('; ');
    
    if (extraCookies) {
      finalOptions.headers = { ...finalOptions.headers, 'Cookie': `${currentCookies}; ${extraCookies}` };
      response = await fetch(url, finalOptions);
    }
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Error ${response.status}: ${text.substring(0, 50)}`);
  }
}

export async function getUsuarioSaldo(username: string) {
  const searchResult = await fetchGanamosAPI(`/api/agent_admin/user/search/?username=${username}&is_direct_structure=false`);
  if (!searchResult.result?.data?.[0]) throw new Error("Usuario no encontrado");
  
  const userId = searchResult.result.data[0].id;
  const userProfile = await fetchGanamosAPI(`/api/agent_admin/user/${userId}/`);
  
  return {
    id: userId,
    username: userProfile.result.user.username,
    balance: userProfile.result.user.balance,
    bonus_balance: userProfile.result.user.bonus_balance
  };
}