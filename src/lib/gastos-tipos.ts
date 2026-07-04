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
  if (d.categoria !== "Transporte" && d.categoria !== "Otros") {
    return "Categoría no válida.";
  }
  if (d.metodo !== "Efectivo" && d.metodo !== "Tarjeta") {
    return "Método de pago no válido.";
  }
  return null;
}
