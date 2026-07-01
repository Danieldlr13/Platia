import { describe, it, expect } from "vitest";
import {
  parsearCorreo,
  parsearMonto,
  parsearFecha,
  normalizarTexto,
} from "../src/lib/parser";
import { clasificar } from "../src/lib/classifier";

// Fixtures con el formato real de Bancolombia (datos sintéticos: los correos
// reales se validan aparte con `npm run ingest:eml` y no se versionan).
const CORREO_UBER = `¡Listo! Todo salió bien con tus movimientos
Bancolombia: Compraste $3.704,00 en UBER RIDES*DL con tu T.Deb *0172, el 21/06/2026 a las 12:08.
Si tienes dudas, encuentranos aqui: 6045109095.`;

const CORREO_DIDI = `Bancolombia: Compraste $300,00 en DLO*DiDi CO Payin (R con tu T.Deb *0172, el 29/05/2026 a las 15:59. Estamos cerca.`;

const CORREO_CREDITO = `Bancolombia: Pagaste $58.900,00 en EXITO SUPERMERCADO con tu T.Cred *4521, el 03/07/2026 a las 09:15.`;

const CORREO_INGRESO = `Bancolombia: Recibiste $150.000,00 en NEQUI con tu T.Deb *0172, el 01/07/2026 a las 08:00.`;

const CORREO_BASURA = `Este es un correo de marketing que no tiene ningún movimiento.`;

describe("parsearMonto", () => {
  it("interpreta el formato colombiano (punto=miles, coma=decimales)", () => {
    expect(parsearMonto("3.704,00")).toBe(3704);
    expect(parsearMonto("300,00")).toBe(300);
    expect(parsearMonto("58.900,00")).toBe(58900);
    expect(parsearMonto("1.234.567,89")).toBeCloseTo(1234567.89);
  });
});

describe("parsearFecha", () => {
  it("construye la fecha en hora de Colombia (UTC-5)", () => {
    const d = parsearFecha("21/06/2026", "12:08");
    // 12:08 en Bogotá (UTC-5) === 17:08 UTC
    expect(d.toISOString()).toBe("2026-06-21T17:08:00.000Z");
  });
});

describe("normalizarTexto", () => {
  it("colapsa saltos de línea y espacios múltiples", () => {
    expect(normalizarTexto("Compraste\n  $3.704,00   en")).toBe(
      "Compraste $3.704,00 en",
    );
  });
});

describe("parsearCorreo", () => {
  it("parsea una compra de Uber", () => {
    const r = parsearCorreo(CORREO_UBER);
    expect(r.ok).toBe(true);
    expect(r.esGasto).toBe(true);
    expect(r.movimiento).toMatchObject({
      tipo: "Compraste",
      monto: 3704,
      moneda: "COP",
      comercio: "UBER RIDES*DL",
      tarjeta: "T.Deb *0172",
      fechaTexto: "21/06/2026",
      horaTexto: "12:08",
    });
  });

  it("parsea un comercio con caracteres raros (DiDi)", () => {
    const r = parsearCorreo(CORREO_DIDI);
    expect(r.ok).toBe(true);
    expect(r.movimiento?.monto).toBe(300);
    expect(r.movimiento?.comercio).toBe("DLO*DiDi CO Payin (R");
  });

  it("parsea un pago con tarjeta de crédito", () => {
    const r = parsearCorreo(CORREO_CREDITO);
    expect(r.ok).toBe(true);
    expect(r.esGasto).toBe(true);
    expect(r.movimiento?.tarjeta).toBe("T.Cred *4521");
    expect(r.movimiento?.monto).toBe(58900);
  });

  it("reconoce un ingreso pero lo marca como no-gasto", () => {
    const r = parsearCorreo(CORREO_INGRESO);
    expect(r.ok).toBe(true);
    expect(r.esGasto).toBe(false);
  });

  it("no falla con un correo que no es un movimiento", () => {
    const r = parsearCorreo(CORREO_BASURA);
    expect(r.ok).toBe(false);
    expect(r.movimiento).toBeUndefined();
  });
});

describe("clasificar", () => {
  it("clasifica Uber y DiDi como Transporte", () => {
    expect(clasificar("UBER RIDES*DL")).toBe("Transporte");
    expect(clasificar("DLO*DiDi CO Payin (R")).toBe("Transporte");
    expect(clasificar("TERPEL ESTACION 45")).toBe("Transporte");
  });

  it("clasifica lo demás como Otros", () => {
    expect(clasificar("EXITO SUPERMERCADO")).toBe("Otros");
    expect(clasificar("NETFLIX.COM")).toBe("Otros");
  });
});
