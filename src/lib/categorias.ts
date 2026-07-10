// Utilidad compartida por el ingestor y el cargador de .eml: obtiene el mapa
// { nombreCategoria -> id } para un usuario, creando las categorías que falten.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Categoria, CategoriaInfo } from "./types";
import { COLOR_OTROS, COLOR_TRANSPORTE } from "./colores";

const COLORES: Record<string, string> = {
  Transporte: COLOR_TRANSPORTE,
  Otros: COLOR_OTROS,
};

/**
 * Lista las categorías del usuario (id, nombre, color) como filas reales,
 * garantizando primero que existan "Transporte" y "Otros".
 */
export async function listarCategorias(
  supabase: SupabaseClient,
  userId: string,
): Promise<CategoriaInfo[]> {
  await obtenerCategorias(supabase, userId); // crea Transporte/Otros si faltan

  const { data } = await supabase
    .from("categorias")
    .select("id, nombre, color")
    .eq("user_id", userId)
    .order("nombre", { ascending: true });

  return (data ?? []).map((c) => ({
    id: String(c.id),
    nombre: String(c.nombre),
    color: String(c.color ?? COLOR_OTROS),
  }));
}

export async function obtenerCategorias(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<Categoria, string>> {
  const mapa = new Map<Categoria, string>();

  const { data } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("user_id", userId);

  for (const c of data ?? []) mapa.set(c.nombre as Categoria, c.id);

  for (const nombre of ["Transporte", "Otros"] as Categoria[]) {
    if (!mapa.has(nombre)) {
      const { data: nueva } = await supabase
        .from("categorias")
        .insert({ user_id: userId, nombre, color: COLORES[nombre] })
        .select("id")
        .single();
      if (nueva) mapa.set(nombre, nueva.id);
    }
  }

  return mapa;
}
