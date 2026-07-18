"use client";

import { formatoCOP } from "@/lib/agregaciones";
import type { ResumenPatrimonio, PuntoTendencia } from "@/lib/patrimonio-agregaciones";
import { GraficoPatrimonio } from "./GraficoPatrimonio";

interface Props {
  resumen: ResumenPatrimonio;
  serie: PuntoTendencia[];
  onGestionar: () => void;
}

export function BalanceGeneral({ resumen, serie, onGestionar }: Props) {
  return (
    <section className="mb-6 rounded-2xl border border-banco-verde/30 bg-gradient-to-br from-banco-verde/5 to-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700">Balance general</h2>
            <button
              type="button"
              onClick={onGestionar}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Gestionar cuentas
            </button>
          </div>
          <p className="mt-1 text-3xl font-bold text-banco-verde sm:text-4xl">
            {formatoCOP(resumen.total)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            En cuentas {formatoCOP(resumen.totalCuentas)}
            {resumen.totalPorCobrar > 0 && (
              <> · Me deben {formatoCOP(resumen.totalPorCobrar)}</>
            )}
          </p>
        </div>

        <div className="w-full sm:max-w-md sm:flex-1">
          <GraficoPatrimonio datos={serie} />
        </div>
      </div>
    </section>
  );
}
