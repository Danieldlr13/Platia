"use client";

import { useState } from "react";

export function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // El navegador puede bloquear el portapapeles sin gesto de usuario.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
    >
      {copiado ? "✓ Copiado" : "Copiar"}
    </button>
  );
}
