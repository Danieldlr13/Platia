import { describe, it, expect } from "vitest";
import {
  cuentasConSaldoActual,
  calcularResumen,
  calcularSerieTendencia,
  agruparPorTipo,
} from "../src/lib/patrimonio-agregaciones";
import { validarCuenta, validarSaldo, validarNombre } from "../src/lib/patrimonio-tipos";
import type { CuentaPatrimonio, SaldoRegistro } from "../src/lib/patrimonio-tipos";

function cuenta(over: Partial<CuentaPatrimonio>): CuentaPatrimonio {
  return { id: "c1", nombre: "Bancolombia", tipo: "cuenta", ...over };
}
function saldo(over: Partial<SaldoRegistro>): SaldoRegistro {
  return {
    id: "s1",
    cuentaId: "c1",
    saldo: 100,
    fecha: "2026-06-01",
    creadoEn: "2026-06-01T12:00:00Z",
    ...over,
  };
}

describe("cuentasConSaldoActual", () => {
  it("toma el registro más reciente por fecha", () => {
    const cuentas = [cuenta({ id: "c1" })];
    const saldos = [
      saldo({ id: "s1", cuentaId: "c1", fecha: "2026-06-01", saldo: 100 }),
      saldo({ id: "s2", cuentaId: "c1", fecha: "2026-06-15", saldo: 300 }),
      saldo({ id: "s3", cuentaId: "c1", fecha: "2026-06-08", saldo: 200 }),
    ];
    const r = cuentasConSaldoActual(cuentas, saldos);
    expect(r[0].saldoActual).toBe(300);
    expect(r[0].fechaActualizacion).toBe("2026-06-15");
  });

  it("desempata registros del mismo día por creadoEn", () => {
    const cuentas = [cuenta({ id: "c1" })];
    const saldos = [
      saldo({ id: "s1", fecha: "2026-06-01", saldo: 100, creadoEn: "2026-06-01T08:00:00Z" }),
      saldo({ id: "s2", fecha: "2026-06-01", saldo: 150, creadoEn: "2026-06-01T20:00:00Z" }),
    ];
    const r = cuentasConSaldoActual(cuentas, saldos);
    expect(r[0].saldoActual).toBe(150);
  });

  it("una cuenta sin registros tiene saldo 0 y sin fecha", () => {
    const cuentas = [cuenta({ id: "c2", nombre: "Nequi" })];
    const r = cuentasConSaldoActual(cuentas, []);
    expect(r[0].saldoActual).toBe(0);
    expect(r[0].fechaActualizacion).toBeNull();
  });
});

describe("calcularResumen", () => {
  it("separa cuenta vs por_cobrar y suma el total", () => {
    const cuentas = cuentasConSaldoActual(
      [
        cuenta({ id: "c1", tipo: "cuenta" }),
        cuenta({ id: "c2", tipo: "cuenta" }),
        cuenta({ id: "c3", tipo: "por_cobrar", nombre: "Juan" }),
      ],
      [
        saldo({ cuentaId: "c1", saldo: 1000000 }),
        saldo({ cuentaId: "c2", saldo: 500000 }),
        saldo({ cuentaId: "c3", saldo: 150000 }),
      ],
    );
    expect(calcularResumen(cuentas)).toEqual({
      totalCuentas: 1500000,
      totalPorCobrar: 150000,
      total: 1650000,
    });
  });

  it("sin cuentas da todo en cero", () => {
    expect(calcularResumen([])).toEqual({ totalCuentas: 0, totalPorCobrar: 0, total: 0 });
  });
});

describe("calcularSerieTendencia", () => {
  it("hace carry-forward entre cuentas actualizadas en fechas distintas", () => {
    const cuentas = [cuenta({ id: "c1" }), cuenta({ id: "c2", nombre: "Nequi" })];
    const saldos = [
      saldo({ id: "s1", cuentaId: "c1", fecha: "2026-06-01", saldo: 1000 }),
      saldo({ id: "s2", cuentaId: "c2", fecha: "2026-06-10", saldo: 500 }),
      saldo({ id: "s3", cuentaId: "c1", fecha: "2026-06-20", saldo: 1200 }),
    ];
    const serie = calcularSerieTendencia(cuentas, saldos);
    expect(serie).toEqual([
      { fecha: "2026-06-01", total: 1000 }, // solo c1 tiene historial aún
      { fecha: "2026-06-10", total: 1500 }, // c1(1000) + c2(500)
      { fecha: "2026-06-20", total: 1700 }, // c1(1200) + c2(500)
    ]);
  });

  it("sin registros devuelve una serie vacía", () => {
    expect(calcularSerieTendencia([cuenta({})], [])).toEqual([]);
  });

  it("dos actualizaciones el mismo día para cuentas distintas se combinan en un punto", () => {
    const cuentas = [cuenta({ id: "c1" }), cuenta({ id: "c2" })];
    const saldos = [
      saldo({ id: "s1", cuentaId: "c1", fecha: "2026-06-01", saldo: 100 }),
      saldo({ id: "s2", cuentaId: "c2", fecha: "2026-06-01", saldo: 200 }),
    ];
    expect(calcularSerieTendencia(cuentas, saldos)).toEqual([
      { fecha: "2026-06-01", total: 300 },
    ]);
  });
});

describe("agruparPorTipo", () => {
  it("separa cuentas de por_cobrar", () => {
    const cuentas = cuentasConSaldoActual(
      [
        cuenta({ id: "c1", tipo: "cuenta", nombre: "Bancolombia" }),
        cuenta({ id: "c2", tipo: "por_cobrar", nombre: "Juan" }),
      ],
      [],
    );
    const g = agruparPorTipo(cuentas);
    expect(g.cuenta.map((c) => c.nombre)).toEqual(["Bancolombia"]);
    expect(g.por_cobrar.map((c) => c.nombre)).toEqual(["Juan"]);
  });
});

describe("validarCuenta / validarSaldo / validarNombre", () => {
  const base = { nombre: "Bancolombia", tipo: "cuenta" as const, saldo: 1000, fecha: "2026-06-01" };

  it("acepta datos válidos (incluye saldo negativo, ej. deuda)", () => {
    expect(validarCuenta(base)).toBeNull();
    expect(validarCuenta({ ...base, saldo: -500 })).toBeNull();
  });

  it("rechaza nombre vacío", () => {
    expect(validarCuenta({ ...base, nombre: "  " })).toMatch(/nombre/i);
    expect(validarNombre("")).toMatch(/nombre/i);
  });

  it("rechaza tipo inválido", () => {
    expect(validarCuenta({ ...base, tipo: "otro" as never })).toMatch(/tipo/i);
  });

  it("rechaza saldo no numérico y fecha inválida", () => {
    expect(validarSaldo({ saldo: NaN, fecha: "2026-06-01" })).toMatch(/saldo/i);
    expect(validarSaldo({ saldo: 100, fecha: "01/06/2026" })).toMatch(/fecha/i);
  });
});
