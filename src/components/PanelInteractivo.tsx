"use client";

import { useMemo, useState, useTransition } from "react";
import {
  filtrar,
  calcularKPIs,
  porCategoria,
  topComercios,
  porMetodoPago,
  tendenciaMensual,
  mesesDisponibles,
  comerciosDisponibles,
  mesAnterior,
  etiquetaMes,
  type Filtros,
} from "@/lib/agregaciones";
import type { TxUI } from "@/lib/demo-data";
import type { Categoria } from "@/lib/types";
import { actualizarCategoria } from "@/lib/acciones";
import { BarraFiltros } from "./BarraFiltros";
import { TarjetaKPI } from "./TarjetaKPI";
import { GraficoCategoria } from "./GraficoCategoria";
import { GraficoTendencia } from "./GraficoTendencia";
import { GraficoTopComercios } from "./GraficoTopComercios";
import { GraficoMetodoPago } from "./GraficoMetodoPago";
import { ListaTransacciones } from "./ListaTransacciones";

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{titulo}</h2>
      {children}
    </div>
  );
}

export function PanelInteractivo({
  txsIniciales,
  modo,
}: {
  txsIniciales: TxUI[];
  modo: "supabase" | "demo";
}) {
  const [txs, setTxs] = useState(txsIniciales);
  const [, startTransition] = useTransition();

  const meses = useMemo(() => mesesDisponibles(txs), [txs]);
  const comercios = useMemo(() => comerciosDisponibles(txs), [txs]);

  const filtrosIniciales = useMemo<Filtros>(
    () => ({
      periodo: meses[0] ? { tipo: "mes", clave: meses[0] } : { tipo: "todos" },
      categoria: "todas",
      metodo: "todos",
      comercio: "todos",
    }),
    // Solo depende del primer render (meses no cambia salvo edición de categoría).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciales);

  const txsFiltradas = useMemo(() => filtrar(txs, filtros), [txs, filtros]);
  const kpis = useMemo(() => calcularKPIs(txsFiltradas), [txsFiltradas]);
  const kpisPrev = useMemo(() => {
    if (filtros.periodo.tipo !== "mes") return null;
    const prev = filtrar(txs, {
      ...filtros,
      periodo: { tipo: "mes", clave: mesAnterior(filtros.periodo.clave) },
    });
    return calcularKPIs(prev);
  }, [txs, filtros]);

  const datosCategoria = useMemo(() => porCategoria(txsFiltradas), [txsFiltradas]);
  const datosTop = useMemo(() => topComercios(txsFiltradas), [txsFiltradas]);
  const datosMetodo = useMemo(() => porMetodoPago(txsFiltradas), [txsFiltradas]);
  // La tendencia respeta todos los filtros salvo el periodo, para ver la evolución.
  const datosTendencia = useMemo(
    () => tendenciaMensual(filtrar(txs, { ...filtros, periodo: { tipo: "todos" } })),
    [txs, filtros],
  );
  const lista = useMemo(
    () => [...txsFiltradas].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [txsFiltradas],
  );

  function cambiarCategoria(id: string, categoria: Categoria) {
    setTxs((prev) => prev.map((t) => (t.id === id ? { ...t, categoria } : t)));
    startTransition(async () => {
      await actualizarCategoria(id, categoria);
    });
  }

  const subtitulo =
    filtros.periodo.tipo === "mes"
      ? etiquetaMes(filtros.periodo.clave)
      : filtros.periodo.tipo === "rango"
        ? "rango personalizado"
        : "todo el histórico";

  return (
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Mis gastos
          </h1>
          <p className="text-sm text-gray-500">Mostrando {subtitulo}</p>
        </div>
        {modo === "demo" && (
          <span className="rounded-full bg-banco-amarillo/30 px-3 py-1 text-xs font-medium text-banco-oscuro">
            Datos de demostración
          </span>
        )}
      </header>

      <BarraFiltros
        filtros={filtros}
        meses={meses}
        comercios={comercios}
        onChange={setFiltros}
        onLimpiar={() => setFiltros(filtrosIniciales)}
      />

      {/* KPIs */}
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaKPI
          titulo="Transporte"
          monto={kpis.transporte}
          destacado
          comparacion={kpisPrev ? { anterior: kpisPrev.transporte } : undefined}
        />
        <TarjetaKPI
          titulo="Otros gastos"
          monto={kpis.otros}
          comparacion={kpisPrev ? { anterior: kpisPrev.otros } : undefined}
        />
        <TarjetaKPI
          titulo="Gasto total"
          monto={kpis.total}
          comparacion={kpisPrev ? { anterior: kpisPrev.total } : undefined}
        />
        <TarjetaKPI
          titulo="Movimientos"
          monto={kpis.conteo}
          formato="numero"
          comparacion={kpisPrev ? { anterior: kpisPrev.conteo } : undefined}
        />
      </section>

      {/* Gráficos */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Gasto por categoría">
          <GraficoCategoria datos={datosCategoria} />
        </Tarjeta>
        <Tarjeta titulo="Método de pago">
          <GraficoMetodoPago datos={datosMetodo} />
        </Tarjeta>
        <Tarjeta titulo="Tendencia mensual">
          <GraficoTendencia datos={datosTendencia} />
        </Tarjeta>
        <Tarjeta titulo="Top comercios">
          <GraficoTopComercios datos={datosTop} />
        </Tarjeta>
      </section>

      {/* Tabla */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <h2 className="flex items-center justify-between border-b border-gray-100 px-4 py-4 text-sm font-semibold text-gray-700">
          <span>Movimientos</span>
          <span className="text-xs font-normal text-gray-400">
            {lista.length} {lista.length === 1 ? "movimiento" : "movimientos"}
          </span>
        </h2>
        <ListaTransacciones txs={lista} onCambiarCategoria={cambiarCategoria} />
      </section>

      <footer className="mt-8 text-center text-xs text-gray-400">
        CUENTAS · gastos de Bancolombia
      </footer>
    </main>
  );
}
