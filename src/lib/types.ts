// Tipos compartidos por el parser, el clasificador, el ingestor y la web.

// El nombre de una categoría. Antes era una unión fija ("Transporte" | "Otros");
// ahora las categorías son dinámicas (el usuario las administra), así que es un
// string. "Transporte" y "Otros" siguen siendo categorías protegidas del sistema.
export type Categoria = string;

/** Categoría tal cual vive en la base de datos (para administrarlas y colorear). */
export interface CategoriaInfo {
  id: string;
  nombre: string;
  color: string;
}

/** Categorías protegidas: no se pueden borrar ni renombrar. */
export const CATEGORIAS_PROTEGIDAS = ["Transporte", "Otros"] as const;
/** Categoría a la que se reasignan los gastos por defecto al borrar una categoría. */
export const CATEGORIA_FALLBACK = "Otros";

/** Datos crudos extraídos del cuerpo de un correo de Bancolombia. */
export interface MovimientoParseado {
  /** Verbo del movimiento tal cual llega: "Compraste", "Pagaste", etc. */
  tipo: string;
  /** Monto en COP ya normalizado a número (3.704,00 -> 3704). */
  monto: number;
  moneda: string;
  /** Nombre del comercio tal cual: "UBER RIDES*DL". */
  comercio: string;
  /** Tarjeta usada: "T.Deb *0172". */
  tarjeta: string;
  /** Fecha/hora del movimiento (hora Colombia, UTC-5). */
  fecha: Date;
  fechaTexto: string;
  horaTexto: string;
}

/** Movimiento ya clasificado y listo para guardar en base de datos. */
export interface Transaccion {
  id?: string;
  fecha: string; // ISO
  monto: number;
  moneda: string;
  comercio: string;
  categoria: Categoria;
  categoriaManual: boolean;
  tarjeta: string;
  tipo: string;
  rawTexto: string;
  emailMessageId: string;
}
