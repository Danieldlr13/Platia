// Datos mínimos de sesión para el shell (sidebar): quién eres y si el panel
// está corriendo con datos reales o de demostración. No carga transacciones ni
// patrimonio — cada sección pide lo suyo.

import { crearClienteServidor } from "./supabase-server";
import { supabaseConfigurado } from "./supabase";
import { listarCategorias } from "./categorias";
import { COLOR_OTROS, COLOR_TRANSPORTE } from "./colores";
import type { CategoriaInfo } from "./types";

export interface Sesion {
  modo: "supabase" | "demo";
  email?: string;
}

export const CATEGORIAS_DEMO: CategoriaInfo[] = [
  { id: "demo-transporte", nombre: "Transporte", color: COLOR_TRANSPORTE },
  { id: "demo-otros", nombre: "Otros", color: COLOR_OTROS },
];

export async function obtenerSesion(): Promise<Sesion> {
  if (!supabaseConfigurado()) return { modo: "demo" };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { modo: "supabase", email: user?.email ?? undefined };
}

/** Categorías del usuario, para la sección que solo necesita eso. */
export async function obtenerCategoriasUsuario(): Promise<CategoriaInfo[]> {
  if (!supabaseConfigurado()) return CATEGORIAS_DEMO;

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return CATEGORIAS_DEMO;

  return listarCategorias(supabase, user.id);
}
