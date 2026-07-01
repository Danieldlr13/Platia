// Datos de demostración para ver el panel sin Supabase conectado.
// Mezcla gastos de Transporte (Uber/DiDi, como los correos reales) con "Otros".
// Se usan solo cuando faltan las variables de entorno de Supabase.

import type { Categoria } from "./types";

export interface TxUI {
  id: string;
  fecha: string; // ISO
  monto: number;
  comercio: string;
  categoria: Categoria;
  tarjeta: string;
  tipo: string;
}

interface Semilla {
  fecha: string;
  monto: number;
  comercio: string;
  categoria: Categoria;
}

const SEMILLAS: Semilla[] = [
  // ── Mayo 2026 ──
  { fecha: "2026-05-03T08:12", monto: 4200, comercio: "UBER RIDES*DL", categoria: "Transporte" },
  { fecha: "2026-05-07T13:40", monto: 32000, comercio: "EXITO EXPRESS", categoria: "Otros" },
  { fecha: "2026-05-11T19:05", monto: 2900, comercio: "DLO*DiDi CO Payin (R", categoria: "Transporte" },
  { fecha: "2026-05-15T10:22", monto: 89000, comercio: "TERPEL ESTACION 45", categoria: "Transporte" },
  { fecha: "2026-05-18T21:15", monto: 45900, comercio: "RAPPI COLOMBIA", categoria: "Otros" },
  { fecha: "2026-05-22T07:55", monto: 3600, comercio: "UBER RIDES*DL", categoria: "Transporte" },
  { fecha: "2026-05-25T16:30", monto: 26500, comercio: "NETFLIX.COM", categoria: "Otros" },
  { fecha: "2026-05-29T15:59", monto: 300, comercio: "DLO*DiDi CO Payin (R", categoria: "Transporte" },
  { fecha: "2026-05-30T12:10", monto: 58900, comercio: "D1 TIENDAS", categoria: "Otros" },

  // ── Junio 2026 ──
  { fecha: "2026-06-02T09:00", monto: 5100, comercio: "UBER RIDES*DL", categoria: "Transporte" },
  { fecha: "2026-06-05T20:45", monto: 38000, comercio: "MCDONALDS", categoria: "Otros" },
  { fecha: "2026-06-08T14:20", monto: 2800, comercio: "DLO*DiDi CO Payin (R", categoria: "Transporte" },
  { fecha: "2026-06-12T11:35", monto: 120000, comercio: "FARMATODO", categoria: "Otros" },
  { fecha: "2026-06-15T18:00", monto: 92000, comercio: "PRIMAX ESTACION", categoria: "Transporte" },
  { fecha: "2026-06-18T08:30", monto: 4400, comercio: "UBER RIDES*DL", categoria: "Transporte" },
  { fecha: "2026-06-21T12:08", monto: 3704, comercio: "UBER RIDES*DL", categoria: "Transporte" },
  { fecha: "2026-06-23T22:05", monto: 67000, comercio: "CINE COLOMBIA", categoria: "Otros" },
  { fecha: "2026-06-25T14:59", monto: 3637, comercio: "UBER RIDES*DL", categoria: "Transporte" },
  { fecha: "2026-06-27T19:40", monto: 51000, comercio: "JUSTO & BUENO", categoria: "Otros" },
  { fecha: "2026-06-29T10:15", monto: 3100, comercio: "DLO*DiDi CO Payin (R", categoria: "Transporte" },

  // ── Julio 2026 (mes en curso) ──
  { fecha: "2026-07-01T07:45", monto: 4800, comercio: "UBER RIDES*DL", categoria: "Transporte" },
];

export function generarDemo(): TxUI[] {
  return SEMILLAS.map((s, i) => ({
    id: `demo-${i}`,
    fecha: new Date(`${s.fecha}:00-05:00`).toISOString(),
    monto: s.monto,
    comercio: s.comercio,
    categoria: s.categoria,
    tarjeta: "T.Deb *0172",
    tipo: "Compraste",
  }));
}
