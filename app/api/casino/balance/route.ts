import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUsuarioSaldo } from "@/lib/ganamosApi"; // Importamos el motor encadenado

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) return NextResponse.json({ error: "Falta el nombre de usuario" }, { status: 400 });

    // 🚀 Llamamos a la función que encadena la búsqueda del ID + la consulta del saldo
    const saldoData = await getUsuarioSaldo(username.trim());

    // Devolvemos el balance al frontend con el formato que ya esperas
    return NextResponse.json({
      username: saldoData.username,
      balance: saldoData.balance,
      bonus_balance: saldoData.bonus_balance, // Bonus extra por si lo querés mostrar
      currency: "ARS" 
    });

  } catch (error: any) {
    console.error("Error consultando saldo en Ganamos:", error);
    // Si el usuario no existe, devolvemos 404 para ser consistentes con tu código anterior
    if (error.message === "Usuario no encontrado en Ganamos") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Error de servidor al consultar saldo" }, { status: 500 });
  }
}