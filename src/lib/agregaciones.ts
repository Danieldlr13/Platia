// Funciones puras de agregación para el panel. Operan sobre TxUI[].

import type { Categoria } from "./types";
import type { TxUI } from "./demo-data";

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/** Clave de mes "YYYY-MM" a partir de una fecha ISO, en hora Colombia. */
export function claveMes(fechaIso: string): string {
  // Convertimos a hora Colombia (UTC-5) para agrupar por el día local correcto.
  const d = new Date(new Date(fechaIso).getTime() - 5 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function etiquetaMes(clave: string): string {
  const [anio, mes] = clave.split("-").map(Number);
  return `${MESES_CORTOS[mes - 1]} ${anio}`;
}

export function sumar(txs: TxUI[]): number {
  return txs.reduce((acc, t) => acc + t.monto, 0);
}

export interface ResumenMes {
  clave: string;
  total: number;
  transporte: number;
  otros: number;
}

/** Agrupa el gasto por mes, separando Transporte y Otros. Orden ascendente. */
export function tendenciaMensual(txs: TxUI[]): ResumenMes[] {
  const mapa = new Map<string, ResumenMes>();
  for (const t of txs) {
    const clave = claveMes(t.fecha);
    const r = mapa.get(clave) ?? { clave, total: 0, transporte: 0, otros: 0 };
    r.total += t.monto;
    if (t.categoria === "Transporte") r.transporte += t.monto;
    else r.otros += t.monto;
    mapa.set(clave, r);
  }
  return [...mapa.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

export interface GastoCategoria {
  categoria: Categoria;
  monto: number;
}

/** Total por categoría dentro de un mes ("YYYY-MM"). */
export function gastoPorCategoria(txs: TxUI[], clave: string): GastoCategoria[] {
  let transporte = 0;
  let otros = 0;
  for (const t of txs) {
    if (claveMes(t.fecha) !== clave) continue;
    if (t.categoria === "Transporte") transporte += t.monto;
    else otros += t.monto;
  }
  return [
    { categoria: "Transporte", monto: transporte },
    { categoria: "Otros", monto: otros },
  ];
}

export function transaccionesDelMes(txs: TxUI[], clave: string): TxUI[] {
  return txs
    .filter((t) => claveMes(t.fecha) === clave)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Devuelve la clave del mes más reciente presente en los datos. */
export function mesMasReciente(txs: TxUI[]): string {
  return txs
    .map((t) => claveMes(t.fecha))
    .sort((a, b) => b.localeCompare(a))[0] ?? claveMes(new Date().toISOString());
}

/** Clave del mes anterior a uno dado. */
export function mesAnterior(clave: string): string {
  const [anio, mes] = clave.split("-").map(Number);
  const d = new Date(Date.UTC(anio, mes - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Formatea un monto en pesos colombianos sin decimales. */
export function formatoCOP(monto: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(monto);
}
