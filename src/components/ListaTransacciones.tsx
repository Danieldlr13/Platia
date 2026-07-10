"use client";

import { useState } from "react";
import { formatoCOP, metodoPago } from "@/lib/agregaciones";
import type { TxUI } from "@/lib/demo-data";
import type { Categoria } from "@/lib/types";

const FECHA_FMT = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

interface Props {
  txs: TxUI[];
  categorias: string[];
  onCambiarCategoria: (id: string, categoria: Categoria) => void;
  onEliminar: (id: string) => void;
}

export function ListaTransacciones({
  txs,
  categorias,
  onCambiarCategoria,
  onEliminar,
}: Props) {
  const [confirmando, setConfirmando] = useState<string | null>(null);

  function eliminar(id: string) {
    if (confirmando !== id) {
      setConfirmando(id);
      return;
    }
    setConfirmando(null);
    onEliminar(id);
  }

  if (txs.length === 0) {
    return (
      <p className="p-6 text-sm text-gray-400">
        No hay movimientos con estos filtros.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="px-3 py-3 font-medium sm:px-4">Fecha</th>
            <th className="px-3 py-3 font-medium sm:px-4">Comercio</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Método</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Categoría</th>
            <th className="px-3 py-3 text-right font-medium sm:px-4">Monto</th>
            <th className="px-3 py-3 sm:px-4" />
          </tr>
        </thead>
        <tbody>
          {txs.map((t) => (
            <tr key={t.id} className="border-b border-gray-100 last:border-0">
              <td className="whitespace-nowrap px-3 py-3 text-gray-500 sm:px-4">
                {FECHA_FMT.format(new Date(t.fecha))}
              </td>
              <td className="px-3 py-3 sm:px-4">
                <span className="font-medium text-gray-800">{t.comercio}</span>
                <span className="ml-2 hidden text-xs text-gray-400 sm:inline">
                  {t.tarjeta}
                </span>
              </td>
              <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                {metodoPago(t.tarjeta)}
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <select
                  value={t.categoria}
                  onChange={(e) =>
                    onCambiarCategoria(t.id, e.target.value as Categoria)
                  }
                  className={`rounded-full border px-2 py-1 text-xs font-medium sm:px-3 ${
                    t.categoria === "Transporte"
                      ? "border-banco-verde/40 bg-banco-verde/10 text-banco-verde"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                >
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  {/* si la categoría actual ya no está en la lista, la incluimos */}
                  {!categorias.includes(t.categoria) && (
                    <option value={t.categoria}>{t.categoria}</option>
                  )}
                </select>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-gray-900 sm:px-4">
                {formatoCOP(t.monto)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right sm:px-4">
                <button
                  type="button"
                  onClick={() => eliminar(t.id)}
                  onBlur={() => confirmando === t.id && setConfirmando(null)}
                  className={`rounded-md border px-2 py-1 text-xs font-medium ${
                    confirmando === t.id
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-gray-200 bg-white text-gray-400 hover:border-red-300 hover:text-red-600"
                  }`}
                  title="Eliminar movimiento"
                >
                  {confirmando === t.id ? "¿Borrar?" : "✕"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
