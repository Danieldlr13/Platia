"use client";

import { useEffect, useState } from "react";
import {
  crearGasto,
  actualizarGasto,
  eliminarGasto,
} from "@/lib/gastos-acciones";
import {
  validarGasto,
  type DatosGasto,
  type MetodoManual,
} from "@/lib/gastos-tipos";
import { formatoCOP, diaLocalCO, metodoPago } from "@/lib/agregaciones";
import type { TxUI } from "@/lib/demo-data";
import type { Categoria } from "@/lib/types";

const FECHA_FMT = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

const INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-banco-verde focus:outline-none focus:ring-1 focus:ring-banco-verde";

function hoy(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  /** Gastos manuales (subconjunto de las transacciones del panel), ya ordenados. */
  gastos: TxUI[];
  /** Nombres de categorías disponibles para el dropdown. */
  categorias: string[];
  /** Inserta o reemplaza una transacción en el estado del panel. */
  upsertTx: (tx: TxUI) => void;
  /** Elimina una transacción del estado del panel. */
  removeTx: (id: string) => void;
}

export function ModalGastos({
  abierto,
  onCerrar,
  gastos,
  categorias,
  upsertTx,
  removeTx,
}: Props) {
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [categoria, setCategoria] = useState<Categoria>("Otros");
  const [metodo, setMetodo] = useState<MetodoManual>("Efectivo");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  if (!abierto) return null;

  function limpiar() {
    setDescripcion("");
    setMonto("");
    setFecha(hoy());
    setCategoria("Otros");
    setMetodo("Efectivo");
    setEditandoId(null);
    setError(null);
  }

  function cerrar() {
    limpiar();
    setConfirmando(null);
    onCerrar();
  }

  function aTxUI(id: string, d: DatosGasto): TxUI {
    return {
      id,
      fecha: `${d.fecha}T12:00:00-05:00`,
      monto: d.monto,
      comercio: d.descripcion.trim(),
      categoria: d.categoria,
      tarjeta: d.metodo,
      tipo: "Manual",
      esManual: true,
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const datos: DatosGasto = {
      descripcion,
      monto: Number(monto),
      fecha,
      categoria,
      metodo,
    };
    const err = validarGasto(datos);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    if (editandoId) {
      const id = editandoId;
      const anterior = gastos.find((g) => g.id === id);
      upsertTx(aTxUI(id, datos)); // optimista
      limpiar();
      void (async () => {
        const r = await actualizarGasto(id, datos);
        if (!r.ok && anterior) {
          upsertTx(anterior); // revierte solo este ítem
          setError(r.error ?? "No se pudo guardar.");
        }
      })();
    } else {
      const tempId = `temp-${crypto.randomUUID()}`;
      upsertTx(aTxUI(tempId, datos)); // optimista
      limpiar();
      void (async () => {
        const r = await crearGasto(datos);
        if (!r.ok || !r.gasto) {
          removeTx(tempId);
          setError(r.error ?? "No se pudo guardar.");
          return;
        }
        removeTx(tempId);
        upsertTx(r.gasto); // sustituye el temporal por la fila real
      })();
    }
  }

  function editar(g: TxUI) {
    setEditandoId(g.id);
    setDescripcion(g.comercio);
    setMonto(String(g.monto));
    setFecha(diaLocalCO(g.fecha));
    setCategoria(g.categoria);
    setMetodo(metodoPago(g.tarjeta));
    setError(null);
    setConfirmando(null);
  }

  function eliminar(id: string) {
    if (confirmando !== id) {
      setConfirmando(id);
      return;
    }
    setConfirmando(null);
    const eliminado = gastos.find((g) => g.id === id);
    removeTx(id); // optimista
    void (async () => {
      const r = await eliminarGasto(id);
      if (!r.ok && eliminado) {
        upsertTx(eliminado); // revierte solo este ítem
        setError(r.error ?? "No se pudo eliminar.");
      }
    })();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={cerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="my-8 w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl sm:my-0 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">
              Gastos manuales
            </h2>
            <p className="text-xs text-gray-500">
              Efectivo o compras fuera de Bancolombia. Cuentan en el panel al
              instante.
            </p>
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Formulario crear / editar */}
        <form onSubmit={onSubmit} className="mb-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Campo label="Descripción">
                <input
                  className={INPUT}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Almuerzo, taxi, mercado…"
                  maxLength={80}
                  autoFocus
                />
              </Campo>
            </div>
            <Campo label="Monto (COP)">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                className={INPUT}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
              />
            </Campo>
            <Campo label="Fecha">
              <input
                type="date"
                className={INPUT}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </Campo>
            <Campo label="Categoría">
              <select
                className={INPUT}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Categoria)}
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Método de pago">
              <select
                className={INPUT}
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as MetodoManual)}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </Campo>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-banco-verde px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              {editandoId ? "Guardar cambios" : "Agregar gasto"}
            </button>
            {editandoId && (
              <button
                type="button"
                onClick={limpiar}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        {/* Lista */}
        <h3 className="mb-2 border-t border-gray-100 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Anotados ({gastos.length})
        </h3>

        {gastos.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            Aún no has anotado gastos manuales.
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {gastos.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-800">{g.comercio}</p>
                  <p className="text-xs text-gray-400">
                    {FECHA_FMT.format(new Date(g.fecha))} · {g.categoria} ·{" "}
                    {metodoPago(g.tarjeta)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {formatoCOP(g.monto)}
                  </span>
                  <button
                    type="button"
                    onClick={() => editar(g)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(g.id)}
                    className={`rounded-md border px-2 py-1 text-xs font-medium ${
                      confirmando === g.id
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-gray-300 bg-white text-red-600 hover:bg-red-50"
                    }`}
                  >
                    {confirmando === g.id ? "¿Confirmar?" : "Eliminar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
