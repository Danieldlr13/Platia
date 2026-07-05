"use client";

import { Donut } from "./Donut";
import type { MetodoAgrupado } from "@/lib/agregaciones";

const COLOR: Record<string, string> = {
  Efectivo: "#F59E0B",
  Tarjeta: "#3B82F6",
};

export function GraficoMetodoPago({ datos }: { datos: MetodoAgrupado[] }) {
  return (
    <Donut
      datos={datos.map((d) => ({
        nombre: d.metodo,
        monto: d.monto,
        color: COLOR[d.metodo] ?? "#94A3B8",
      }))}
    />
  );
}
