import { describe, it, expect } from "vitest";
import { parsearReciboUber, htmlATexto } from "../src/lib/parser-uber";

// ── Texto plano (formato "pegado", con saltos de línea) ──────────────────────
const PLANO_EFECTIVO = `Jun 28, 2026
6:51 PM
Thanks for riding, Daniel
TotalCOP 6,000
Payments
CashCOP 6,000
6/28/26 7:21 PM`;

const PLANO_TARJETA = `Jun 25, 2026
5:47 PM
Thanks for riding, Daniel
TotalCOP 3,954
Payments
Mastercard ••••0172COP 3,954
6/25/26 5:47 PM`;

// ── Solo HTML (tras htmlATexto: campos separados por espacios, fecha corta) ───
const HTML_TARJETA =
  "You enjoyed your ride this afternoon. Total COP 4,176 Trip fare COP 6,540 " +
  "Booking Fee COP 484 Discounts Adjustments -COP 2,848 Payments " +
  "Mastercard ••••0172 COP 4,176 6/22/26 4:16 PM";

const HTML_EFECTIVO =
  "You enjoyed your ride this morning. Total COP 5,959 Trip fare COP 7,945 " +
  "Promotion -COP 1,986 Payments Cash COP 5,959 6/9/26 11:35 AM";

describe("parsearReciboUber — texto plano", () => {
  it("recibo en efectivo", () => {
    const r = parsearReciboUber(PLANO_EFECTIVO, "Your Sunday evening trip with Uber");
    expect(r.ok).toBe(true);
    expect(r.recibo?.monto).toBe(6000);
    expect(r.recibo?.esEfectivo).toBe(true);
    expect(r.recibo?.metodoPago).toBe("Cash");
    // Jun 28 6:51 PM en Bogotá (UTC-5) === 23:51 UTC
    expect(r.recibo?.fecha.toISOString()).toBe("2026-06-28T23:51:00.000Z");
  });

  it("recibo con tarjeta", () => {
    const r = parsearReciboUber(PLANO_TARJETA);
    expect(r.ok).toBe(true);
    expect(r.recibo?.monto).toBe(3954);
    expect(r.recibo?.esEfectivo).toBe(false);
    expect(r.recibo?.metodoPago).toBe("Mastercard *0172");
  });
});

describe("parsearReciboUber — solo HTML (formato con espacios y fecha corta)", () => {
  it("recibo con tarjeta: no arrastra 'Payments' en la marca", () => {
    const r = parsearReciboUber(HTML_TARJETA, "Your Monday afternoon trip with Uber");
    expect(r.ok).toBe(true);
    expect(r.recibo?.monto).toBe(4176); // el Total, no el Trip fare
    expect(r.recibo?.metodoPago).toBe("Mastercard *0172");
    expect(r.recibo?.esEfectivo).toBe(false);
    // 6/22/26 4:16 PM en Bogotá (UTC-5) === 21:16 UTC
    expect(r.recibo?.fecha.toISOString()).toBe("2026-06-22T21:16:00.000Z");
  });

  it("recibo en efectivo desde HTML", () => {
    const r = parsearReciboUber(HTML_EFECTIVO);
    expect(r.ok).toBe(true);
    expect(r.recibo?.monto).toBe(5959);
    expect(r.recibo?.esEfectivo).toBe(true);
    expect(r.recibo?.metodoPago).toBe("Cash");
    // 6/9/26 11:35 AM (UTC-5) === 16:35 UTC
    expect(r.recibo?.fecha.toISOString()).toBe("2026-06-09T16:35:00.000Z");
  });
});

describe("parsearReciboUber — casos límite", () => {
  it("marca el pago fallido según el asunto", () => {
    const r = parsearReciboUber(HTML_TARJETA, "Payment Failed - Your Thursday trip with Uber");
    expect(r.ok).toBe(true);
    expect(r.recibo?.pagoFallido).toBe(true);
  });

  it("falla si no hay Total", () => {
    const r = parsearReciboUber("Correo sin importe reconocible");
    expect(r.ok).toBe(false);
    expect(r.recibo).toBeUndefined();
  });
});

describe("htmlATexto", () => {
  it("quita etiquetas y colapsa espacios", () => {
    const html = "<div>Total<span>&nbsp;</span>COP  4,176</div>\n<p>Payments</p>";
    expect(htmlATexto(html)).toBe("Total COP 4,176 Payments");
  });
});
