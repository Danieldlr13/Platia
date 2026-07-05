"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { etiquetaMes, formatoCOP, type ResumenMes } from "@/lib/agregaciones";

// Etiqueta corta ($Xk) sobre cada segmento; vacía si el valor es 0.
const fmtK = (v: number): string => (v > 0 ? `$${Math.round(v / 1000)}k` : "");

export function GraficoTendencia({ datos }: { datos: ResumenMes[] }) {
  const filas = datos.map((d) => ({
    mes: etiquetaMes(d.clave),
    Transporte: d.transporte,
    Otros: d.otros,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={filas}
        margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
        barCategoryGap="28%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 12, fill: "#6B7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          width={46}
          tickFormatter={(v: number) => `$${(v / 1000).toLocaleString("es-CO")}k`}
        />
        <Tooltip
          formatter={(v: number) => formatoCOP(v)}
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
        />
        <Legend iconType="circle" />
        {/* stroke blanco = separación de 2px entre segmentos y barras */}
        <Bar
          dataKey="Transporte"
          stackId="a"
          fill="#00C389"
          stroke="#fff"
          strokeWidth={2}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="Transporte"
            position="center"
            formatter={fmtK}
            fill="#fff"
            style={{ fontSize: 10, fontWeight: 600 }}
          />
        </Bar>
        <Bar
          dataKey="Otros"
          stackId="a"
          fill="#94A3B8"
          stroke="#fff"
          strokeWidth={2}
          radius={[6, 6, 0, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="Otros"
            position="center"
            formatter={fmtK}
            fill="#fff"
            style={{ fontSize: 10, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
