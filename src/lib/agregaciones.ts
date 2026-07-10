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

// ─── Método de pago ──────────────────────────────────────────────────────────

export type MetodoPago = "Efectivo" | "Tarjeta";

/** true si la tarjeta indica pago en efectivo ("Efectivo"/"Cash"). */
export function esEfectivo(tarjeta: string): boolean {
  return /efectivo|cash/i.test(tarjeta ?? "");
}

export function metodoPago(tarjeta: string): MetodoPago {
  return esEfectivo(tarjeta) ? "Efectivo" : "Tarjeta";
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

export type Periodo =
  | { tipo: "mes"; clave: string }
  | { tipo: "rango"; desde: string; hasta: string }
  | { tipo: "todos" };

export interface Filtros {
  periodo: Periodo;
  categoria: Categoria | "todas";
  metodo: MetodoPago | "todos";
  comercio: string | "todos";
}

/** "YYYY-MM-DD" en hora Colombia (UTC-5) a partir de una fecha ISO. */
export function diaLocalCO(fechaIso: string): string {
  const d = new Date(new Date(fechaIso).getTime() - 5 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function pasaPeriodo(t: TxUI, periodo: Periodo): boolean {
  if (periodo.tipo === "todos") return true;
  if (periodo.tipo === "mes") return claveMes(t.fecha) === periodo.clave;
  const dia = diaLocalCO(t.fecha);
  if (periodo.desde && dia < periodo.desde) return false;
  if (periodo.hasta && dia > periodo.hasta) return false;
  return true;
}

/** Aplica todos los filtros (AND) y devuelve el subconjunto. */
export function filtrar(txs: TxUI[], f: Filtros): TxUI[] {
  return txs.filter((t) => {
    if (!pasaPeriodo(t, f.periodo)) return false;
    if (f.categoria !== "todas" && t.categoria !== f.categoria) return false;
    if (f.metodo !== "todos" && metodoPago(t.tarjeta) !== f.metodo) return false;
    if (f.comercio !== "todos" && t.comercio !== f.comercio) return false;
    return true;
  });
}

// ─── Agrupaciones ────────────────────────────────────────────────────────────

export interface KPIs {
  transporte: number;
  otros: number;
  total: number;
  conteo: number;
}

export function calcularKPIs(txs: TxUI[]): KPIs {
  let transporte = 0;
  let otros = 0;
  for (const t of txs) {
    if (t.categoria === "Transporte") transporte += t.monto;
    else otros += t.monto;
  }
  return { transporte, otros, total: transporte + otros, conteo: txs.length };
}

/** Gasto por categoría (todas las categorías presentes), ordenado desc por monto. */
export function porCategoria(txs: TxUI[]): GastoCategoria[] {
  const mapa = new Map<string, number>();
  for (const t of txs) {
    mapa.set(t.categoria, (mapa.get(t.categoria) ?? 0) + t.monto);
  }
  return [...mapa.entries()]
    .map(([categoria, monto]) => ({ categoria, monto }))
    .sort((a, b) => b.monto - a.monto);
}

export interface ComercioAgrupado {
  comercio: string;
  monto: number;
  conteo: number;
  categoria: Categoria;
}

/**
 * Agrupa por comercio y ordena desc por monto. Si hay más de `n` comercios, los
 * de menor gasto se pliegan en un bucket "Otros comercios".
 */
export function topComercios(txs: TxUI[], n = 8): ComercioAgrupado[] {
  const mapa = new Map<string, ComercioAgrupado>();
  for (const t of txs) {
    const r =
      mapa.get(t.comercio) ??
      { comercio: t.comercio, monto: 0, conteo: 0, categoria: t.categoria };
    r.monto += t.monto;
    r.conteo += 1;
    if (t.categoria === "Transporte") r.categoria = "Transporte";
    mapa.set(t.comercio, r);
  }
  const orden = [...mapa.values()].sort((a, b) => b.monto - a.monto);
  if (orden.length <= n) return orden;
  const resto = orden.slice(n);
  const otros: ComercioAgrupado = {
    comercio: "Otros comercios",
    monto: resto.reduce((a, c) => a + c.monto, 0),
    conteo: resto.reduce((a, c) => a + c.conteo, 0),
    categoria: "Otros",
  };
  return [...orden.slice(0, n), otros];
}

export interface MetodoAgrupado {
  metodo: MetodoPago;
  monto: number;
  conteo: number;
}

/** Reparte el gasto entre Efectivo y Tarjeta. Omite el método sin movimientos. */
export function porMetodoPago(txs: TxUI[]): MetodoAgrupado[] {
  const efectivo: MetodoAgrupado = { metodo: "Efectivo", monto: 0, conteo: 0 };
  const tarjeta: MetodoAgrupado = { metodo: "Tarjeta", monto: 0, conteo: 0 };
  for (const t of txs) {
    const dest = esEfectivo(t.tarjeta) ? efectivo : tarjeta;
    dest.monto += t.monto;
    dest.conteo += 1;
  }
  return [efectivo, tarjeta].filter((m) => m.conteo > 0);
}

/** Claves de mes presentes en los datos, de más reciente a más antiguo. */
export function mesesDisponibles(txs: TxUI[]): string[] {
  const set = new Set<string>();
  for (const t of txs) set.add(claveMes(t.fecha));
  return [...set].sort((a, b) => b.localeCompare(a));
}

/** Comercios presentes, en orden alfabético. */
export function comerciosDisponibles(txs: TxUI[]): string[] {
  const set = new Set<string>();
  for (const t of txs) set.add(t.comercio);
  return [...set].sort((a, b) => a.localeCompare(b));
}
