"use server";

// Server Actions del balance general (CRUD con RLS). Cada actualización de
// saldo inserta un registro nuevo — nunca edita uno existente — para
// conservar el historial y poder graficar la tendencia.

import { crearClienteServidor } from "./supabase-server";
import { supabaseConfigurado } from "./supabase";
import {
  validarCuenta,
  validarSaldo,
  validarNombre,
  type DatosCuenta,
  type DatosSaldo,
  type CuentaPatrimonio,
  type SaldoRegistro,
} from "./patrimonio-tipos";

export interface ResultadoAccion {
  ok: boolean;
  error?: string;
}

export interface ResultadoCuenta extends ResultadoAccion {
  cuenta?: CuentaPatrimonio;
  registro?: SaldoRegistro;
}

export interface ResultadoSaldo extends ResultadoAccion {
  registro?: SaldoRegistro;
}

async function sesion() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function crearCuenta(d: DatosCuenta): Promise<ResultadoCuenta> {
  if (!supabaseConfigurado()) return { ok: true }; // demo
  const err = validarCuenta(d);
  if (err) return { ok: false, error: err };

  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sin sesión" };

  const { data: cuentaData, error: e1 } = await supabase
    .from("patrimonio_cuentas")
    .insert({ user_id: user.id, nombre: d.nombre.trim(), tipo: d.tipo })
    .select("id, nombre, tipo")
    .single();

  if (e1 || !cuentaData) {
    return { ok: false, error: e1?.message ?? "No se pudo crear la cuenta." };
  }

  const { data: saldoData, error: e2 } = await supabase
    .from("patrimonio_saldos")
    .insert({
      user_id: user.id,
      cuenta_id: cuentaData.id,
      saldo: d.saldo,
      fecha: d.fecha,
    })
    .select("id, cuenta_id, saldo, fecha, created_at")
    .single();

  if (e2 || !saldoData) {
    // Evita dejar una cuenta huérfana sin saldo.
    await supabase.from("patrimonio_cuentas").delete().eq("id", cuentaData.id);
    return { ok: false, error: e2?.message ?? "No se pudo guardar el saldo inicial." };
  }

  return {
    ok: true,
    cuenta: {
      id: String(cuentaData.id),
      nombre: String(cuentaData.nombre),
      tipo: cuentaData.tipo === "por_cobrar" ? "por_cobrar" : "cuenta",
    },
    registro: {
      id: String(saldoData.id),
      cuentaId: String(saldoData.cuenta_id),
      saldo: Number(saldoData.saldo),
      fecha: String(saldoData.fecha),
      creadoEn: String(saldoData.created_at),
    },
  };
}

export async function actualizarSaldo(
  cuentaId: string,
  d: DatosSaldo,
): Promise<ResultadoSaldo> {
  if (!supabaseConfigurado()) return { ok: true }; // demo
  const err = validarSaldo(d);
  if (err) return { ok: false, error: err };

  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sin sesión" };

  const { data, error } = await supabase
    .from("patrimonio_saldos")
    .insert({
      user_id: user.id,
      cuenta_id: cuentaId,
      saldo: d.saldo,
      fecha: d.fecha,
    })
    .select("id, cuenta_id, saldo, fecha, created_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo guardar." };

  return {
    ok: true,
    registro: {
      id: String(data.id),
      cuentaId: String(data.cuenta_id),
      saldo: Number(data.saldo),
      fecha: String(data.fecha),
      creadoEn: String(data.created_at),
    },
  };
}

export async function editarNombreCuenta(
  cuentaId: string,
  nombre: string,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) return { ok: true }; // demo
  const err = validarNombre(nombre);
  if (err) return { ok: false, error: err };

  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sin sesión" };

  const { error } = await supabase
    .from("patrimonio_cuentas")
    .update({ nombre: nombre.trim() })
    .eq("id", cuentaId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function eliminarCuenta(cuentaId: string): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) return { ok: true }; // demo

  const { supabase, user } = await sesion();
  if (!user) return { ok: false, error: "Sin sesión" };

  // El historial de saldos se borra en cascada (on delete cascade).
  const { error } = await supabase
    .from("patrimonio_cuentas")
    .delete()
    .eq("id", cuentaId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
