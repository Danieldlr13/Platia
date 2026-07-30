"use client";

// Una cuenta del balance general con todas sus acciones. Cada panel (actualizar,
// editar, historial, confirmar borrado) se despliega dentro de la misma fila.

import { useState } from "react";
import { formatoCOP } from "@/lib/agregaciones";
import { formatearMiles, parsearMiles } from "@/lib/formato-numero";
import type { CuentaConSaldo } from "@/lib/patrimonio-agregaciones";
import type {
  DatosEdicionCuenta,
  DatosSaldo,
  SaldoRegistro,
  TipoCuenta,
} from "@/lib/patrimonio-tipos";
import { CampoMonto } from "./CampoMonto";

type Res = { ok: boolean; error?: string };
type Panel = "actualizar" | "editar" | "historial" | "borrar" | null;

interface Props {
  cuenta: CuentaConSaldo;
  historial: SaldoRegistro[];
  onActualizarSaldo: (cuentaId: string, d: DatosSaldo) => Promise<Res>;
  onEditarCuenta: (cuentaId: string, d: DatosEdicionCuenta) => Promise<Res>;
  onEliminarCuenta: (cuentaId: string) => Promise<Res>;
  onEditarRegistro: (saldoId: string, d: DatosSaldo) => Promise<Res>;
  onEliminarRegistro: (saldoId: string) => Promise<Res>;
}

const INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-banco-verde focus:outline-none focus:ring-1 focus:ring-banco-verde";
const BOTON_SEC =
  "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50";
const BOTON_PRI =
  "rounded-lg bg-banco-verde px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-60";

const FECHA_FMT = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

function fechaLarga(iso: string): string {
  return FECHA_FMT.format(new Date(`${iso}T12:00:00`));
}

export function hoy(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

export function FilaCuenta({
  cuenta,
  historial,
  onActualizarSaldo,
  onEditarCuenta,
  onEliminarCuenta,
  onEditarRegistro,
  onEliminarRegistro,
}: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  // Panel "actualizar": arranca con el saldo actual como referencia.
  const [saldo, setSaldo] = useState("");
  const [fecha, setFecha] = useState(hoy());

  // Panel "editar": nombre y tipo de la cuenta.
  const [nombre, setNombre] = useState(cuenta.nombre);
  const [tipo, setTipo] = useState<TipoCuenta>(cuenta.tipo);

  // Edición de un registro puntual del historial.
  const [registroId, setRegistroId] = useState<string | null>(null);
  const [rSaldo, setRSaldo] = useState("");
  const [rFecha, setRFecha] = useState(hoy());

  function abrir(p: Panel) {
    setError(null);
    setRegistroId(null);
    if (panel === p) return setPanel(null);
    if (p === "actualizar") {
      setSaldo(formatearMiles(String(cuenta.saldoActual)));
      setFecha(hoy());
    }
    if (p === "editar") {
      setNombre(cuenta.nombre);
      setTipo(cuenta.tipo);
    }
    setPanel(p);
  }

  /** Ejecuta una acción del servidor manejando pendiente/error de forma uniforme. */
  async function ejecutar(accion: () => Promise<Res>, alTerminar?: () => void) {
    setError(null);
    setPendiente(true);
    const r = await accion();
    setPendiente(false);
    if (!r.ok) return setError(r.error ?? "No se pudo guardar.");
    alTerminar?.();
  }

  function guardarSaldo() {
    const monto = parsearMiles(saldo);
    if (Number.isNaN(monto)) return setError("Escribe un saldo.");
    ejecutar(
      () => onActualizarSaldo(cuenta.id, { saldo: monto, fecha }),
      () => setPanel(null),
    );
  }

  function guardarCuenta() {
    if (!nombre.trim()) return setError("El nombre es obligatorio.");
    ejecutar(
      () => onEditarCuenta(cuenta.id, { nombre, tipo }),
      () => setPanel(null),
    );
  }

  function editarRegistro(r: SaldoRegistro) {
    setRegistroId(r.id);
    setRSaldo(formatearMiles(String(r.saldo)));
    setRFecha(r.fecha);
    setError(null);
  }

  function guardarRegistro(id: string) {
    const monto = parsearMiles(rSaldo);
    if (Number.isNaN(monto)) return setError("Escribe un saldo.");
    ejecutar(
      () => onEditarRegistro(id, { saldo: monto, fecha: rFecha }),
      () => setRegistroId(null),
    );
  }

  const esPorCobrar = cuenta.tipo === "por_cobrar";
  const puedeMarcarPagado = esPorCobrar && cuenta.saldoActual !== 0;

  return (
    <li className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{cuenta.nombre}</p>
          <p className="text-xs text-gray-400">
            {cuenta.fechaActualizacion
              ? `actualizado ${fechaLarga(cuenta.fechaActualizacion)}`
              : "sin actualizaciones"}
            {historial.length > 0 &&
              ` · ${historial.length} ${historial.length === 1 ? "registro" : "registros"}`}
          </p>
        </div>
        <p className="shrink-0 text-xl font-semibold text-gray-900 sm:text-right">
          {formatoCOP(cuenta.saldoActual)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
        <button type="button" className={BOTON_SEC} onClick={() => abrir("actualizar")}>
          Actualizar saldo
        </button>
        {puedeMarcarPagado && (
          <button
            type="button"
            disabled={pendiente}
            className={BOTON_SEC}
            onClick={() =>
              ejecutar(() => onActualizarSaldo(cuenta.id, { saldo: 0, fecha: hoy() }))
            }
          >
            Ya me pagaron
          </button>
        )}
        <button type="button" className={BOTON_SEC} onClick={() => abrir("historial")}>
          {panel === "historial" ? "Ocultar historial" : "Historial"}
        </button>
        <button type="button" className={BOTON_SEC} onClick={() => abrir("editar")}>
          Editar
        </button>
        <button
          type="button"
          className={`${BOTON_SEC} text-red-600 hover:bg-red-50`}
          onClick={() => abrir("borrar")}
        >
          Eliminar
        </button>
      </div>

      {error && (
        <p className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {panel === "actualizar" && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <p className="mb-3 text-xs text-gray-500">
            Guarda el saldo de hoy sin borrar los anteriores. Actual:{" "}
            <strong className="text-gray-700">{formatoCOP(cuenta.saldoActual)}</strong>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-gray-500">Saldo</span>
              <CampoMonto className={INPUT} valor={saldo} onChange={setSaldo} autoFocus />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-gray-500">Fecha</span>
              <input
                type="date"
                className={INPUT}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={guardarSaldo}
                disabled={pendiente}
                className={`${BOTON_PRI} py-2`}
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className={`${BOTON_SEC} py-2`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {panel === "editar" && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-gray-500">Nombre</span>
              <input
                className={INPUT}
                value={nombre}
                maxLength={60}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={guardarCuenta}
                disabled={pendiente}
                className={`${BOTON_PRI} py-2`}
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className={`${BOTON_SEC} py-2`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {panel === "borrar" && (
        <div className="border-t border-gray-100 bg-red-50/60 p-4">
          <p className="mb-3 text-sm text-gray-700">
            Se elimina <strong>{cuenta.nombre}</strong>
            {historial.length > 0 && (
              <>
                {" "}
                y sus {historial.length}{" "}
                {historial.length === 1 ? "registro" : "registros"} de historial
              </>
            )}
            . La tendencia dejará de incluirla. No se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pendiente}
              onClick={() => ejecutar(() => onEliminarCuenta(cuenta.id))}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              Sí, eliminar
            </button>
            <button type="button" onClick={() => setPanel(null)} className={BOTON_SEC}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {panel === "historial" && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          {historial.length === 0 ? (
            <p className="text-sm text-gray-400">Esta cuenta aún no tiene registros.</p>
          ) : (
            <ul className="space-y-2">
              {historial.map((r) =>
                registroId === r.id ? (
                  <li
                    key={r.id}
                    className="flex flex-col gap-2 rounded-lg border border-banco-verde/40 bg-white p-3 sm:flex-row sm:items-end"
                  >
                    <label className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500">Saldo</span>
                      <CampoMonto
                        className={INPUT}
                        valor={rSaldo}
                        onChange={setRSaldo}
                        autoFocus
                      />
                    </label>
                    <label className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500">Fecha</span>
                      <input
                        type="date"
                        className={INPUT}
                        value={rFecha}
                        onChange={(e) => setRFecha(e.target.value)}
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() => guardarRegistro(r.id)}
                        className={`${BOTON_PRI} py-2`}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegistroId(null)}
                        className={`${BOTON_SEC} py-2`}
                      >
                        Cancelar
                      </button>
                    </div>
                  </li>
                ) : (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">
                      <strong className="font-medium">{formatoCOP(r.saldo)}</strong>
                      <span className="text-gray-400"> · {fechaLarga(r.fecha)}</span>
                    </span>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editarRegistro(r)}
                        className={BOTON_SEC}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={pendiente || historial.length === 1}
                        title={
                          historial.length === 1
                            ? "Una cuenta necesita al menos un saldo: edítalo o elimina la cuenta."
                            : undefined
                        }
                        onClick={() => ejecutar(() => onEliminarRegistro(r.id))}
                        className={`${BOTON_SEC} text-red-600 enabled:hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300`}
                      >
                        Borrar
                      </button>
                    </span>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
