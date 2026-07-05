"use client";

import { Donut } from "./Donut";
import type { GastoCategoria } from "@/lib/agregaciones";

const COLOR: Record<string, string> = {
  Transporte: "#00C389",
  Otros: "#94A3B8",
};

export function GraficoCategoria({ datos }: { datos: GastoCategoria[] }) {
  return (
    <Donut
      datos={datos.map((d) => ({
        nombre: d.categoria,
        monto: d.monto,
        color: COLOR[d.categoria] ?? "#94A3B8",
      }))}
    />
  );
}
