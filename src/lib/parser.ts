// Parser de los correos de "Alertas y Notificaciones" de Bancolombia.
//
// El cuerpo del correo contiene una frase con un molde muy consistente, p.ej.:
//   "Bancolombia: Compraste $3.704,00 en UBER RIDES*DL con tu T.Deb *0172,
//    el 21/06/2026 a las 12:08."
//
// Este módulo no sabe nada de correo ni de red: recibe texto ya decodificado
// (como el que entrega `mailparser`) y devuelve datos estructurados. Es una
// función pura, fácil de testear con las muestras reales.

import type { MovimientoParseado } from "./types";

/** Verbos que representan una salida de dinero (gasto). */
export const VERBOS_GASTO = [
  "Compraste",
  "Pagaste",
  "Transferiste",
  "Retiraste",
  "Enviaste",
  "Sacaste",
];

/** Verbos que representan entrada de dinero (por ahora se ignoran). */
export const VERBOS_INGRESO = ["Recibiste", "Consignaron", "Abonaron"];

// Grupos: 1=verbo 2=monto 3=comercio 4=tipoTarjeta 5=ultimos4 6=fecha 7=hora
const MOVIMIENTO_RE =
  /Bancolombia:\s+(\w+)\s+\$([\d.,]+)\s+en\s+(.+?)\s+con tu\s+(T\.\w+)\s*\*(\d{4}),?\s+el\s+(\d{2}\/\d{2}\/\d{4})\s+a las\s+(\d{2}:\d{2})/;

/** Colapsa saltos de línea y espacios múltiples en un solo espacio. */
export function normalizarTexto(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

/**
 * Convierte un monto en formato colombiano a número.
 * El punto es separador de miles y la coma es separador decimal.
 *   "3.704,00" -> 3704   ·   "300,00" -> 300   ·   "1.234.567,89" -> 1234567.89
 */
export function parsearMonto(montoTexto: string): number {
  const normalizado = montoTexto.replace(/\./g, "").replace(",", ".");
  return Number.parseFloat(normalizado);
}

/**
 * Construye una fecha a partir de "DD/MM/YYYY" y "HH:MM" en hora de Colombia
 * (America/Bogotá, UTC-5).
 */
export function parsearFecha(fechaTexto: string, horaTexto: string): Date {
  const [dd, mm, yyyy] = fechaTexto.split("/");
  const [hh, min] = horaTexto.split(":");
  const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00-05:00`;
  return new Date(iso);
}

export interface ResultadoParse {
  /** true si el texto coincidió con el formato de movimiento. */
  ok: boolean;
  /** true si el movimiento es un gasto (salida de dinero). */
  esGasto: boolean;
  movimiento?: MovimientoParseado;
  /** Motivo cuando no se pudo parsear o no es un gasto. */
  razon?: string;
}

/**
 * Parsea el texto plano de un correo de Bancolombia.
 * Devuelve el movimiento estructurado y si corresponde a un gasto.
 */
export function parsearCorreo(textoPlano: string): ResultadoParse {
  const texto = normalizarTexto(textoPlano);
  const m = texto.match(MOVIMIENTO_RE);

  if (!m) {
    return {
      ok: false,
      esGasto: false,
      razon: "El texto no coincide con el formato de movimiento de Bancolombia",
    };
  }

  const [, tipo, montoTexto, comercioRaw, tipoTarjeta, ultimos4, fechaTexto, horaTexto] = m;
  const esGasto = VERBOS_GASTO.includes(tipo);

  const movimiento: MovimientoParseado = {
    tipo,
    monto: parsearMonto(montoTexto),
    moneda: "COP",
    comercio: comercioRaw.trim(),
    tarjeta: `${tipoTarjeta} *${ultimos4}`,
    fecha: parsearFecha(fechaTexto, horaTexto),
    fechaTexto,
    horaTexto,
  };

  return {
    ok: true,
    esGasto,
    movimiento,
    razon: esGasto ? undefined : `Movimiento de tipo "${tipo}" no es un gasto`,
  };
}
