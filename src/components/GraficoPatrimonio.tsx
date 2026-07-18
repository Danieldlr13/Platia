"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatoCOP } from "@/lib/agregaciones";
import type { PuntoTendencia } from "@/lib/patrimonio-agregaciones";

const FECHA_CORTA = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Bogota",
});

// Los saldos de patrimonio suelen ser mucho más grandes que los gastos (a
// veces en millones): usa "M" cuando corresponde para que la etiqueta no se
// corte en el eje.
function formatoCorto(v: number): string {
  if (Math.abs(v) >= 1_000_000) {
    return `$${(v / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })}M`;
  }
  return `$${Math.round(v / 1000).toLocaleString("es-CO")}k`;
}

export function GraficoPatrimonio({ datos }: { datos: PuntoTendencia[] }) {
  if (datos.length < 2) {
    return (
      <p className="flex h-32 items-center justify-center text-center text-sm text-gray-400">
        La tendencia aparecerá cuando tengas más de una actualización.
      </p>
    );
  }

  const filas = datos.map((d) => ({
    fecha: FECHA_CORTA.format(new Date(`${d.fecha}T12:00:00`)),
    total: d.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={filas} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="patrimonioFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C389" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#00C389" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
        <XAxis
          dataKey="fecha"
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={formatoCorto}
        />
        <Tooltip
          formatter={(v: number) => formatoCOP(v)}
          cursor={{ stroke: "#00C389", strokeWidth: 1, strokeDasharray: "3 3" }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#00C389"
          strokeWidth={2}
          fill="url(#patrimonioFill)"
          dot={{ r: 3, fill: "#00C389", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
