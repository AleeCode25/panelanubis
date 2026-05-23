import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Config from "@/models/Config";
import { fetchGanamosAPI, getUsuarioSaldo } from "@/lib/ganamosApi";

export async function POST(req: Request, { params }: any) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    
    let { usuarioCasino: usuarioDelModal, conBono, tipoBono, valorBono, apiSecret } = body; 

    // --- LÓGICA DE AUTENTICACIÓN DUAL ---
    const session = await getServerSession(authOptions);
    const CLAVE_SECRETA_BACKEND = "ReySanto2026_AutoCargaSegura"; 
    
    let cajeroId = null;
    let esAutocarga = false;

    if (apiSecret && apiSecret === CLAVE_SECRETA_BACKEND) {
        cajeroId = "69f3fdfc26d70c5c586f746f"; 
        esAutocarga = true;
    } else if (session && session.user) {
        cajeroId = (session.user as any).id;
    } else {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const transferencia = await Transferencia.findById(id);
    if (!transferencia) return NextResponse.json({ error: "No se encontró la transferencia." }, { status: 404 });

    const usuarioFinal = usuarioDelModal || transferencia.usuarioCasino;
    if (!usuarioFinal) return NextResponse.json({ error: "Debes ingresar un Usuario de Casino." }, { status: 400 });

    const safeUsername = usuarioFinal.trim().toLowerCase();
    const montoBase = Number(transferencia.monto);

    // --- REGLA DE NEGOCIO: BONO DINÁMICO ---
    if (esAutocarga) {
        const cargasPrevias = await Transferencia.countDocuments({ 
            usuarioCasino: safeUsername, 
            estado: "CARGADA" 
        });

        let porcentajeAAplicar = 0;
        if (cargasPrevias === 0) {
            porcentajeAAplicar = 20;
        } else {
            const configBono = await Config.findOne({ key: "BONO_PORCENTAJE_GANAMOS" });
            porcentajeAAplicar = Number(configBono?.value) || 0;
        }

        if (porcentajeAAplicar > 0) {
            conBono = true;
            valorBono = montoBase * (porcentajeAAplicar / 100);
            tipoBono = 'monto';
        } else {
            conBono = false;
        }
    }

    // --- INTEGRACIÓN GANAMOS ---
    const saldoData = await getUsuarioSaldo(safeUsername);
    const userId = saldoData.id;

    // PREPARACIÓN DE PAGO ESTRICTA
    // Convertimos todo a Number y usamos parseFloat para asegurar formato decimal
    let paymentBody: any = { 
        operation: 0, 
        amount: parseFloat(montoBase.toString()) 
    };

    if (conBono && valorBono) {
        paymentBody.is_bonus = true;
        const valorNum = parseFloat(valorBono.toString());
        
        if (tipoBono === 'porcentaje') {
            paymentBody.percent_amount = valorNum;
        } else {
            paymentBody.bonus_amount = valorNum;
        }
    }

    const ganamosRes = await fetchGanamosAPI(`/api/agent_admin/user/${userId}/payment/`, {
        method: 'POST',
        body: JSON.stringify(paymentBody)
    });

    if (ganamosRes.status !== 0) {
        return NextResponse.json({ 
            error: `Ganamos rechazó: ${ganamosRes.error_message || 'Error desconocido'}` 
        }, { status: 400 });
    }

    // --- ACTUALIZACIÓN EN DB ---
    transferencia.estado = "CARGADA";
    transferencia.usuarioCasino = safeUsername;
    transferencia.fechaCarga = new Date();
    transferencia.cajeroAsignado = cajeroId; 
    transferencia.montoBono = conBono ? parseFloat(valorBono.toString()) : 0;
    transferencia.conBono = conBono;
    
    await transferencia.save();

    return NextResponse.json({ success: true, acreditado: paymentBody.amount });
  } catch (error: any) {
    console.error("Error en Carga Ganamos:", error);
    return NextResponse.json({ error: "Error de servidor: " + error.message }, { status: 500 });
  }
}