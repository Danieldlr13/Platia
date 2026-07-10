// Paleta para colorear categorías (evita el rojo, reservado para estados).
// Los dos primeros coinciden con los colores por defecto de Transporte y Otros.

export const COLOR_TRANSPORTE = "#00C389";
export const COLOR_OTROS = "#94A3B8";

export const PALETA_CATEGORIAS = [
  COLOR_TRANSPORTE, // verde
  "#3B82F6", // azul
  "#F59E0B", // ámbar
  "#8B5CF6", // violeta
  "#EC4899", // rosa
  "#14B8A6", // teal
  "#F97316", // naranja
  "#6366F1", // índigo
  COLOR_OTROS, // gris
];

/** Color estable para una categoría según su índice (para fallback en gráficos). */
export function colorPorIndice(i: number): string {
  return PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length];
}
