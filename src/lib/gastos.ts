// Lectura (servidor) de los gastos manuales del usuario con sesión.

import { crearClienteServidor } from "./supabase-server";
import { supabaseConfigurado } from "./supabase";
import { MARCA_MANUAL } from "./gastos-tipos";
import type { TxUI } from "./demo-data";
import type { Categoria } from "./types";

/** Gastos creados a mano por el usuario (email_message_id con prefijo "manual-"). */
export async function obtenerGastosManuales(): Promise<TxUI[]> {
  if (!supabaseConfigurado()) return [];

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("transacciones")
    .select("id, fecha, monto, comercio, tarjeta, tipo, categorias(nombre)")
    .eq("user_id", user.id)
    .like("email_message_id", `${MARCA_MANUAL}%`)
    .order("fecha", { ascending: false });

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => {
    const catRaw = row.categorias as
      | { nombre?: string }
      | { nombre?: string }[]
      | null;
    const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw;
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
}
