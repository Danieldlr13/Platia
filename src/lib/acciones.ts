"use server";

// Server Actions del panel. Usan la sesión del usuario (RLS), no la service role.

import { redirect } from "next/navigation";
import { crearClienteServidor } from "./supabase-server";
import { obtenerCategorias } from "./categorias";
import { supabaseConfigurado } from "./supabase";
import type { Categoria } from "./types";

export interface ResultadoAccion {
  ok: boolean;
  error?: string;
}

/**
 * Cambia la categoría de una transacción y la marca como manual, para que el
 * reclasificador automático respete la decisión del usuario. RLS asegura que
 * solo afecte filas propias. En modo demo (sin Supabase) es un no-op exitoso.
 */
export async function actualizarCategoria(
  id: string,
  categoria: Categoria,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) return { ok: true }; // demo

  try {
    const supabase = await crearClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sin sesión" };

    const categorias = await obtenerCategorias(supabase, user.id);
    const categoriaId = categorias.get(categoria) ?? null;

    const { error } = await supabase
      .from("transacciones")
      .update({ categoria_id: categoriaId, categoria_manual: true })
      .eq("id", id); // RLS restringe a las filas del propio usuario

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Cierra la sesión y vuelve a /login. */
export async function cerrarSesion(): Promise<void> {
  if (supabaseConfigurado()) {
    const supabase = await crearClienteServidor();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
