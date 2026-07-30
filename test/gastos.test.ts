import { describe, it, expect } from "vitest";
import {
  validarGasto,
  validarMovimiento,
  fechaEnBogota,
  horaEnBogota,
  instanteBogota,
  type DatosGasto,
  type DatosMovimiento,
} from "../src/lib/gastos-tipos";

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

  it("acepta cualquier categoría no vacía; rechaza vacía y método inválido", () => {
    expect(validarGasto({ ...base, categoria: "Comida" })).toBeNull();
    expect(validarGasto({ ...base, categoria: "   " })).toMatch(/categoría/i);
    expect(validarGasto({ ...base, metodo: "Cripto" as never })).toMatch(/método/i);
  });
});

describe("validarMovimiento", () => {
  const mov: DatosMovimiento = {
    comercio: "UBER TRIP",
    monto: 18500,
    fecha: "2026-07-28",
    categoria: "Transporte",
  };

  it("acepta un movimiento del banco (sin método)", () => {
    expect(validarMovimiento(mov)).toBeNull();
  });

  it("acepta un movimiento manual con método", () => {
    expect(validarMovimiento({ ...mov, metodo: "Efectivo" })).toBeNull();
  });

  it("rechaza comercio vacío, monto no positivo y fecha inválida", () => {
    expect(validarMovimiento({ ...mov, comercio: "  " })).toMatch(/comercio/i);
    expect(validarMovimiento({ ...mov, monto: 0 })).toMatch(/monto/i);
    expect(validarMovimiento({ ...mov, fecha: "28/07/2026" })).toMatch(/fecha/i);
  });

  it("rechaza hora y método con formato inválido", () => {
    expect(validarMovimiento({ ...mov, hora: "9:5" })).toMatch(/hora/i);
    expect(validarMovimiento({ ...mov, metodo: "Cheque" as never })).toMatch(/método/i);
  });
});

describe("fecha y hora en Colombia", () => {
  it("convierte un instante UTC al día y hora locales", () => {
    // 19:30 UTC = 14:30 en Colombia (-05:00), mismo día
    expect(fechaEnBogota("2026-07-28T19:30:00Z")).toBe("2026-07-28");
    expect(horaEnBogota("2026-07-28T19:30:00Z")).toBe("14:30");
  });

  it("retrocede un día cuando en UTC ya es el siguiente", () => {
    // 02:00 UTC del 29 = 21:00 del 28 en Colombia
    expect(fechaEnBogota("2026-07-29T02:00:00Z")).toBe("2026-07-28");
    expect(horaEnBogota("2026-07-29T02:00:00Z")).toBe("21:00");
  });

  it("instanteBogota es el inverso: conserva día y hora", () => {
    const iso = instanteBogota("2026-07-28", "14:30");
    expect(fechaEnBogota(iso)).toBe("2026-07-28");
    expect(horaEnBogota(iso)).toBe("14:30");
  });

  it("sin hora usa el mediodía, que nunca cruza de día", () => {
    expect(horaEnBogota(instanteBogota("2026-07-28"))).toBe("12:00");
    expect(fechaEnBogota(instanteBogota("2026-07-28"))).toBe("2026-07-28");
  });
});
