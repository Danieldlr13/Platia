"use client";

// Sección "Categorías": CRUD completo. Al borrar una categoría sus gastos se
// reasignan a la que elijas — nunca se pierden.

import { useState } from "react";
import { PALETA_CATEGORIAS } from "@/lib/colores";
import { CATEGORIAS_PROTEGIDAS } from "@/lib/types";
import type { CategoriaInfo } from "@/lib/types";
import {
  crearCategoria,
  editarCategoria,
  eliminarCategoria,
} from "@/lib/categorias-acciones";

const INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-banco-verde focus:outline-none focus:ring-1 focus:ring-banco-verde disabled:bg-gray-100 disabled:text-gray-400";
const BOTON_SEC =
  "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50";

const esProtegida = (n: string) =>
  (CATEGORIAS_PROTEGIDAS as readonly string[]).includes(n);

export function PanelCategorias({
  categoriasIniciales,
}: {
  categoriasIniciales: CategoriaInfo[];
}) {
  const [categorias, setCategorias] = useState(categoriasIniciales);
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(PALETA_CATEGORIAS[1]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [destino, setDestino] = useState("Otros");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  const editando = editandoId ? categorias.find((c) => c.id === editandoId) : null;
  const editandoProtegida = editando ? esProtegida(editando.nombre) : false;

  function limpiar() {
    setNombre("");
    setColor(PALETA_CATEGORIAS[1]);
    setEditandoId(null);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError("El nombre es obligatorio.");

    setError(null);
    setPendiente(true);
    const r = editandoId
      ? await editarCategoria(editandoId, nombre.trim(), color)
      : await crearCategoria(nombre.trim(), color);
    setPendiente(false);
    if (!r.ok) return setError(r.error ?? "No se pudo guardar.");

    if (editandoId) {
      setCategorias((prev) =>
        prev.map((c) =>
          c.id === editandoId ? { ...c, nombre: nombre.trim(), color } : c,
        ),
      );
    } else {
      const nueva = r.categoria ?? { id: `local-${nombre}`, nombre: nombre.trim(), color };
      setCategorias((prev) => [...prev, nueva]);
    }
    limpiar();
  }

  function editar(c: CategoriaInfo) {
    setEditandoId(c.id);
    setNombre(c.nombre);
    setColor(c.color);
    setError(null);
    setBorrandoId(null);
  }

  function iniciarBorrado(c: CategoriaInfo) {
    setBorrandoId(c.id);
    // Destino por defecto: "Otros" si existe y no es la que se borra.
    const otras = categorias.filter((x) => x.id !== c.id);
    setDestino((otras.find((x) => x.nombre === "Otros") ?? otras[0])?.nombre ?? "Otros");
    setError(null);
  }

  async function confirmarBorrado(id: string) {
    setPendiente(true);
    const r = await eliminarCategoria(id, destino);
    setPendiente(false);
    setBorrandoId(null);
    if (!r.ok) return setError(r.error ?? "No se pudo eliminar.");
    setCategorias((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Categorías</h1>
        <p className="text-sm text-gray-500">
          Con estas categorías se clasifican tus gastos. Al borrar una, sus gastos se
          mueven a la que elijas.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">
              {editandoId ? "Nombre" : "Nueva categoría"}
            </span>
            <input
              className={INPUT}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Comida, Salud, Ocio…"
              maxLength={40}
              disabled={editandoProtegida}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pendiente}
              className="rounded-lg bg-banco-verde px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {editandoId ? "Guardar" : "Agregar"}
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
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Color:</span>
          {PALETA_CATEGORIAS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full ring-offset-2 ${
                color === c ? "ring-2 ring-gray-500" : ""
              }`}
              style={{ background: c }}
            />
          ))}
        </div>

        {editandoProtegida && (
          <p className="mt-2 text-xs text-gray-400">
            “{editando?.nombre}” es del sistema: solo puedes cambiar su color.
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </form>

      <ul className="space-y-2">
        {categorias.map((c) => (
          <li
            key={c.id}
            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: c.color }}
              />
              <span className="min-w-0 flex-1 truncate font-medium text-gray-800">
                {c.nombre}
              </span>
              {esProtegida(c.nombre) && (
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                  sistema
                </span>
              )}
            </div>

            {borrandoId === c.id ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">mover a</span>
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="min-w-[130px] flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs sm:flex-none"
                  >
                    {categorias
                      .filter((x) => x.id !== c.id)
                      .map((x) => (
                        <option key={x.id} value={x.nombre}>
                          {x.nombre}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => confirmarBorrado(c.id)}
                    disabled={pendiente}
                    className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    Borrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setBorrandoId(null)}
                    className={BOTON_SEC}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => editar(c)} className={BOTON_SEC}>
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => iniciarBorrado(c)}
                  disabled={esProtegida(c.nombre)}
                  className={`${BOTON_SEC} text-red-600 enabled:hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300`}
                >
                  Eliminar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
