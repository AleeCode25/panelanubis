// app/api/admin/repair/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Config from "@/models/Config";
import { getValidGanamosToken } from "@/lib/auth"; // O de donde sea que importes tu generador de token

export async function POST() {
  try {
    await dbConnect();

    // 1. Borramos el token trabado de la base de datos
    await Config.findOneAndDelete({ key: "ganamos_session" });

    // 2. Invocamos tu función que genera el token.
    // Como lo acabamos de borrar, la función se verá obligada a hacer un fetch a Ganamos y guardar el nuevo.
    await getValidGanamosToken();

    return NextResponse.json({ success: true, message: "Sesión regenerada con éxito" });
  } catch (error: any) {
    console.error("Error al reparar panel:", error);
    return NextResponse.json({ error: "Fallo al reparar: " + error.message }, { status: 500 });
  }
}