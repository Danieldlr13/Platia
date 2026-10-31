// Utilidades para registrar errores sin filtrar datos del usuario.
//
// Los logs de GitHub Actions son legibles por cualquiera en un repo público, y
// los mensajes de error de IMAP, Supabase o del parser pueden incluir montos,
// comercios, asuntos o direcciones. Por eso los logs solo llevan conteos y, ante
// un error, su tipo y su código (nunca `message`, `details`, `hint` ni el objeto).

const SEGURO = /^[A-Za-z0-9_.-]{1,40}$/;

function seguro(valor: unknown): string | undefined {
  return typeof valor === "string" && SEGURO.test(valor) ? valor : undefined;
}

/** Describe un error con su tipo y código, sin el mensaje. */
export function describirError(err: unknown): string {
  if (typeof err !== "object" || err === null) return "error desconocido";
  const e = err as { name?: unknown; code?: unknown };
  const nombre = seguro(e.name) ?? "Error";
  const codigo = seguro(e.code);
  return codigo ? `${nombre} [${codigo}]` : nombre;
}
