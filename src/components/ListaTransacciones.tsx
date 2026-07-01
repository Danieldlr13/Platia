"use client";

import { useState } from "react";
import { formatoCOP } from "@/lib/agregaciones";
import type { TxUI } from "@/lib/demo-data";
import type { Categoria } from "@/lib/types";

const FECHA_FMT = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

export function ListaTransacciones({ inicial }: { inicial: TxUI[] }) {
  const [txs, setTxs] = useState(inicial);

  function cambiarCategoria(id: string, categoria: Categoria) {
    // Por ahora solo actualiza la vista. La persistencia en Supabase se
    // conecta en la siguiente fase (marcando categoria_manual = true).
    setTxs((prev) => prev.map((t) => (t.id === id ? { ...t, categoria } : t)));
  }

  if (txs.length === 0) {
    return <p className="p-6 text-sm text-gray-400">Aún no hay movimientos.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Comercio</th>
            <th className="px-4 py-3 font-medium">Categoría</th>
            <th className="px-4 py-3 text-right font-medium">Monto</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((t) => (
            <tr key={t.id} className="border-b border-gray-100 last:border-0">
              <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                {FECHA_FMT.format(new Date(t.fecha))}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-800">{t.comercio}</span>
                <span className="ml-2 text-xs text-gray-400">{t.tarjeta}</span>
              </td>
              <td className="px-4 py-3">
                <select
                  value={t.categoria}
                  onChange={(e) => cambiarCategoria(t.id, e.target.value as Categoria)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    t.categoria === "Transporte"
                      ? "border-banco-verde/40 bg-banco-verde/10 text-banco-verde"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                >
                  <option value="Transporte">Transporte</option>
                  <option value="Otros">Otros</option>
                </select>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">
                {formatoCOP(t.monto)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
