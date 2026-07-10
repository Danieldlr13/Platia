"use client";

import { Donut } from "./Donut";
import { colorPorIndice } from "@/lib/colores";
import type { GastoCategoria } from "@/lib/agregaciones";

export function GraficoCategoria({
  datos,
  colores,
}: {
  datos: GastoCategoria[];
  /** Mapa nombre de categoría → color. */
  colores: Record<string, string>;
}) {
  return (
    <Donut
      datos={datos.map((d, i) => ({
        nombre: d.categoria,
        monto: d.monto,
        color: colores[d.categoria] ?? colorPorIndice(i),
      }))}
    />
  );
}
