import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Config from "@/models/Config";
// 👇 Importamos las dos funciones limpias de la nueva API
import { getUsuarioSaldo, cargarSaldoGanamos } from "@/lib/ganamosApi";

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
        cajeroId = "6a162fede376e16ae1355714"; 
        esAutocarga = true;
    } else if (session && session.user) {
        cajeroId = (session.user as any).id;
    } else {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // 1. BUSQUEDA DE TRANSFERENCIA
    const transferencia = await Transferencia.findById(id);
    if (!transferencia) return NextResponse.json({ error: "No se encontró la transferencia." }, { status: 404 });

    // 2. PREVENCIÓN DE DOBLE CARGA: Si ya está CARGADA, no hacer nada
    if (transferencia.estado === "CARGADA") {
        return NextResponse.json({ error: "Esta carga ya fue procesada anteriormente." }, { status: 400 });
    }

    // 3. BLOQUEO TEMPORAL: Marcamos como EN_PROCESO para evitar peticiones simultáneas
    transferencia.estado = "EN_PROCESO";
    await transferencia.save();

    const usuarioFinal = usuarioDelModal || transferencia.usuarioCasino;
    if (!usuarioFinal) {
        transferencia.estado = "PENDIENTE";
        await transferencia.save();
        return NextResponse.json({ error: "Debes ingresar un Usuario de Casino." }, { status: 400 });
    }

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
            tipoBono = 'monto'; // Conservamos tu lógica: el porcentaje se convierte en un monto fijo
        } else {
            conBono = false;
        }
    }

    // --- INTEGRACIÓN CON LA NUEVA API GANAMOS ---
    // A. Buscamos el ID numérico del usuario
    const saldoData = await getUsuarioSaldo(safeUsername);
    const userId = saldoData.id;

    // B. Preparamos los parámetros de la carga
    let amount = parseFloat(montoBase.toString());
    let bonus_amount = 0;
    let percent_amount = 0;

    if (conBono && valorBono) {
        const valorNum = parseFloat(valorBono.toString());
        if (tipoBono === 'porcentaje') {
            percent_amount = valorNum;
        } else {
            bonus_amount = valorNum;
        }
    }

    // C. Ejecutamos la carga
    try {
        await cargarSaldoGanamos(userId, amount, bonus_amount, percent_amount);
    } catch (ganamosError: any) {
        // Si falla Ganamos, liberamos el estado a PENDIENTE para que el admin pueda reintentar
        transferencia.estado = "PENDIENTE";
        await transferencia.save();
        return NextResponse.json({ 
            error: `Ganamos rechazó la carga: ${ganamosError.message}` 
        }, { status: 400 });
    }

    // --- ACTUALIZACIÓN FINAL EN DB ---
    transferencia.estado = "CARGADA";
    transferencia.usuarioCasino = safeUsername;
    transferencia.fechaCarga = new Date();
    transferencia.cajeroAsignado = cajeroId; 
    transferencia.montoBono = conBono ? parseFloat(valorBono.toString()) : 0;
    transferencia.conBono = conBono;
    
    await transferencia.save();

    return NextResponse.json({ success: true, acreditado: amount });
    
  } catch (error: any) {
    console.error("Error en Carga Ganamos:", error);
    return NextResponse.json({ error: "Error de servidor: " + error.message }, { status: 500 });
  }
}