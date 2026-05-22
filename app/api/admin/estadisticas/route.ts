import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const cajeroId = searchParams.get("cajeroId");

    let query: any = { estado: "CARGADA" };

    if (from && to) {
      query.fechaCarga = { $gte: new Date(from), $lte: new Date(to) };
    }

    if (cajeroId && cajeroId !== "todos") {
      query.cajeroAsignado = cajeroId;
    }

    const transferencias = await Transferencia.find(query).populate("cajeroAsignado", "nombre").sort({ fechaCarga: -1 });

    let totalEntrado = 0;   
    let totalSinBono = 0;   
    let totalBonos = 0;     
    let totalEspeciales = 0;
    let totalRetiros = 0; 
    let totalPagado = 0; // <-- NUEVA VARIABLE PARA PAGOS REALES

    transferencias.forEach(t => {
      const montoBase = parseFloat(t.monto.toString()) || 0;
      const montoBono = parseFloat(t.montoBono?.toString() || "0");
      
      const esRetiro = t.remitente === "RETIRO";
      const esPago = t.remitente === "PAGO_BILLETERA"; // <-- DETECTAMOS EL PAGO
      const esEspecial = ['CANAL', 'INSTAGRAM', 'AGENDAMIENTO'].includes(t.remitente) || (t.coelsaCode && t.coelsaCode.startsWith("ESPECIAL-"));

      // LÓGICA DE SEPARACIÓN
      if (esPago) {
        totalPagado += montoBase;
      } else if (esRetiro) {
        totalRetiros += montoBase;
      } else if (esEspecial) {
        totalEspeciales += montoBase; 
        totalEntrado += montoBase;    
      } else {
        totalSinBono += montoBase;    
        totalBonos += montoBono;      
        totalEntrado += (montoBase + montoBono); 
      }
    });

    return NextResponse.json({
      resumen: {
        totalEntrado,
        totalSinBono,
        totalBonos,
        totalEspeciales,
        totalRetiros,
        totalPagado, // <-- LO MANDAMOS AL FRONTEND
        cantidad: transferencias.length
      },
      movimientos: transferencias
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}