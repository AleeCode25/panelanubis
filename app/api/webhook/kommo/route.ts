import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Transferencia from "@/models/Transferencia";

export async function POST(req: Request) {
  try {
    // 1. OBTENER DATOS INICIALES DEL WEBHOOK
    const { searchParams } = new URL(req.url);
    const kommoId = searchParams.get("kommoId");
    const token = searchParams.get("token");

    // Kommo suele mandar los webhooks como application/x-www-form-urlencoded o JSON
    const contentType = req.headers.get("content-type") || "";
    let body: any = {};
    
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      // Si Kommo lo manda como formulario urlencoded, lo parseamos a texto y luego sacamos el ID
      const text = await req.text();
      const params = new URLSearchParams(text);
      body = { leads: { add: [{ id: params.get("leads[add][0][id]") || params.get("leads[update][0][id]") }] } };
    }

    const leadId = body?.leads?.add?.[0]?.id || body?.leads?.update?.[0]?.id;

    console.log(`➡️ Iniciando Webhook de Kommo para Lead ID: ${leadId}`);

    if (!leadId || !kommoId || !token) {
      console.error("❌ Faltan datos esenciales: leadId, kommoId o token.");
      return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
    }

    // 2. BUSCAMOS EL LEAD ENTERO EN KOMMO PARA SACAR LOS CAMPOS PERSONALIZADOS
    const leadResponse = await fetch(`https://${kommoId}.kommo.com/api/v4/leads/${leadId}?with=custom_fields_values`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!leadResponse.ok) {
      throw new Error("No se pudo obtener el lead de Kommo");
    }

    const lead = await leadResponse.json();

    const monto = Number(lead.price);
    let coelsa = "";
    let cuil = "";

    if (lead.custom_fields_values) {
      const coelsaField = lead.custom_fields_values.find((f: any) => f.field_name === 'COELSA');
      if (coelsaField && coelsaField.values && coelsaField.values.length > 0) {
        coelsa = coelsaField.values[0].value.trim();
      }

      const cuilField = lead.custom_fields_values.find((f: any) => f.field_name === 'CUIL');
      if (cuilField && cuilField.values && cuilField.values.length > 0) {
        cuil = cuilField.values[0].value.trim();
      }
    }

    console.log(`🔍 Datos extraídos -> Monto: ${monto} | COELSA: ${coelsa} | CUIL: ${cuil}`);
    if (!monto || !cuil) {
      console.log("⚠️ Faltan datos (Monto o CUIL) en el lead. No se puede comparar.");
      return NextResponse.json({ message: "Datos incompletos en el lead." }, { status: 200 }); 
    }

    await dbConnect();

    const cargaPendiente = await Transferencia.findOne({
      estado: "PENDIENTE",
      monto: monto,
      cuit: { $regex: new RegExp(`^${cuil}$`, 'i') }
    });

    if (cargaPendiente) {
      console.log(`✅ ¡MATCH ENCONTRADO! Aprobando transferencia ID: ${cargaPendiente._id}`);
      
      cargaPendiente.estado = "CARGADA";
      cargaPendiente.fechaCarga = new Date();

      
      await cargaPendiente.save();

      return NextResponse.json({ 
        success: true, 
        message: "Carga encontrada y marcada como CARGADA exitosamente",
        idTransferencia: cargaPendiente._id 
      });

    } else {
      console.log("❌ No se encontró ninguna carga PENDIENTE que coincida con esos 3 datos.");
      return NextResponse.json({ 
        success: false, 
        message: "No se encontró coincidencia en pendientes." 
      }, { status: 200 });
    }

  } catch (error: any) {
    console.error("🔥 Error crítico en el Webhook:", error.message);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}