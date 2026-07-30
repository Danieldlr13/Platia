// Formateo de campos numéricos mientras se escriben. Los saldos del balance
// general llegan a los millones y sin separadores es fácil equivocarse en un
// cero, así que el input muestra "1.250.000" y se parsea al enviar.

/** Agrupa de a tres con punto, respetando el signo. Descarta lo que no sea dígito. */
export function formatearMiles(entrada: string): string {
  const negativo = entrada.trim().startsWith("-");
  const digitos = entrada.replace(/\D/g, "");
  if (!digitos) return negativo ? "-" : "";
  const agrupado = Number(digitos).toLocaleString("es-CO");
  return negativo ? `-${agrupado}` : agrupado;
}

/** Inverso de formatearMiles. Devuelve NaN si no hay ningún dígito. */
export function parsearMiles(entrada: string): number {
  const negativo = entrada.trim().startsWith("-");
  const digitos = entrada.replace(/\D/g, "");
  if (!digitos) return NaN;
  const n = Number(digitos);
  return negativo ? -n : n;
}
