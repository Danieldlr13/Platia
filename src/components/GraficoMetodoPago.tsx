"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { formatoCOP, type MetodoAgrupado } from "@/lib/agregaciones";

const COLOR: Record<string, string> = {
  Efectivo: "#F59E0B",
  Tarjeta: "#3B82F6",
};

export function GraficoMetodoPago({ datos }: { datos: MetodoAgrupado[] }) {
  if (datos.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-gray-400">
        Sin movimientos en la selección.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={datos}
          dataKey="monto"
          nameKey="metodo"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={2}
          isAnimationActive={false}
        >
          {datos.map((d) => (
            <Cell key={d.metodo} fill={COLOR[d.metodo] ?? "#94A3B8"} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatoCOP(v)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
