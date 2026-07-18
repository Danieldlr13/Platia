// Tipos y validación pura del balance general (patrimonio). Sin dependencias
// de servidor, para poder importarse tanto en cliente como en servidor.

export type TipoCuenta = "cuenta" | "por_cobrar";

/** Una cuenta o "me deben" (sin su historial de saldos). */
export interface CuentaPatrimonio {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
}

/** Un registro de saldo: la foto de una cuenta en una fecha dada. */
export interface SaldoRegistro {
  id: string;
  cuentaId: string;
  saldo: number;
  fecha: string; // "YYYY-MM-DD"
  creadoEn: string; // ISO timestamp, para desempatar registros del mismo día
}

export interface DatosCuenta {
  nombre: string;
  tipo: TipoCuenta;
  saldo: number;
  fecha: string; // "YYYY-MM-DD"
}

export interface DatosSaldo {
  saldo: number;
  fecha: string; // "YYYY-MM-DD"
}

/** Devuelve un mensaje de error si los datos no son válidos, o null si están bien. */
export function validarCuenta(d: DatosCuenta): string | null {
  if (!d.nombre || !d.nombre.trim()) {
    return "El nombre es obligatorio.";
  }
  if (d.tipo !== "cuenta" && d.tipo !== "por_cobrar") {
    return "Tipo no válido.";
  }
  const errSaldo = validarSaldo(d);
  if (errSaldo) return errSaldo;
  return null;
}

export function validarSaldo(d: DatosSaldo): string | null {
  if (!Number.isFinite(d.saldo)) {
    return "El saldo debe ser un número.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) {
    return "La fecha no es válida.";
  }
  return null;
}

export function validarNombre(nombre: string): string | null {
  if (!nombre || !nombre.trim()) return "El nombre es obligatorio.";
  return null;
}
