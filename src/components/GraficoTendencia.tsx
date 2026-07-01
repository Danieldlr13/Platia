"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  etiquetaMes,
  formatoCOP,
  type ResumenMes,
} from "@/lib/agregaciones";

export function GraficoTendencia({ datos }: { datos: ResumenMes[] }) {
  const filas = datos.map((d) => ({
    mes: etiquetaMes(d.clave),
    Transporte: d.transporte,
    Otros: d.otros,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={filas} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `$${(v / 1000).toLocaleString("es-CO")}k`}
        />
        <Tooltip formatter={(v: number) => formatoCOP(v)} />
        <Legend />
        <Bar dataKey="Transporte" stackId="a" fill="#00C389" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Otros" stackId="a" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
