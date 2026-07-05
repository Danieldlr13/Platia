"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { formatoCOP, type ComercioAgrupado } from "@/lib/agregaciones";

// Color por categoría del comercio (verde = transporte, gris = resto).
const COLOR: Record<string, string> = {
  Transporte: "#00C389",
  Otros: "#94A3B8",
};

function recortar(nombre: string): string {
  return nombre.length > 16 ? `${nombre.slice(0, 15)}…` : nombre;
}

export function GraficoTopComercios({ datos }: { datos: ComercioAgrupado[] }) {
  if (datos.length === 0) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-gray-400">
        Sin comercios en la selección.
      </p>
    );
  }

  const alto = Math.max(160, datos.length * 40 + 16);

  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart
        data={datos}
        layout="vertical"
        margin={{ top: 4, right: 72, left: 4, bottom: 4 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="comercio"
          width={104}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={recortar}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          formatter={(
            v: number,
            _n: string,
            item: { payload?: ComercioAgrupado },
          ): [string, string] => [
            formatoCOP(v),
            `${item.payload?.conteo ?? 0} mov.`,
          ]}
        />
        <Bar dataKey="monto" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={false}>
          {datos.map((d, i) => (
            <Cell key={i} fill={COLOR[d.categoria] ?? "#94A3B8"} />
          ))}
          <LabelList
            dataKey="monto"
            position="right"
            formatter={(v: number) => formatoCOP(v)}
            fill="#4B5563"
            style={{ fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
