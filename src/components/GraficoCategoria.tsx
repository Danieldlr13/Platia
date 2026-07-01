"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { formatoCOP, type GastoCategoria } from "@/lib/agregaciones";

const COLORES: Record<string, string> = {
  Transporte: "#00C389",
  Otros: "#CBD5E1",
};

export function GraficoCategoria({ datos }: { datos: GastoCategoria[] }) {
  const conDatos = datos.filter((d) => d.monto > 0);

  if (conDatos.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-gray-400">
        Sin gastos este mes.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={conDatos}
          dataKey="monto"
          nameKey="categoria"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {conDatos.map((d) => (
            <Cell key={d.categoria} fill={COLORES[d.categoria] ?? "#94A3B8"} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatoCOP(v)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
