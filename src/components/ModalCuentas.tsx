"use client";

import { useEffect, useState } from "react";
import { formatoCOP } from "@/lib/agregaciones";
import {
  agruparPorTipo,
  type CuentaConSaldo,
} from "@/lib/patrimonio-agregaciones";
import {
  validarCuenta,
  validarSaldo,
  validarNombre,
  type DatosCuenta,
  type DatosSaldo,
  type TipoCuenta,
} from "@/lib/patrimonio-tipos";

type Res = { ok: boolean; error?: string };
type Modo = "crear" | "actualizar" | "renombrar";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  cuentas: CuentaConSaldo[];
  onCrear: (d: DatosCuenta) => Promise<Res>;
  onActualizarSaldo: (cuentaId: string, d: DatosSaldo) => Promise<Res>;
  onEditarNombre: (cuentaId: string, nombre: string) => Promise<Res>;
  onEliminar: (cuentaId: string) => Promise<Res>;
}

const INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-banco-verde focus:outline-none focus:ring-1 focus:ring-banco-verde";

function hoy(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

const FECHA_FMT = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

const TITULO_GRUPO: Record<TipoCuenta, string> = {
  cuenta: "Cuentas",
  por_cobrar: "Me deben",
};

export function ModalCuentas({
  abierto,
  onCerrar,
  cuentas,
  onCrear,
  onActualizarSaldo,
  onEditarNombre,
  onEliminar,
}: Props) {
  const [modo, setModo] = useState<Modo>("crear");
  const [objetivo, setObjetivo] = useState<CuentaConSaldo | null>(null);
  const [tipo, setTipo] = useState<TipoCuenta>("cuenta");
  const [nombre, setNombre] = useState("");
  const [saldo, setSaldo] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

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
    setModo("crear");
    setObjetivo(null);
    setTipo("cuenta");
    setNombre("");
    setSaldo("");
    setFecha(hoy());
    setError(null);
  }

  function cerrar() {
    limpiar();
    setConfirmandoId(null);
    onCerrar();
  }

  function irAActualizar(c: CuentaConSaldo) {
    setModo("actualizar");
    setObjetivo(c);
    setSaldo("");
    setFecha(hoy());
    setError(null);
    setConfirmandoId(null);
  }

  function irARenombrar(c: CuentaConSaldo) {
    setModo("renombrar");
    setObjetivo(c);
    setNombre(c.nombre);
    setError(null);
    setConfirmandoId(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (modo === "crear") {
      const d: DatosCuenta = { nombre, tipo, saldo: Number(saldo), fecha };
      const err = validarCuenta(d);
      if (err) return setError(err);
      setPendiente(true);
      const r = await onCrear(d);
      setPendiente(false);
      if (!r.ok) return setError(r.error ?? "No se pudo guardar.");
      limpiar();
      return;
    }

    if (modo === "actualizar" && objetivo) {
      const d: DatosSaldo = { saldo: Number(saldo), fecha };
      const err = validarSaldo(d);
      if (err) return setError(err);
      setPendiente(true);
      const r = await onActualizarSaldo(objetivo.id, d);
      setPendiente(false);
      if (!r.ok) return setError(r.error ?? "No se pudo guardar.");
      limpiar();
      return;
    }

    if (modo === "renombrar" && objetivo) {
      const err = validarNombre(nombre);
      if (err) return setError(err);
      setPendiente(true);
      const r = await onEditarNombre(objetivo.id, nombre);
      setPendiente(false);
      if (!r.ok) return setError(r.error ?? "No se pudo guardar.");
      limpiar();
    }
  }

  async function eliminar(id: string) {
    if (confirmandoId !== id) {
      setConfirmandoId(id);
      return;
    }
    setConfirmandoId(null);
    setPendiente(true);
    const r = await onEliminar(id);
    setPendiente(false);
    if (!r.ok) setError(r.error ?? "No se pudo eliminar.");
    if (objetivo?.id === id) limpiar();
  }

  const grupos = agruparPorTipo(cuentas);
  const tituloForm =
    modo === "crear" ? "Nueva cuenta" : modo === "actualizar" ? "Nuevo saldo" : "Renombrar";
  const tituloBoton =
    modo === "crear" ? "Agregar cuenta" : modo === "actualizar" ? "Guardar saldo" : "Guardar nombre";

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
              Cuentas y deudas
            </h2>
            <p className="text-xs text-gray-500">
              Tu balance general: cuentas propias y lo que te deben. Cada
              actualización queda en el historial.
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

        <form onSubmit={onSubmit} className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">{tituloForm}</h3>
            {(modo === "actualizar" || modo === "renombrar") && objetivo && (
              <span className="text-xs text-gray-400">{objetivo.nombre}</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {modo === "crear" && (
              <>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs font-medium text-gray-500">Nombre</span>
                  <input
                    className={INPUT}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Bancolombia Ahorros, Juan Pérez…"
                    maxLength={60}
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">Tipo</span>
                  <select
                    className={INPUT}
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoCuenta)}
                  >
                    <option value="cuenta">Cuenta</option>
                    <option value="por_cobrar">Me deben</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">Saldo inicial</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    className={INPUT}
                    value={saldo}
                    onChange={(e) => setSaldo(e.target.value)}
                    placeholder="0"
                  />
                </label>
              </>
            )}

            {modo === "actualizar" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Saldo nuevo</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className={INPUT}
                  value={saldo}
                  onChange={(e) => setSaldo(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </label>
            )}

            {modo === "renombrar" && (
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-gray-500">Nombre</span>
                <input
                  className={INPUT}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={60}
                  autoFocus
                />
              </label>
            )}

            {modo !== "renombrar" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">Fecha</span>
                <input
                  type="date"
                  className={INPUT}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </label>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              disabled={pendiente}
              className="rounded-lg bg-banco-verde px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {tituloBoton}
            </button>
            {modo !== "crear" && (
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

        <div className="max-h-72 space-y-4 overflow-y-auto border-t border-gray-100 pt-4">
          {(["cuenta", "por_cobrar"] as TipoCuenta[]).map((t) =>
            grupos[t].length === 0 ? null : (
              <div key={t}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {TITULO_GRUPO[t]}
                </h3>
                <ul className="space-y-2">
                  {grupos[t].map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-800">{c.nombre}</p>
                        <p className="text-xs text-gray-400">
                          {formatoCOP(c.saldoActual)}
                          {c.fechaActualizacion && (
                            <>
                              {" · "}
                              actualizado{" "}
                              {FECHA_FMT.format(new Date(`${c.fechaActualizacion}T12:00:00`))}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => irAActualizar(c)}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Actualizar
                        </button>
                        <button
                          type="button"
                          onClick={() => irARenombrar(c)}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(c.id)}
                          className={`rounded-md border px-2 py-1 text-xs font-medium ${
                            confirmandoId === c.id
                              ? "border-red-500 bg-red-500 text-white"
                              : "border-gray-300 bg-white text-red-600 hover:bg-red-50"
                          }`}
                        >
                          {confirmandoId === c.id ? "¿Borrar?" : "Eliminar"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
          {cuentas.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">
              Aún no has agregado cuentas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
