"use server";

// CRUD de categorías (server actions con RLS). "Transporte" y "Otros" están
// protegidas: no se borran ni se renombran (solo se les cambia el color).
// Al borrar una categoría, sus gastos se reasignan a la categoría destino.

import { crearClienteServidor } from "./supabase-server";
import { obtenerCategorias } from "./categorias";
import { supabaseConfigurado } from "./supabase";
import { CATEGORIAS_PROTEGIDAS } from "./types";
import type { CategoriaInfo } from "./types";

export interface ResultadoCategoria {
  ok: boolean;
  error?: string;
  /** La categoría creada, para que el cliente la muestre sin recargar. */
  categoria?: CategoriaInfo;
}

const esProtegida = (n: string) =>
  (CATEGORIAS_PROTEGIDAS as readonly string[]).includes(n);

async function sesion() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function crearCategoria(
  nombre: string,
  color: string,
): Promise<ResultadoCategoria> {
  if (!supabaseConfigurado()) return { ok: true }; // demo
  const n = nombre.trim();
  if (!n) return { ok: false, error: "El nombre es obligatorio." };

  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sin sesión" };

  const { data, error } = await supabase
    .from("categorias")
    .insert({ user_id: user.id, nombre: n, color })
    .select("id, nombre, color")
    .single();

  if (error || !data) {
    if (error?.code === "23505")
      return { ok: false, error: "Ya existe una categoría con ese nombre." };
    return { ok: false, error: error?.message ?? "No se pudo crear." };
  }
  return {
    ok: true,
    categoria: {
      id: String(data.id),
      nombre: String(data.nombre),
      color: String(data.color),
    },
  };
}

export async function editarCategoria(
  id: string,
  nombre: string,
  color: string,
): Promise<ResultadoCategoria> {
  if (!supabaseConfigurado()) return { ok: true };
  const n = nombre.trim();
  if (!n) return { ok: false, error: "El nombre es obligatorio." };

  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sin sesión" };

  const { data: actual } = await supabase
    .from("categorias")
    .select("nombre")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  const nombreActual = actual?.nombre as string | undefined;

  const cambios: { nombre?: string; color: string } = { color };
  if (nombreActual && esProtegida(nombreActual)) {
    if (n !== nombreActual)
      return { ok: false, error: `"${nombreActual}" no se puede renombrar.` };
    // Protegida: solo se actualiza el color.
  } else {
    cambios.nombre = n;
  }

  const { error } = await supabase
    .from("categorias")
    .update(cambios)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Ya existe una categoría con ese nombre." };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function eliminarCategoria(
  id: string,
  destinoNombre: string,
): Promise<ResultadoCategoria> {
  if (!supabaseConfigurado()) return { ok: true };

  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sin sesión" };

  const { data: actual } = await supabase
    .from("categorias")
    .select("nombre")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  const nombre = actual?.nombre as string | undefined;
  if (!nombre) return { ok: false, error: "Categoría no encontrada." };
  if (esProtegida(nombre))
    return { ok: false, error: `"${nombre}" no se puede borrar.` };

  // Reasigna los gastos de esta categoría a la categoría destino.
  const categorias = await obtenerCategorias(supabase, user.id); // asegura el destino
  const destinoId = categorias.get(destinoNombre) ?? null;

  const { error: e1 } = await supabase
    .from("transacciones")
    .update({ categoria_id: destinoId })
    .eq("categoria_id", id)
    .eq("user_id", user.id);
  if (e1) return { ok: false, error: e1.message };

  const { error: e2 } = await supabase
    .from("categorias")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (e2) return { ok: false, error: e2.message };

  return { ok: true };
}
