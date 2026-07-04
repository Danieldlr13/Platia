import { describe, it, expect } from "vitest";
import { validarGasto, type DatosGasto } from "../src/lib/gastos-tipos";

const base: DatosGasto = {
  descripcion: "Almuerzo",
  monto: 15000,
  fecha: "2026-06-20",
  categoria: "Otros",
  metodo: "Efectivo",
};

describe("validarGasto", () => {
  it("acepta un gasto válido", () => {
    expect(validarGasto(base)).toBeNull();
  });

  it("rechaza descripción vacía", () => {
    expect(validarGasto({ ...base, descripcion: "   " })).toMatch(/descripción/i);
  });

  it("rechaza monto <= 0 o no numérico", () => {
    expect(validarGasto({ ...base, monto: 0 })).toMatch(/monto/i);
    expect(validarGasto({ ...base, monto: -5 })).toMatch(/monto/i);
    expect(validarGasto({ ...base, monto: NaN })).toMatch(/monto/i);
  });

  it("rechaza fecha con formato inválido", () => {
    expect(validarGasto({ ...base, fecha: "20/06/2026" })).toMatch(/fecha/i);
    expect(validarGasto({ ...base, fecha: "" })).toMatch(/fecha/i);
  });

  it("rechaza categoría o método fuera de rango", () => {
    expect(validarGasto({ ...base, categoria: "Comida" as never })).toMatch(/categoría/i);
    expect(validarGasto({ ...base, metodo: "Cripto" as never })).toMatch(/método/i);
  });
});
