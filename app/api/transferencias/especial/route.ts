import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Config from "@/models/Config";

// =========================================================================
// FUNCIÓN GET: ESTADÍSTICAS DEL ADMINISTRADOR (Tu código original intacto)
// =========================================================================
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    // Seguridad: Solo el ADMIN entra acá
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const cajeroId = searchParams.get("cajeroId");

    // Construimos el filtro
    let query: any = { estado: "CARGADA" };

    // Filtro por fecha (fechaCarga es cuando se confirmó el dinero en Zeus)
    if (from && to) {
      query.fechaCarga = { 
        $gte: new Date(from), 
        $lte: new Date(to) 
      };
    }

    // Filtro por cajero específico
    if (cajeroId && cajeroId !== "todos") {
      query.cajeroAsignado = cajeroId;
    }

    const transferencias = await Transferencia.find(query)
      .populate("cajeroAsignado", "nombre")
      .sort({ fechaCarga: -1 });

    // Calculamos los totales separados
    let totalEntrado = 0;   // Monto + Bono + Regalos (Todo lo que entró a Zeus)
    let totalSinBono = 0;   // Solo PLATA REAL (lo que entró por transferencia)
    let totalBonos = 0;     // Solo los regalos de bonos en transferencias
    let totalEspeciales = 0;// Fichas regaladas por Canal, Instagram, etc.

    transferencias.forEach(t => {
      const montoBase = parseFloat(t.monto.toString()) || 0;
      const montoBono = parseFloat(t.montoBono?.toString() || "0");
      
      // Verificamos si es una carga de promoción/regalo
      const esEspecial = t.coelsaCode && t.coelsaCode.startsWith("ESPECIAL-");

      if (esEspecial) {
        totalEspeciales += montoBase; // Suma a la caja de regalos
        totalEntrado += montoBase;    // También suma al total de Zeus
      } else {
        totalSinBono += montoBase;    // Plata Real
        totalBonos += montoBono;      // Bonos
        totalEntrado += (montoBase + montoBono); // Suma al total de Zeus
      }
    });

    return NextResponse.json({
      resumen: {
        totalEntrado,
        totalSinBono,
        totalBonos,
        totalEspeciales,
        cantidad: transferencias.length
      },
      movimientos: transferencias
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// =========================================================================
// FUNCIÓN POST: EJECUTAR CARGA DE REGALOS (CANAL, INSTAGRAM, AGENDAMIENTO)
// =========================================================================
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { usuarioCasino, tipo } = await req.json();

    if (!usuarioCasino || !tipo) {
      return NextResponse.json({ error: "Faltan datos (Usuario o Tipo de Carga)" }, { status: 400 });
    }

    // Filtro ant-mayúsculas
    const safeUsername = usuarioCasino.trim().toLowerCase();

    // Lógica dinámica: Canal = 1000, Resto = 500
    const monto = tipo === 'CANAL' ? 1000 : 500;

    const zeusUrl = "https://admin.casino-zeus.eu/api/operator/v1/account-transfers";
    const config = await Config.findOne({ key: "ZEUS_TOKEN" });

    if (!config || !config.value) {
      return NextResponse.json({ error: "Falta configurar el Token de Zeus en el panel de Admin" }, { status: 500 });
    }

    const token = config.value;

    // Mandamos el saldo a Zeus
    const zeusResponse = await fetch(zeusUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PostmanRuntime/7.51.0'
      },
      body: JSON.stringify({
        amount: monto,
        operation: "INCOME",
        targetUserName: safeUsername
      })
    });

    if (!zeusResponse.ok) {
      const errorText = await zeusResponse.text();
      return NextResponse.json({ error: `Zeus rechazó: ${errorText}` }, { status: 400 });
    }

    // Registramos la carga especial en la Base de Datos para tus estadísticas
    const timestamp = Date.now();
    await Transferencia.create({
      remitente: tipo, // Va a decir CANAL, INSTAGRAM o AGENDAMIENTO
      monto: monto,    // Tu GET lee de acá para los especiales
      montoBono: 0, 
      cuit: "S/D",
      coelsaCode: `ESPECIAL-${timestamp}`,
      estado: "CARGADA",
      usuarioCasino: safeUsername,
      cajeroAsignado: (session.user as any).id,
      fechaCarga: new Date(),
      conBono: true,
      transaccionId: `ESPECIAL-${timestamp}`
    });

    return NextResponse.json({ success: true, acreditado: monto });
  } catch (error: any) {
    return NextResponse.json({ error: "Error de servidor: " + error.message }, { status: 500 });
  }
}