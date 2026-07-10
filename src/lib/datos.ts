// Fuente de datos del panel. Si Supabase está configurado, lee las transacciones
// del usuario con sesión iniciada (RLS aísla por auth.uid()); si no, usa datos
// de demostración para que el panel se vea igual en dev local.
//
// Se ejecuta en el servidor (componentes de servidor de Next.js).

import { generarDemo, type TxUI } from "./demo-data";
import { crearClienteServidor } from "./supabase-server";
import { supabaseConfigurado } from "./supabase";
import { listarCategorias } from "./categorias";
import { MARCA_MANUAL } from "./gastos-tipos";
import { COLOR_OTROS, COLOR_TRANSPORTE } from "./colores";
import type { Categoria, CategoriaInfo } from "./types";

export interface OrigenDatos {
  txs: TxUI[];
  modo: "supabase" | "demo";
  /** Categorías del usuario (para dropdowns, colores del donut y el CRUD). */
  categorias: CategoriaInfo[];
  /** Correo del usuario con sesión (para el header). */
  email?: string;
}

const CATEGORIAS_DEMO: CategoriaInfo[] = [
  { id: "demo-transporte", nombre: "Transporte", color: COLOR_TRANSPORTE },
  { id: "demo-otros", nombre: "Otros", color: COLOR_OTROS },
];

export async function obtenerTransacciones(): Promise<OrigenDatos> {
  if (!supabaseConfigurado()) {
    return { txs: generarDemo(), modo: "demo", categorias: CATEGORIAS_DEMO };
  }

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // El middleware debería haber redirigido a /login; por seguridad, vacío.
    return { txs: [], modo: "supabase", categorias: CATEGORIAS_DEMO };
  }

  const categorias = await listarCategorias(supabase, user.id);

  const { data, error } = await supabase
    .from("transacciones")
    .select("id, fecha, monto, comercio, tarjeta, tipo, email_message_id, categorias(nombre)")
    .eq("user_id", user.id)
    .order("fecha", { ascending: false });

  if (error || !data) {
    console.error("Error leyendo Supabase:", error?.message);
    return { txs: [], modo: "supabase", categorias, email: user.email ?? undefined };
  }

  const txs: TxUI[] = data.map((row: Record<string, unknown>) => {
    // Supabase puede devolver la relación como objeto o como arreglo.
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
      esManual: String(row.email_message_id ?? "").startsWith(MARCA_MANUAL),
    };
  });

  return { txs, modo: "supabase", categorias, email: user.email ?? undefined };
}
