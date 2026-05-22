import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const cajeroId = (session.user as any).id;
    
    // Capturamos el horario que eligió el cajero
    const { searchParams } = new URL(req.url);
    const desdeParam = searchParams.get("desde");

    // Si no manda nada, por las dudas usamos el inicio del día (fallback)
    let fechaDesde = new Date();
    fechaDesde.setHours(0, 0, 0, 0);

    if (desdeParam) {
      fechaDesde = new Date(desdeParam);
    }

    // Hasta este mismo instante
    const fechaHasta = new Date();

    const transferencias = await Transferencia.find({
      cajeroAsignado: cajeroId,
      estado: "CARGADA",
      fechaCarga: { $gte: fechaDesde, $lte: fechaHasta }
    });

    let totalReal = 0;
    let totalRegalos = 0;
    let totalRetiros = 0;
    let totalPagos = 0;

    transferencias.forEach(t => {
      const base = parseFloat(t.monto?.toString() || "0");
      const esEspecial = ['CANAL', 'INSTAGRAM', 'AGENDAMIENTO'].includes(t.remitente) || t.coelsaCode?.startsWith("ESPECIAL-");
      const esRetiro = t.remitente === "RETIRO";
      const esPago = t.remitente === "PAGO_BILLETERA";

      if (esPago) {
        totalPagos += base;
      } else if (esRetiro) {
        totalRetiros += base;
      } else if (esEspecial) {
        totalRegalos += base;
      } else {
        totalReal += base;
      }
    });

    return NextResponse.json({ 
      totalReal, 
      totalRegalos, 
      totalRetiros,
      totalPagos,
      cantidad: transferencias.length, 
      cajero: session.user?.name,
      desde: fechaDesde.toISOString(),
      hasta: fechaHasta.toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}