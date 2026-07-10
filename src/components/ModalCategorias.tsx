"use client";

import { useEffect, useState } from "react";
import { PALETA_CATEGORIAS } from "@/lib/colores";
import { CATEGORIAS_PROTEGIDAS } from "@/lib/types";
import type { CategoriaInfo } from "@/lib/types";

const INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-banco-verde focus:outline-none focus:ring-1 focus:ring-banco-verde disabled:bg-gray-100 disabled:text-gray-400";

type Res = { ok: boolean; error?: string };

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  categorias: CategoriaInfo[];
  onCrear: (nombre: string, color: string) => Promise<Res>;
  onEditar: (id: string, nombre: string, color: string) => Promise<Res>;
  onEliminar: (id: string, destinoNombre: string) => Promise<Res>;
}

const esProtegida = (n: string) =>
  (CATEGORIAS_PROTEGIDAS as readonly string[]).includes(n);

export function ModalCategorias({
  abierto,
  onCerrar,
  categorias,
  onCrear,
  onEditar,
  onEliminar,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(PALETA_CATEGORIAS[1]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [destino, setDestino] = useState("Otros");

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

  const editando = editandoId
    ? categorias.find((c) => c.id === editandoId)
    : null;
  const editandoProtegida = editando ? esProtegida(editando.nombre) : false;

  function limpiar() {
    setNombre("");
    setColor(PALETA_CATEGORIAS[1]);
    setEditandoId(null);
    setError(null);
  }

  function cerrar() {
    limpiar();
    setBorrandoId(null);
    onCerrar();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setError(null);
    setPendiente(true);
    const r = editandoId
      ? await onEditar(editandoId, nombre.trim(), color)
      : await onCrear(nombre.trim(), color);
    setPendiente(false);
    if (!r.ok) {
      setError(r.error ?? "No se pudo guardar.");
      return;
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
    // destino por defecto: "Otros" si existe y no es la que se borra; si no, otra.
    const otros = categorias.filter((x) => x.id !== c.id);
    const pref = otros.find((x) => x.nombre === "Otros") ?? otros[0];
    setDestino(pref?.nombre ?? "Otros");
    setError(null);
  }

  async function confirmarBorrado(id: string) {
    setPendiente(true);
    const r = await onEliminar(id, destino);
    setPendiente(false);
    setBorrandoId(null);
    if (!r.ok) setError(r.error ?? "No se pudo eliminar.");
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
              Categorías
            </h2>
            <p className="text-xs text-gray-500">
              Crea, edita o elimina categorías. Al borrar una, sus gastos se
              mueven a la categoría que elijas.
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-gray-500">
                {editandoId ? "Nombre" : "Nueva categoría"}
              </span>
              <input
                className={INPUT}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Comida, Salud, Ocio…"
                maxLength={40}
                disabled={editandoProtegida}
                autoFocus
              />
            </label>
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

        {/* Lista */}
        <ul className="max-h-72 space-y-2 overflow-y-auto border-t border-gray-100 pt-4">
          {categorias.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="flex min-w-0 items-center gap-3">
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
                      className="rounded-md border border-red-500 bg-red-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
                    >
                      Borrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setBorrandoId(null)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editar(c)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => iniciarBorrado(c)}
                    disabled={esProtegida(c.nombre)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-red-600 enabled:hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
