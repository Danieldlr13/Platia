// Tipos compartidos por el parser, el clasificador, el ingestor y la web.

export type Categoria = "Transporte" | "Otros";

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
