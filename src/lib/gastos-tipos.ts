// Tipos y validación pura para los gastos manuales (los que la automatización no
// capta: efectivo, compras fuera de Bancolombia). Sin dependencias de servidor,
// para poder importarse tanto en cliente como en servidor.

import type { Categoria } from "./types";

/** Prefijo del email_message_id que marca una transacción creada a mano. */
export const MARCA_MANUAL = "manual-";

export type MetodoManual = "Efectivo" | "Tarjeta";

export interface DatosGasto {
  descripcion: string;
  monto: number;
  fecha: string; // "YYYY-MM-DD"
  categoria: Categoria;
  metodo: MetodoManual;
}

/**
 * Lo editable de cualquier movimiento, venga del banco o anotado a mano.
 * `metodo` solo se manda en los manuales: en los del banco la columna `tarjeta`
 * guarda la tarjeta real (p. ej. "*1234") y sobrescribirla perdería ese dato.
 * `hora` conserva la hora original al cambiarle solo el día.
 */
export interface DatosMovimiento {
  comercio: string;
  monto: number;
  fecha: string; // "YYYY-MM-DD"
  categoria: Categoria;
  metodo?: MetodoManual;
  hora?: string; // "HH:mm" en hora de Colombia
}

export function validarMovimiento(d: DatosMovimiento): string | null {
  if (!d.comercio || !d.comercio.trim()) {
    return "El comercio es obligatorio.";
  }
  if (!Number.isFinite(d.monto) || d.monto <= 0) {
    return "El monto debe ser mayor que 0.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) {
    return "La fecha no es válida.";
  }
  if (!d.categoria || !d.categoria.trim()) {
    return "Elige una categoría.";
  }
  if (d.hora !== undefined && !/^\d{2}:\d{2}$/.test(d.hora)) {
    return "La hora no es válida.";
  }
  if (d.metodo !== undefined && d.metodo !== "Efectivo" && d.metodo !== "Tarjeta") {
    return "Método de pago no válido.";
  }
  return null;
}

// Colombia no tiene horario de verano: su desfase es siempre -05:00.
const PARTES_BOGOTA = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partesBogota(iso: string): Record<string, string> {
  return Object.fromEntries(
    PARTES_BOGOTA.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
}

/** Día ("YYYY-MM-DD") de un instante, visto desde Colombia. */
export function fechaEnBogota(iso: string): string {
  const p = partesBogota(iso);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hora ("HH:mm") de un instante, vista desde Colombia. */
export function horaEnBogota(iso: string): string {
  const p = partesBogota(iso);
  return `${p.hour}:${p.minute}`;
}

/** Instante exacto a partir del día y la hora locales de Colombia. */
export function instanteBogota(fecha: string, hora?: string): string {
  return `${fecha}T${hora ?? "12:00"}:00-05:00`;
}

/** Devuelve un mensaje de error si los datos no son válidos, o null si están bien. */
export function validarGasto(d: DatosGasto): string | null {
  if (!d.descripcion || !d.descripcion.trim()) {
    return "La descripción es obligatoria.";
  }
  if (!Number.isFinite(d.monto) || d.monto <= 0) {
    return "El monto debe ser mayor que 0.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) {
    return "La fecha no es válida.";
  }
  if (!d.categoria || !d.categoria.trim()) {
    return "Elige una categoría.";
  }
  if (d.metodo !== "Efectivo" && d.metodo !== "Tarjeta") {
    return "Método de pago no válido.";
  }
  return null;
}
