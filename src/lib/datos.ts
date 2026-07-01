// Fuente de datos del panel. Si Supabase está configurado, lee de ahí;
// si no, usa datos de demostración para que el panel se vea igual.
//
// Se ejecuta en el servidor (componentes de servidor de Next.js).

import { crearClienteServicio } from "./supabase";
import { generarDemo, type TxUI } from "./demo-data";
import type { Categoria } from "./types";

export interface OrigenDatos {
  txs: TxUI[];
  modo: "supabase" | "demo";
}

function servicioConfigurado(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.CUENTAS_USER_ID,
  );
}

export async function obtenerTransacciones(): Promise<OrigenDatos> {
  if (!servicioConfigurado()) {
    return { txs: generarDemo(), modo: "demo" };
  }

  const supabase = crearClienteServicio();
  const userId = process.env.CUENTAS_USER_ID!;
  const { data, error } = await supabase
    .from("transacciones")
    .select("id, fecha, monto, comercio, tarjeta, tipo, categorias(nombre)")
    .eq("user_id", userId)
    .order("fecha", { ascending: false });

  if (error || !data) {
    console.error("Error leyendo Supabase, uso demo:", error?.message);
    return { txs: generarDemo(), modo: "demo" };
  }

  const txs: TxUI[] = data.map((row: Record<string, unknown>) => {
    const cat = row.categorias as { nombre?: string } | null;
    return {
      id: String(row.id),
      fecha: String(row.fecha),
      monto: Number(row.monto),
      comercio: String(row.comercio ?? ""),
      categoria: (cat?.nombre as Categoria) ?? "Otros",
      tarjeta: String(row.tarjeta ?? ""),
      tipo: String(row.tipo ?? ""),
    };
  });

  return { txs, modo: "supabase" };
}
