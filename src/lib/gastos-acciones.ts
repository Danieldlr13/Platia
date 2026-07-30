"use server";

// Server Actions del CRUD de gastos manuales. Usan la sesión del usuario (RLS).
// Solo afectan filas manuales (email_message_id con prefijo "manual-"), de modo
// que nunca tocan las transacciones que llegan por la automatización.

import { crearClienteServidor } from "./supabase-server";
import { obtenerCategorias } from "./categorias";
import { columnaFaltante } from "./datos";
import { supabaseConfigurado } from "./supabase";
import {
  validarGasto,
  validarMovimiento,
  instanteBogota,
  MARCA_MANUAL,
  type DatosGasto,
  type DatosMovimiento,
} from "./gastos-tipos";
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
      esManual: true,
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

/**
 * Edita cualquier movimiento del usuario, venga del banco o anotado a mano.
 * A diferencia de `actualizarGasto`, no se limita a las filas manuales: el
 * parser a veces saca mal el comercio o el monto y hay que poder corregirlo.
 * El ingestor no lo pisa (solo procesa correos no leídos y no reinserta).
 */
export async function editarMovimiento(
  id: string,
  d: DatosMovimiento,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) return { ok: true }; // demo
  const err = validarMovimiento(d);
  if (err) return { ok: false, error: err };

  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sin sesión" };

  const categorias = await obtenerCategorias(supabase, user.id);
  const cambios: Record<string, unknown> = {
    fecha: instanteBogota(d.fecha, d.hora),
    monto: d.monto,
    comercio: d.comercio.trim(),
    categoria_id: categorias.get(d.categoria) ?? null,
    categoria_manual: true, // la decisión del usuario manda sobre el clasificador
    editado: true, // deja de coincidir con lo que mandó el banco
  };
  // Solo los manuales guardan el método en `tarjeta`; en los del banco esa
  // columna es el número de tarjeta y no se toca.
  if (d.metodo) cambios.tarjeta = d.metodo;

  const guardar = (c: Record<string, unknown>) =>
    supabase.from("transacciones").update(c).eq("id", id).eq("user_id", user.id);

  let { error } = await guardar(cambios);
  // Si la migración de `editado` aún no se corrió, se guarda sin esa marca en
  // vez de fallar. Ver db/migracion-editado.sql.
  if (columnaFaltante(error)) {
    const { editado: _omitida, ...resto } = cambios;
    ({ error } = await guardar(resto));
  }

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
