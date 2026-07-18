// Funciones puras del balance general. Operan sobre CuentaPatrimonio[] y
// SaldoRegistro[] — sin dependencias de servidor, fáciles de testear.

import type { CuentaPatrimonio, SaldoRegistro, TipoCuenta } from "./patrimonio-tipos";

/** Agrupa los registros por cuenta y los ordena por fecha asc (desempate por creadoEn). */
function historialPorCuenta(saldos: SaldoRegistro[]): Map<string, SaldoRegistro[]> {
  const mapa = new Map<string, SaldoRegistro[]>();
  for (const s of saldos) {
    const arr = mapa.get(s.cuentaId) ?? [];
    arr.push(s);
    mapa.set(s.cuentaId, arr);
  }
  for (const arr of mapa.values()) {
    arr.sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || a.creadoEn.localeCompare(b.creadoEn),
    );
  }
  return mapa;
}

export interface CuentaConSaldo extends CuentaPatrimonio {
  saldoActual: number;
  /** Fecha del último registro, o null si la cuenta nunca se ha actualizado. */
  fechaActualizacion: string | null;
}

/** Saldo actual de cada cuenta: su registro más reciente (0 si nunca tuvo uno). */
export function cuentasConSaldoActual(
  cuentas: CuentaPatrimonio[],
  saldos: SaldoRegistro[],
): CuentaConSaldo[] {
  const historial = historialPorCuenta(saldos);
  return cuentas.map((c) => {
    const registros = historial.get(c.id) ?? [];
    const ultimo = registros[registros.length - 1];
    return {
      ...c,
      saldoActual: ultimo?.saldo ?? 0,
      fechaActualizacion: ultimo?.fecha ?? null,
    };
  });
}

export interface ResumenPatrimonio {
  totalCuentas: number;
  totalPorCobrar: number;
  total: number;
}

/** Subtotales por tipo + total general, sobre cuentas ya resueltas a su saldo actual. */
export function calcularResumen(cuentas: CuentaConSaldo[]): ResumenPatrimonio {
  let totalCuentas = 0;
  let totalPorCobrar = 0;
  for (const c of cuentas) {
    if (c.tipo === "por_cobrar") totalPorCobrar += c.saldoActual;
    else totalCuentas += c.saldoActual;
  }
  return { totalCuentas, totalPorCobrar, total: totalCuentas + totalPorCobrar };
}

export interface PuntoTendencia {
  fecha: string;
  total: number;
}

/**
 * Serie del total en el tiempo: por cada fecha en la que alguna cuenta se
 * actualizó, el total en ese momento usando el último saldo conocido de cada
 * cuenta hasta esa fecha (carry-forward). No hace falta actualizar todas las
 * cuentas el mismo día — una cuenta sin ningún registro aún no contribuye al
 * total antes de su primer registro.
 */
export function calcularSerieTendencia(
  cuentas: CuentaPatrimonio[],
  saldos: SaldoRegistro[],
): PuntoTendencia[] {
  if (saldos.length === 0) return [];

  const historial = historialPorCuenta(saldos);
  const fechas = [...new Set(saldos.map((s) => s.fecha))].sort((a, b) =>
    a.localeCompare(b),
  );

  const cursor = new Map<string, number>(); // cuentaId -> próximo índice a considerar
  const actual = new Map<string, number>(); // cuentaId -> último saldo conocido

  return fechas.map((fecha) => {
    for (const [cuentaId, registros] of historial) {
      let i = cursor.get(cuentaId) ?? 0;
      while (i < registros.length && registros[i].fecha <= fecha) {
        actual.set(cuentaId, registros[i].saldo);
        i++;
      }
      cursor.set(cuentaId, i);
    }
    const total = [...actual.values()].reduce((a, b) => a + b, 0);
    return { fecha, total };
  });
}

/** Divide una lista de cuentas-con-saldo en los dos grupos de la interfaz. */
export function agruparPorTipo(
  cuentas: CuentaConSaldo[],
): Record<TipoCuenta, CuentaConSaldo[]> {
  return {
    cuenta: cuentas.filter((c) => c.tipo === "cuenta"),
    por_cobrar: cuentas.filter((c) => c.tipo === "por_cobrar"),
  };
}
