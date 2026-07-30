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

const COLUMNAS =
  "id, fecha, monto, comercio, tarjeta, tipo, email_message_id, categorias(nombre)";

/**
 * true si el error es "esa columna no existe" (migración pendiente). Al leer,
 * Postgres responde 42703; al escribir, PostgREST responde PGRST204 porque no
 * la encuentra en su caché de esquema.
 */
export function columnaFaltante(error: { code?: string } | null): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
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

  const consulta = (columnas: string) =>
    supabase
      .from("transacciones")
      .select(columnas)
      .eq("user_id", user.id)
      .order("fecha", { ascending: false });

  let { data, error } = await consulta(`${COLUMNAS}, editado`);
  // La marca de "editado" es opcional: en una base donde aún no se corrió la
  // migración (db/migracion-editado.sql) se lee sin ella en vez de dejar el
  // panel vacío. Se puede quitar cuando todas las bases la tengan.
  if (columnaFaltante(error)) {
    ({ data, error } = await consulta(COLUMNAS));
  }

  if (error || !data) {
    console.error("Error leyendo Supabase:", error?.message);
    return { txs: [], modo: "supabase", categorias, email: user.email ?? undefined };
  }

  // Al elegir las columnas en tiempo de ejecución se pierde la inferencia de
  // tipos de Supabase; las filas se leen campo a campo más abajo.
  const filas = data as unknown as Record<string, unknown>[];

  const txs: TxUI[] = filas.map((row) => {
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
      editado: Boolean(row.editado),
    };
  });

  return { txs, modo: "supabase", categorias, email: user.email ?? undefined };
}
