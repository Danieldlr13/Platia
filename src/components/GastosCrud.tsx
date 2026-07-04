"use client";

import { useState } from "react";
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

function porFechaDesc(a: TxUI, b: TxUI): number {
  return b.fecha.localeCompare(a.fecha);
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

export function GastosCrud({ inicial }: { inicial: TxUI[] }) {
  const [gastos, setGastos] = useState<TxUI[]>(inicial);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [categoria, setCategoria] = useState<Categoria>("Otros");
  const [metodo, setMetodo] = useState<MetodoManual>("Efectivo");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  function limpiar() {
    setDescripcion("");
    setMonto("");
    setFecha(hoy());
    setCategoria("Otros");
    setMetodo("Efectivo");
    setEditandoId(null);
    setError(null);
  }

  // Construye una TxUI a partir de los datos del formulario (para la UI optimista).
  function aTxUI(id: string, d: DatosGasto): TxUI {
    return {
      id,
      fecha: `${d.fecha}T12:00:00-05:00`,
      monto: d.monto,
      comercio: d.descripcion.trim(),
      categoria: d.categoria,
      tarjeta: d.metodo,
      tipo: "Manual",
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
      // Optimista: reemplaza en la lista y sale del modo edición al instante.
      const id = editandoId;
      const anterior = gastos.find((g) => g.id === id);
      setGastos((gs) =>
        gs.map((g) => (g.id === id ? aTxUI(id, datos) : g)).sort(porFechaDesc),
      );
      limpiar();
      void (async () => {
        const r = await actualizarGasto(id, datos);
        if (!r.ok && anterior) {
          // Revierte solo este ítem, sin tocar el resto de la lista.
          setGastos((gs) =>
            gs.map((g) => (g.id === id ? anterior : g)).sort(porFechaDesc),
          );
          setError(r.error ?? "No se pudo guardar.");
        }
      })();
    } else {
      // Optimista: agrega con un id temporal y lo sustituye por el real al volver.
      const tempId = `temp-${crypto.randomUUID()}`;
      setGastos((gs) => [aTxUI(tempId, datos), ...gs].sort(porFechaDesc));
      limpiar();
      void (async () => {
        const r = await crearGasto(datos);
        if (!r.ok || !r.gasto) {
          setGastos((gs) => gs.filter((g) => g.id !== tempId)); // quita solo el temporal
          setError(r.error ?? "No se pudo guardar.");
          return;
        }
        const real = r.gasto;
        setGastos((gs) => gs.map((g) => (g.id === tempId ? real : g)));
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function eliminar(id: string) {
    if (confirmando !== id) {
      setConfirmando(id);
      return;
    }
    setConfirmando(null);
    const eliminado = gastos.find((g) => g.id === id);
    setGastos((gs) => gs.filter((g) => g.id !== id)); // optimista
    void (async () => {
      const r = await eliminarGasto(id);
      if (!r.ok && eliminado) {
        // Revierte solo este ítem.
        setGastos((gs) => [eliminado, ...gs].sort(porFechaDesc));
        setError(r.error ?? "No se pudo eliminar.");
      }
    })();
  }

  return (
    <main className="mx-auto max-w-3xl px-3 py-8 sm:px-4">
      <a href="/" className="text-sm text-banco-verde hover:underline">
        ← Volver al panel
      </a>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Gastos manuales
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Anota gastos que no capta la automatización (efectivo, compras fuera de
          Bancolombia). Cuentan en el panel igual que los demás.
        </p>
      </header>

      {/* Formulario crear / editar */}
      <form
        onSubmit={onSubmit}
        className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          {editandoId ? "Editar gasto" : "Nuevo gasto"}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Campo label="Descripción">
              <input
                className={INPUT}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Almuerzo, taxi, mercado…"
                maxLength={80}
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
              <option value="Transporte">Transporte</option>
              <option value="Otros">Otros</option>
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
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        Tus gastos manuales{" "}
        <span className="font-normal text-gray-400">({gastos.length})</span>
      </h2>

      {gastos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          Aún no has anotado gastos manuales.
        </p>
      ) : (
        <ul className="space-y-2">
          {gastos.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4"
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
    </main>
  );
}
