"use client";

// Sección "Balance general": cuentas propias y lo que te deben, con el
// historial completo de cada una. Independiente del seguimiento de gastos.

import { useMemo, useState } from "react";
import { formatoCOP } from "@/lib/agregaciones";
import { parsearMiles } from "@/lib/formato-numero";
import {
  cuentasConSaldoActual,
  calcularResumen,
  calcularSerieTendencia,
  agruparPorTipo,
  historialDeCuenta,
} from "@/lib/patrimonio-agregaciones";
import {
  crearCuenta,
  actualizarSaldo,
  editarCuenta,
  eliminarCuenta,
  editarSaldoRegistro,
  eliminarSaldoRegistro,
} from "@/lib/patrimonio-acciones";
import type {
  CuentaPatrimonio,
  SaldoRegistro,
  DatosSaldo,
  DatosEdicionCuenta,
  TipoCuenta,
} from "@/lib/patrimonio-tipos";
import { GraficoPatrimonio } from "./GraficoPatrimonio";
import { CampoMonto } from "./CampoMonto";
import { FilaCuenta, hoy } from "./FilaCuenta";

interface Props {
  cuentasIniciales: CuentaPatrimonio[];
  saldosIniciales: SaldoRegistro[];
}

const INPUT =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-banco-verde focus:outline-none focus:ring-1 focus:ring-banco-verde";

const TITULO_GRUPO: Record<TipoCuenta, string> = {
  cuenta: "Cuentas",
  por_cobrar: "Me deben",
};

export function PanelBalance({ cuentasIniciales, saldosIniciales }: Props) {
  const [cuentas, setCuentas] = useState(cuentasIniciales);
  const [saldos, setSaldos] = useState(saldosIniciales);

  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoCuenta>("cuenta");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);

  const conSaldo = useMemo(
    () => cuentasConSaldoActual(cuentas, saldos),
    [cuentas, saldos],
  );
  const resumen = useMemo(() => calcularResumen(conSaldo), [conSaldo]);
  const serie = useMemo(() => calcularSerieTendencia(cuentas, saldos), [cuentas, saldos]);
  const grupos = useMemo(() => agruparPorTipo(conSaldo), [conSaldo]);

  async function onCrear(e: React.FormEvent) {
    e.preventDefault();
    const monto = parsearMiles(saldoInicial);
    if (!nombre.trim()) return setError("El nombre es obligatorio.");
    if (Number.isNaN(monto)) return setError("Escribe un saldo inicial.");

    setError(null);
    setPendiente(true);
    const r = await crearCuenta({ nombre, tipo, saldo: monto, fecha });
    setPendiente(false);
    if (!r.ok) return setError(r.error ?? "No se pudo crear la cuenta.");

    if (r.cuenta && r.registro) {
      setCuentas((prev) => [...prev, r.cuenta!]);
      setSaldos((prev) => [...prev, r.registro!]);
    }
    setNombre("");
    setSaldoInicial("");
    setFecha(hoy());
    setCreando(false);
  }

  async function onActualizarSaldo(cuentaId: string, d: DatosSaldo) {
    const r = await actualizarSaldo(cuentaId, d);
    if (r.ok && r.registro) setSaldos((prev) => [...prev, r.registro!]);
    return r;
  }

  async function onEditarCuenta(cuentaId: string, d: DatosEdicionCuenta) {
    const r = await editarCuenta(cuentaId, d);
    if (r.ok) {
      setCuentas((prev) =>
        prev.map((c) =>
          c.id === cuentaId ? { ...c, nombre: d.nombre.trim(), tipo: d.tipo } : c,
        ),
      );
    }
    return r;
  }

  async function onEliminarCuenta(cuentaId: string) {
    const r = await eliminarCuenta(cuentaId);
    if (r.ok) {
      setCuentas((prev) => prev.filter((c) => c.id !== cuentaId));
      setSaldos((prev) => prev.filter((s) => s.cuentaId !== cuentaId));
    }
    return r;
  }

  async function onEditarRegistro(saldoId: string, d: DatosSaldo) {
    const r = await editarSaldoRegistro(saldoId, d);
    if (r.ok) {
      setSaldos((prev) =>
        prev.map((s) => (s.id === saldoId ? { ...s, saldo: d.saldo, fecha: d.fecha } : s)),
      );
    }
    return r;
  }

  async function onEliminarRegistro(saldoId: string) {
    const r = await eliminarSaldoRegistro(saldoId);
    if (r.ok) setSaldos((prev) => prev.filter((s) => s.id !== saldoId));
    return r;
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Balance general
        </h1>
        <p className="text-sm text-gray-500">
          Lo que tienes y lo que te deben. Cada actualización queda en el historial.
        </p>
      </header>

      <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-banco-verde/30 bg-gradient-to-br from-banco-verde/5 to-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="shrink-0">
          <h2 className="text-sm font-semibold text-gray-700">Total</h2>
          <p className="mt-1 text-3xl font-bold text-banco-verde sm:text-4xl">
            {formatoCOP(resumen.total)}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-400">En cuentas</dt>
              <dd className="font-medium text-gray-700">
                {formatoCOP(resumen.totalCuentas)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Me deben</dt>
              <dd className="font-medium text-gray-700">
                {formatoCOP(resumen.totalPorCobrar)}
              </dd>
            </div>
          </dl>
        </div>
        {/* Ancho acotado: en pantallas anchas la serie se estiraba hasta quedar
            plana e ilegible. */}
        <div className="w-full min-w-0 lg:max-w-2xl lg:flex-1">
          <GraficoPatrimonio datos={serie} />
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">
          {conSaldo.length} {conSaldo.length === 1 ? "cuenta" : "cuentas"}
        </h2>
        <button
          type="button"
          onClick={() => {
            setCreando((v) => !v);
            setError(null);
          }}
          className="rounded-lg bg-banco-verde px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-95"
        >
          {creando ? "Cancelar" : "+ Nueva cuenta"}
        </button>
      </div>

      {creando && (
        <form
          onSubmit={onCrear}
          className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
              <span className="text-xs font-medium text-gray-500">Nombre</span>
              <input
                className={INPUT}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Bancolombia Ahorros, Juan Pérez…"
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
              <CampoMonto
                className={INPUT}
                valor={saldoInicial}
                onChange={setSaldoInicial}
              />
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
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pendiente}
            className="mt-4 rounded-lg bg-banco-verde px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            Agregar cuenta
          </button>
        </form>
      )}

      {conSaldo.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center text-sm text-gray-400">
          Aún no has agregado cuentas. Empieza con la cuenta donde tienes tu plata.
        </p>
      ) : (
        <div className="space-y-6">
          {(["cuenta", "por_cobrar"] as TipoCuenta[]).map((t) =>
            grupos[t].length === 0 ? null : (
              <section key={t}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {TITULO_GRUPO[t]}
                </h3>
                <ul className="space-y-3">
                  {grupos[t].map((c) => (
                    <FilaCuenta
                      key={c.id}
                      cuenta={c}
                      historial={historialDeCuenta(c.id, saldos)}
                      onActualizarSaldo={onActualizarSaldo}
                      onEditarCuenta={onEditarCuenta}
                      onEliminarCuenta={onEliminarCuenta}
                      onEditarRegistro={onEditarRegistro}
                      onEliminarRegistro={onEliminarRegistro}
                    />
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
