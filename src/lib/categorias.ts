// Utilidad compartida por el ingestor y el cargador de .eml: obtiene el mapa
// { nombreCategoria -> id } para un usuario, creando las categorías que falten.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Categoria } from "./types";

const COLORES: Record<Categoria, string> = {
  Transporte: "#00C389",
  Otros: "#9CA3AF",
};

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
