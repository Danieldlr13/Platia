"use server";

// Server Actions del CRUD de gastos manuales. Usan la sesión del usuario (RLS).
// Solo afectan filas manuales (email_message_id con prefijo "manual-"), de modo
// que nunca tocan las transacciones que llegan por la automatización.

import { crearClienteServidor } from "./supabase-server";
import { obtenerCategorias } from "./categorias";
import { supabaseConfigurado } from "./supabase";
import { validarGasto, MARCA_MANUAL, type DatosGasto } from "./gastos-tipos";
import type { TxUI } from "./demo-data";

export interface ResultadoAccion {
  ok: boolean;
  error?: string;
}

export interface ResultadoGasto extends ResultadoAccion {
  /** La fila creada, para que el cliente la muestre sin recargar la página. */
  gasto?: TxUI;
}

async function sesion() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** ISO en hora Colombia al mediodía (evita corrimientos de día por zona horaria). */
function fechaISO(fecha: string): string {
  return `${fecha}T12:00:00-05:00`;
}

export async function crearGasto(d: DatosGasto): Promise<ResultadoGasto> {
  if (!supabaseConfigurado()) return { ok: true }; // demo
  const err = validarGasto(d);
  if (err) return { ok: false, error: err };

  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sin sesión" };

  const categorias = await obtenerCategorias(supabase, user.id);
  const record = {
    user_id: user.id,
    fecha: fechaISO(d.fecha),
    monto: d.monto,
    moneda: "COP",
    comercio: d.descripcion.trim(),
    categoria_id: categorias.get(d.categoria) ?? null,
    categoria_manual: true,
    tarjeta: d.metodo,
    tipo: "Manual",
    raw_texto: "Gasto manual",
    email_message_id: `${MARCA_MANUAL}${crypto.randomUUID()}`,
  };

  const { data, error } = await supabase
    .from("transacciones")
    .insert(record)
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear." };

  return {
    ok: true,
    gasto: {
      id: String(data.id),
      fecha: record.fecha,
      monto: record.monto,
      comercio: record.comercio,
      categoria: d.categoria,
      tarjeta: record.tarjeta,
      tipo: record.tipo,
    },
  };
}

export async function actualizarGasto(
  id: string,
  d: DatosGasto,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) return { ok: true };
  const err = validarGasto(d);
  if (err) return { ok: false, error: err };

  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sin sesión" };

  const categorias = await obtenerCategorias(supabase, user.id);
  const { error } = await supabase
    .from("transacciones")
    .update({
      fecha: fechaISO(d.fecha),
      monto: d.monto,
      comercio: d.descripcion.trim(),
      categoria_id: categorias.get(d.categoria) ?? null,
      categoria_manual: true,
      tarjeta: d.metodo,
    })
    .eq("id", id)
    .like("email_message_id", `${MARCA_MANUAL}%`); // solo gastos manuales

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function eliminarGasto(id: string): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) return { ok: true };

  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sin sesión" };

  const { error } = await supabase
    .from("transacciones")
    .delete()
    .eq("id", id)
    .like("email_message_id", `${MARCA_MANUAL}%`); // solo gastos manuales

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
