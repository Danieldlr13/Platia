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
import type { Categoria, CategoriaInfo } from "@/lib/types";
import { actualizarCategoria, eliminarTransaccion } from "@/lib/acciones";
import { editarMovimiento } from "@/lib/gastos-acciones";
import { instanteBogota, type DatosMovimiento } from "@/lib/gastos-tipos";
import { BarraFiltros } from "./BarraFiltros";
import { TarjetaKPI } from "./TarjetaKPI";
import { GraficoCategoria } from "./GraficoCategoria";
import { GraficoTendencia } from "./GraficoTendencia";
import { GraficoTopComercios } from "./GraficoTopComercios";
import { GraficoMetodoPago } from "./GraficoMetodoPago";
import { ListaTransacciones } from "./ListaTransacciones";
import { ModalGastos } from "./ModalGastos";

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
  categoriasIniciales,
}: {
  txsIniciales: TxUI[];
  categoriasIniciales: CategoriaInfo[];
}) {
  const [txs, setTxs] = useState(txsIniciales);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [, startTransition] = useTransition();

  // Las categorías se administran en /categorias; aquí solo se leen (filtros,
  // colores del donut y el selector de cada movimiento).
  const categorias = categoriasIniciales;
  const nombresCategorias = useMemo(
    () => categorias.map((c) => c.nombre),
    [categorias],
  );
  const coloresCategorias = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.nombre, c.color])),
    [categorias],
  );

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

  // Mutadores del estado de transacciones, para el modal de gastos manuales.
  // Al tocar `txs`, los KPIs, gráficos y la tabla se recalculan solos.
  function upsertTx(tx: TxUI) {
    setTxs((prev) =>
      prev.some((t) => t.id === tx.id)
        ? prev.map((t) => (t.id === tx.id ? tx : t))
        : [tx, ...prev],
    );
  }
  function removeTx(id: string) {
    setTxs((prev) => prev.filter((t) => t.id !== id));
  }

  // Edita un movimiento completo (venga del banco o anotado a mano).
  async function onEditarMovimiento(id: string, d: DatosMovimiento) {
    const r = await editarMovimiento(id, d);
    if (r.ok) {
      setTxs((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                comercio: d.comercio.trim(),
                monto: d.monto,
                categoria: d.categoria,
                fecha: instanteBogota(d.fecha, d.hora),
                tarjeta: d.metodo ?? t.tarjeta,
                editado: true,
              }
            : t,
        ),
      );
    }
    return r;
  }

  // Elimina un movimiento (p. ej. un cobro duplicado): optimista + revert.
  function eliminarTx(id: string) {
    const tx = txs.find((t) => t.id === id);
    removeTx(id);
    startTransition(async () => {
      const r = await eliminarTransaccion(id);
      if (!r.ok && tx) upsertTx(tx);
    });
  }

  const gastosManuales = useMemo(
    () =>
      txs
        .filter((t) => t.esManual)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [txs],
  );

  const subtitulo =
    filtros.periodo.tipo === "mes"
      ? etiquetaMes(filtros.periodo.clave)
      : filtros.periodo.tipo === "rango"
        ? "rango personalizado"
        : "todo el histórico";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Mis gastos
          </h1>
          <p className="text-sm text-gray-500">Mostrando {subtitulo}</p>
        </div>
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="rounded-lg bg-banco-verde px-3 py-1.5 text-sm font-medium text-white hover:brightness-95"
        >
          + Gasto
        </button>
      </header>

      <BarraFiltros
        filtros={filtros}
        meses={meses}
        comercios={comercios}
        categorias={nombresCategorias}
        onChange={setFiltros}
        onLimpiar={() => setFiltros(filtrosIniciales)}
      />

      {/* KPIs */}
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaKPI
          titulo="Gasto total"
          monto={kpis.total}
          comparacion={kpisPrev ? { anterior: kpisPrev.total } : undefined}
        />
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
          titulo="Movimientos"
          monto={kpis.conteo}
          formato="numero"
          comparacion={kpisPrev ? { anterior: kpisPrev.conteo } : undefined}
        />
      </section>

      {/* Gráficos — items-start: cada tarjeta toma su alto natural (si no, la
          tarjeta más corta se estira para igualar a su vecina más alta y deja
          un hueco vacío, p. ej. Tendencia vs. Top comercios con muchas filas). */}
      {/* 2 columnas desde xl (no lg): con el sidebar ocupando 256px, a 1024px
          cada tarjeta quedaría tan angosta que el donut y su leyenda se salen. */}
      <section className="mb-6 grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Tarjeta titulo="Gasto por categoría">
          <GraficoCategoria datos={datosCategoria} colores={coloresCategorias} />
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
        <ListaTransacciones
          txs={lista}
          categorias={nombresCategorias}
          onCambiarCategoria={cambiarCategoria}
          onEliminar={eliminarTx}
          onEditar={onEditarMovimiento}
        />
      </section>

      <footer className="mt-8 text-center text-xs text-gray-400">
        Platia · gastos de Bancolombia
      </footer>

      <ModalGastos
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        gastos={gastosManuales}
        categorias={nombresCategorias}
        upsertTx={upsertTx}
        removeTx={removeTx}
      />
    </div>
  );
}
