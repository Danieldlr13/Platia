"use server";

// Server Actions del panel. Solo corren en el servidor (usan la service role key).

import { crearClienteServicio } from "./supabase";
import { obtenerCategorias } from "./categorias";
import type { Categoria } from "./types";

function servicioConfigurado(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.CUENTAS_USER_ID,
  );
}

export interface ResultadoAccion {
  ok: boolean;
  error?: string;
}

/**
 * Cambia la categoría de una transacción y la marca como manual, para que el
 * reclasificador automático respete la decisión del usuario. En modo demo (sin
 * Supabase) es un no-op exitoso, de modo que la UI sigue siendo funcional.
 */
export async function actualizarCategoria(
  id: string,
  categoria: Categoria,
): Promise<ResultadoAccion> {
  if (!servicioConfigurado()) return { ok: true }; // demo

  try {
    const supabase = crearClienteServicio();
    const userId = process.env.CUENTAS_USER_ID!;
    const categorias = await obtenerCategorias(supabase, userId);
    const categoriaId = categorias.get(categoria) ?? null;

    const { error } = await supabase
      .from("transacciones")
      .update({ categoria_id: categoriaId, categoria_manual: true })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
