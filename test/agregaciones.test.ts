import { describe, it, expect } from "vitest";
import {
  esEfectivo,
  metodoPago,
  diaLocalCO,
  filtrar,
  topComercios,
  porMetodoPago,
  porCategoria,
  calcularKPIs,
  mesesDisponibles,
  comerciosDisponibles,
  type Filtros,
} from "../src/lib/agregaciones";
import type { TxUI } from "../src/lib/demo-data";

// Helper: crea una TxUI con valores por defecto sobreescribibles.
function tx(over: Partial<TxUI>): TxUI {
  return {
    id: "x",
    fecha: "2026-06-10T12:00:00-05:00",
    monto: 1000,
    comercio: "UBER RIDES",
    categoria: "Transporte",
    tarjeta: "Mastercard *0172",
    tipo: "Compraste",
    ...over,
  };
}

const TODOS: Filtros = {
  periodo: { tipo: "todos" },
  categoria: "todas",
  metodo: "todos",
  comercio: "todos",
};

describe("esEfectivo / metodoPago", () => {
  it("reconoce efectivo por la tarjeta", () => {
    expect(esEfectivo("Efectivo")).toBe(true);
    expect(esEfectivo("efectivo")).toBe(true);
    expect(esEfectivo("Cash")).toBe(true);
    expect(esEfectivo("Mastercard *0172")).toBe(false);
    expect(esEfectivo("")).toBe(false);
  });
  it("metodoPago mapea a Efectivo/Tarjeta", () => {
    expect(metodoPago("Efectivo")).toBe("Efectivo");
    expect(metodoPago("T.Deb *0172")).toBe("Tarjeta");
  });
});

describe("diaLocalCO", () => {
  it("convierte a la fecha local de Colombia (UTC-5)", () => {
    // 02:00 UTC del 10 = 21:00 (9pm) del 9 en Bogotá
    expect(diaLocalCO("2026-06-10T02:00:00Z")).toBe("2026-06-09");
    // Con offset -05:00 el día coincide directamente
    expect(diaLocalCO("2026-06-10T12:00:00-05:00")).toBe("2026-06-10");
  });
});

describe("filtrar", () => {
  const txs: TxUI[] = [
    tx({ id: "a", fecha: "2026-05-20T10:00:00-05:00", comercio: "UBER RIDES", categoria: "Transporte", tarjeta: "Mastercard *0172", monto: 5000 }),
    tx({ id: "b", fecha: "2026-06-05T10:00:00-05:00", comercio: "EXITO", categoria: "Otros", tarjeta: "T.Deb *0172", monto: 30000 }),
    tx({ id: "c", fecha: "2026-06-10T10:00:00-05:00", comercio: "UBER RIDES", categoria: "Transporte", tarjeta: "Efectivo", monto: 6000 }),
    tx({ id: "d", fecha: "2026-06-20T10:00:00-05:00", comercio: "DIDI", categoria: "Transporte", tarjeta: "T.Deb *0172", monto: 3000 }),
  ];

  it("filtra por mes", () => {
    const r = filtrar(txs, { ...TODOS, periodo: { tipo: "mes", clave: "2026-06" } });
    expect(r.map((t) => t.id)).toEqual(["b", "c", "d"]);
  });

  it("filtra por rango de fechas (inclusive)", () => {
    const r = filtrar(txs, {
      ...TODOS,
      periodo: { tipo: "rango", desde: "2026-06-08", hasta: "2026-06-15" },
    });
    expect(r.map((t) => t.id)).toEqual(["c"]);
  });

  it("filtra por categoría", () => {
    const r = filtrar(txs, { ...TODOS, categoria: "Otros" });
    expect(r.map((t) => t.id)).toEqual(["b"]);
  });

  it("filtra por método de pago", () => {
    const r = filtrar(txs, { ...TODOS, metodo: "Efectivo" });
    expect(r.map((t) => t.id)).toEqual(["c"]);
  });

  it("filtra por comercio", () => {
    const r = filtrar(txs, { ...TODOS, comercio: "UBER RIDES" });
    expect(r.map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("combina filtros con AND", () => {
    const r = filtrar(txs, {
      periodo: { tipo: "mes", clave: "2026-06" },
      categoria: "Transporte",
      metodo: "Tarjeta",
      comercio: "todos",
    });
    expect(r.map((t) => t.id)).toEqual(["d"]);
  });
});

describe("topComercios", () => {
  const txs: TxUI[] = [
    tx({ comercio: "UBER RIDES", monto: 5000, categoria: "Transporte" }),
    tx({ comercio: "UBER RIDES", monto: 3000, categoria: "Transporte" }),
    tx({ comercio: "EXITO", monto: 30000, categoria: "Otros" }),
    tx({ comercio: "DIDI", monto: 2000, categoria: "Transporte" }),
  ];

  it("agrupa por comercio, suma y ordena desc", () => {
    const r = topComercios(txs);
    expect(r[0]).toMatchObject({ comercio: "EXITO", monto: 30000, conteo: 1 });
    expect(r[1]).toMatchObject({ comercio: "UBER RIDES", monto: 8000, conteo: 2, categoria: "Transporte" });
  });

  it("pliega el resto en 'Otros comercios' cuando supera n", () => {
    const r = topComercios(txs, 2);
    expect(r).toHaveLength(3);
    expect(r[2]).toMatchObject({ comercio: "Otros comercios", monto: 2000, conteo: 1 });
  });
});

describe("porCategoria", () => {
  it("agrupa por categoría dinámica y ordena desc por monto", () => {
    const txs = [
      tx({ categoria: "Transporte", monto: 5000 }),
      tx({ categoria: "Comida", monto: 12000 }),
      tx({ categoria: "Transporte", monto: 3000 }),
      tx({ categoria: "Otros", monto: 1000 }),
    ];
    expect(porCategoria(txs)).toEqual([
      { categoria: "Comida", monto: 12000 },
      { categoria: "Transporte", monto: 8000 },
      { categoria: "Otros", monto: 1000 },
    ]);
  });
});

describe("porMetodoPago", () => {
  it("reparte entre Efectivo y Tarjeta y omite vacíos", () => {
    const txs = [
      tx({ tarjeta: "Efectivo", monto: 6000 }),
      tx({ tarjeta: "Mastercard *0172", monto: 4000 }),
      tx({ tarjeta: "T.Deb *0172", monto: 1000 }),
    ];
    const r = porMetodoPago(txs);
    expect(r).toEqual([
      { metodo: "Efectivo", monto: 6000, conteo: 1 },
      { metodo: "Tarjeta", monto: 5000, conteo: 2 },
    ]);
  });

  it("omite el método sin movimientos", () => {
    const r = porMetodoPago([tx({ tarjeta: "Efectivo" })]);
    expect(r).toEqual([{ metodo: "Efectivo", monto: 1000, conteo: 1 }]);
  });
});

describe("calcularKPIs / mesesDisponibles / comerciosDisponibles", () => {
  const txs: TxUI[] = [
    tx({ fecha: "2026-05-20T10:00:00-05:00", comercio: "DIDI", categoria: "Transporte", monto: 5000 }),
    tx({ fecha: "2026-06-05T10:00:00-05:00", comercio: "EXITO", categoria: "Otros", monto: 30000 }),
  ];
  it("calcularKPIs separa transporte/otros/total/conteo", () => {
    expect(calcularKPIs(txs)).toEqual({ transporte: 5000, otros: 30000, total: 35000, conteo: 2 });
  });
  it("mesesDisponibles: claves distintas, desc", () => {
    expect(mesesDisponibles(txs)).toEqual(["2026-06", "2026-05"]);
  });
  it("comerciosDisponibles: distintos, alfabético", () => {
    expect(comerciosDisponibles(txs)).toEqual(["DIDI", "EXITO"]);
  });
});
