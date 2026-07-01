// Clasificador de movimientos en categorías.
//
// Por decisión del cliente solo hay dos categorías: "Transporte" y "Otros".
// Lo importante es aislar el gasto en transporte; todo lo demás va junto.
//
// La clasificación es por reglas: si el nombre del comercio contiene alguno de
// los patrones de transporte, es "Transporte"; si no, "Otros".

import type { Categoria } from "./types";

export interface ReglaCategoria {
  /** Subcadena a buscar dentro del comercio (sin distinguir mayúsculas). */
  patron: string;
  categoria: Categoria;
}

/** Comercios de transporte conocidos en Colombia. */
export const PATRONES_TRANSPORTE = [
  "UBER",
  "DIDI",
  "CABIFY",
  "BEAT",
  "INDRIVE",
  "INDRIVER",
  "TAXI",
  // Combustible
  "TERPEL",
  "PRIMAX",
  "TEXACO",
  "BIOMAX",
  "ESSO",
  "MOBIL",
  "PETROBRAS",
  "ZEUSS",
  // Transporte público / peajes
  "TRANSMILENIO",
  "METRO DE",
  "TULLAVE",
  "CIVICA",
  "PEAJE",
];

export const REGLAS_TRANSPORTE: ReglaCategoria[] = PATRONES_TRANSPORTE.map(
  (patron) => ({ patron, categoria: "Transporte" as const }),
);

/**
 * Devuelve la categoría de un comercio según las reglas dadas.
 * Si ninguna regla coincide, devuelve "Otros".
 */
export function clasificar(
  comercio: string,
  reglas: ReglaCategoria[] = REGLAS_TRANSPORTE,
): Categoria {
  const c = comercio.toUpperCase();
  for (const regla of reglas) {
    if (c.includes(regla.patron.toUpperCase())) {
      return regla.categoria;
    }
  }
  return "Otros";
}
