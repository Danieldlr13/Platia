// Parser para los recibos de correo de Uber (noreply@uber.com).
//
// Uber manda el recibo en dos formatos y hay que soportar ambos:
//
//  • Texto plano (cuando existe): los campos van "pegados":
//        TotalCOP 6,000
//        CashCOP 6,000                ← efectivo
//        Mastercard ••••0172COP 2,907 ← tarjeta
//        Jun 28, 2026\n6:51 PM        ← fecha (larga, en líneas)
//
//  • Solo HTML (muchos recibos no traen texto plano): al quitar las etiquetas
//    los campos quedan separados por espacios:
//        Total COP 4,176
//        Cash COP 5,959
//        Mastercard ••••0172 COP 4,176
//        6/22/26 4:16 PM              ← fecha (corta, M/D/YY)
//
// Por eso los regex toleran un espacio opcional alrededor de "COP" y la fecha
// se intenta en formato largo y, si no, en formato corto.
//
// Este módulo es una función pura (fácil de testear).

export interface RecibUber {
  /** Monto total del viaje en COP. */
  monto: number;
  moneda: string;
  /** Método de pago: "Cash", "Visa *XXXX", "Mastercard *XXXX", etc. */
  metodoPago: string;
  /** true si fue pagado en efectivo. */
  esEfectivo: boolean;
  /** true si el pago falló (correo "Payment Failed"). */
  pagoFallido: boolean;
  /** Fecha/hora del viaje (Colombia UTC-5). */
  fecha: Date;
  /** Asunto original del correo, ej. "Your Sunday evening trip with Uber". */
  asunto: string;
}

export interface ResultadoUber {
  ok: boolean;
  recibo?: RecibUber;
  razon?: string;
}

// "TotalCOP 6,000" o "Total COP 4,176". \b evita coincidir dentro de "Subtotal".
const TOTAL_RE = /\bTotal\s*COP\s+([\d,.]+)/;

// "CashCOP 6,000" o "Cash COP 5,959"
const CASH_RE = /\bCash\s*COP\s+([\d,.]+)/;

// Tarjeta:
//   "Mastercard ••••0172COP 2,907"  → bullets Unicode + 4 dígitos (texto plano)
//   "Mastercard ••••0172 COP 4,176" → bullets + espacio + COP (HTML)
//   "Visa *1234COP 3,954"           → asterisco + dígitos
// Captura: 1 = marca (una palabra, sin arrastrar "Payments"), 2 = últimos dígitos.
const TARJETA_RE = /([A-Za-z]+)\s*(?:\*{4}|•{4}|\*)(\d{3,4})\s*COP\s+([\d,.]+)/;

// Fecha larga: "Jun 28, 2026" seguido (salto de línea, coma o espacio) de "6:51 PM".
const FECHA_LARGA_RE =
  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})[\s,]+(\d{1,2}):(\d{2})\s*(AM|PM)/i;

// Fecha corta (formato US en el HTML): "6/22/26 4:16 PM" → M/D/YY.
const FECHA_CORTA_RE = /\b(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i;

const MESES: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function parsearMontoUber(s: string): number {
  // "6,000" → 6000  |  "3,954" → 3954. En los recibos COP de Uber la coma es
  // separador de miles y no hay decimales.
  return Number(s.replace(/,/g, "").replace(/\./g, ""));
}

const pad = (n: number) => String(n).padStart(2, "0");

function construirFecha(
  mesNum: number, dia: number, anio: number, hh: number, min: number, ampm: string,
): Date {
  let hora = hh;
  if (ampm.toUpperCase() === "PM" && hora !== 12) hora += 12;
  if (ampm.toUpperCase() === "AM" && hora === 12) hora = 0;
  const iso = `${anio}-${pad(mesNum)}-${pad(dia)}T${pad(hora)}:${pad(min)}:00-05:00`;
  return new Date(iso);
}

/** Intenta la fecha larga y, si no aparece, la corta. Devuelve null si ninguna. */
function parsearFechaUber(texto: string): Date | null {
  const mL = texto.match(FECHA_LARGA_RE);
  if (mL) {
    const [, mes, dia, anio, hh, mm, ampm] = mL;
    const clave = mes.charAt(0).toUpperCase() + mes.slice(1).toLowerCase();
    return construirFecha(MESES[clave] ?? 1, +dia, +anio, +hh, +mm, ampm);
  }
  const mC = texto.match(FECHA_CORTA_RE);
  if (mC) {
    const [, mes, dia, yy, hh, mm, ampm] = mC;
    return construirFecha(+mes, +dia, 2000 + +yy, +hh, +mm, ampm);
  }
  return null;
}

/**
 * Convierte el HTML de un recibo en texto plano (para los recibos que Uber
 * manda solo en HTML). Quita estilos/scripts y colapsa espacios.
 */
export function htmlATexto(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parsea el texto de un recibo de Uber (texto plano o HTML ya convertido).
 * El asunto del correo se pasa para detectar pagos fallidos y enriquecer el resultado.
 */
export function parsearReciboUber(texto: string, asunto = ""): ResultadoUber {
  const pagoFallido = /payment failed/i.test(asunto);

  // ── Monto total ────────────────────────────────────────────────────────────
  const mTotal = texto.match(TOTAL_RE);
  if (!mTotal) {
    return { ok: false, razon: "No se encontró TotalCOP en el recibo de Uber" };
  }
  const monto = parsearMontoUber(mTotal[1]);

  // ── Fecha ──────────────────────────────────────────────────────────────────
  const fecha = parsearFechaUber(texto);
  if (!fecha) {
    return { ok: false, razon: "No se encontró fecha en el recibo de Uber" };
  }

  // ── Método de pago ─────────────────────────────────────────────────────────
  let metodoPago = "Desconocido";
  let esEfectivo = false;

  const mCash = texto.match(CASH_RE);
  if (mCash) {
    metodoPago = "Cash";
    esEfectivo = true;
  } else {
    const mTarjeta = texto.match(TARJETA_RE);
    if (mTarjeta) {
      // mTarjeta[1] = marca ("Mastercard"), mTarjeta[2] = últimos dígitos
      metodoPago = `${mTarjeta[1].trim()} *${mTarjeta[2]}`; // "Mastercard *0172"
    }
  }

  return {
    ok: true,
    recibo: {
      monto,
      moneda: "COP",
      metodoPago,
      esEfectivo,
      pagoFallido,
      fecha,
      asunto,
    },
  };
}
