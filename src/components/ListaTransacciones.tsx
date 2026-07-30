"use client";

import { useEffect, useState } from "react";
import { formatoCOP, metodoPago } from "@/lib/agregaciones";
import { formatearMiles, parsearMiles } from "@/lib/formato-numero";
import {
  fechaEnBogota,
  horaEnBogota,
  type DatosMovimiento,
  type MetodoManual,
} from "@/lib/gastos-tipos";
import type { TxUI } from "@/lib/demo-data";
import type { Categoria } from "@/lib/types";
import { CampoMonto } from "./CampoMonto";

const POR_PAGINA = 10;

const INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 focus:border-banco-verde focus:outline-none focus:ring-1 focus:ring-banco-verde";

const FECHA_FMT = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

type Res = { ok: boolean; error?: string };

interface Props {
  txs: TxUI[];
  categorias: string[];
  onCambiarCategoria: (id: string, categoria: Categoria) => void;
  onEliminar: (id: string) => void;
  onEditar: (id: string, d: DatosMovimiento) => Promise<Res>;
}

export function ListaTransacciones({
  txs,
  categorias,
  onCambiarCategoria,
  onEliminar,
  onEditar,
}: Props) {
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [comercio, setComercio] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [categoria, setCategoria] = useState("");
  const [metodo, setMetodo] = useState<MetodoManual>("Tarjeta");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  // Vuelve a la primera página cada vez que cambia el conjunto filtrado (nuevo
  // filtro, gasto agregado/eliminado, etc.), para no quedar en una página vacía.
  useEffect(() => {
    setPagina(0);
  }, [txs]);

  const totalPaginas = Math.max(1, Math.ceil(txs.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const visibles = txs.slice(
    paginaActual * POR_PAGINA,
    paginaActual * POR_PAGINA + POR_PAGINA,
  );

  function eliminar(id: string) {
    if (confirmando !== id) {
      setConfirmando(id);
      return;
    }
    setConfirmando(null);
    onEliminar(id);
  }

  function abrirEdicion(t: TxUI) {
    setEditandoId(t.id);
    setComercio(t.comercio);
    setMonto(formatearMiles(String(Math.round(t.monto))));
    setFecha(fechaEnBogota(t.fecha));
    setHora(horaEnBogota(t.fecha));
    setCategoria(t.categoria);
    setMetodo(metodoPago(t.tarjeta));
    setError(null);
    setConfirmando(null);
  }

  async function guardar(t: TxUI) {
    const importe = parsearMiles(monto);
    if (!comercio.trim()) return setError("El comercio es obligatorio.");
    if (Number.isNaN(importe) || importe <= 0)
      return setError("El monto debe ser mayor que 0.");

    setError(null);
    setPendiente(true);
    const r = await onEditar(t.id, {
      comercio,
      monto: importe,
      fecha,
      hora,
      categoria: categoria as Categoria,
      // En los del banco `tarjeta` es el número real: no se toca.
      metodo: t.esManual ? metodo : undefined,
    });
    setPendiente(false);
    if (!r.ok) return setError(r.error ?? "No se pudo guardar.");
    setEditandoId(null);
  }

  if (txs.length === 0) {
    return (
      <p className="p-6 text-sm text-gray-400">
        No hay movimientos con estos filtros.
      </p>
    );
  }

  return (
    <div>
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
            {visibles.map((t) =>
              editandoId === t.id ? (
                // Fila completa: en móvil las columnas Método y Categoría están
                // ocultas, así que los campos no cabrían celda por celda.
                <tr key={t.id} className="border-b border-gray-100 last:border-0">
                  <td colSpan={6} className="bg-gray-50 px-3 py-4 sm:px-4">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                      <label className="col-span-2 flex flex-col gap-1 lg:col-span-2">
                        <span className="text-xs font-medium text-gray-500">Comercio</span>
                        <input
                          className={INPUT}
                          value={comercio}
                          maxLength={80}
                          onChange={(e) => setComercio(e.target.value)}
                          autoFocus
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-500">Monto</span>
                        <CampoMonto className={INPUT} valor={monto} onChange={setMonto} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-500">Fecha</span>
                        <input
                          type="date"
                          className={INPUT}
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-500">Hora</span>
                        <input
                          type="time"
                          className={INPUT}
                          value={hora}
                          onChange={(e) => setHora(e.target.value)}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-500">Categoría</span>
                        <select
                          className={INPUT}
                          value={categoria}
                          onChange={(e) => setCategoria(e.target.value)}
                        >
                          {categorias.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          {!categorias.includes(categoria) && (
                            <option value={categoria}>{categoria}</option>
                          )}
                        </select>
                      </label>
                      {t.esManual ? (
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-gray-500">Método</span>
                          <select
                            className={INPUT}
                            value={metodo}
                            onChange={(e) => setMetodo(e.target.value as MetodoManual)}
                          >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Tarjeta">Tarjeta</option>
                          </select>
                        </label>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-gray-500">Tarjeta</span>
                          <p
                            className="px-0.5 py-1.5 text-sm text-gray-400"
                            title="Dato del banco: no se edita"
                          >
                            {t.tarjeta || "—"}
                          </p>
                        </div>
                      )}
                    </div>

                    {error && (
                      <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                        {error}
                      </p>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() => guardar(t)}
                        className="rounded-lg bg-banco-verde px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoId(null)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
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
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => abrirEdicion(t)}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-400 hover:border-banco-verde/50 hover:text-banco-verde"
                      title="Editar movimiento"
                    >
                      ✎
                    </button>
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
                  </div>
                </td>
              </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex flex-col items-center gap-2 border-t border-gray-100 px-3 py-3 sm:flex-row sm:justify-between sm:px-4">
          <span className="text-xs text-gray-400">
            {paginaActual * POR_PAGINA + 1}–
            {Math.min(paginaActual * POR_PAGINA + POR_PAGINA, txs.length)} de{" "}
            {txs.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              disabled={paginaActual === 0}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Anterior
            </button>
            <span className="text-xs text-gray-500">
              Página {paginaActual + 1} de {totalPaginas}
            </span>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              disabled={paginaActual >= totalPaginas - 1}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
