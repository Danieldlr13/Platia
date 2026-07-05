"use client";

import {
  PieChart,
  Pie,
  Cell,
  Label,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatoCOP } from "@/lib/agregaciones";

export interface SegmentoDonut {
  nombre: string;
  monto: number;
  color: string;
}

const RAD = Math.PI / 180;

// Etiqueta blanca con el nombre de la categoría CURVADA sobre el arco del
// segmento (sigue el donut, no horizontal, para que no se corte). Se omite en
// porciones muy pequeñas. En la mitad inferior invierte el arco para que el
// texto no quede de cabeza.
function EtiquetaSegmento(props: {
  cx: number;
  cy: number;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
  index: number;
}) {
  const { cx, cy, startAngle, endAngle, innerRadius, outerRadius, percent, name, index } =
    props;
  if (percent < 0.08) return <g />;

  const r = innerRadius + (outerRadius - innerRadius) / 2;
  const mid = (startAngle + endAngle) / 2;
  const abajo = Math.sin(-mid * RAD) > 0; // el punto medio cae en la mitad inferior

  const desde = abajo ? endAngle : startAngle;
  const hasta = abajo ? startAngle : endAngle;
  const x0 = cx + r * Math.cos(-desde * RAD);
  const y0 = cy + r * Math.sin(-desde * RAD);
  const x1 = cx + r * Math.cos(-hasta * RAD);
  const y1 = cy + r * Math.sin(-hasta * RAD);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const sweep = abajo ? 1 : 0;
  const id = `donut-arc-${name.replace(/\s+/g, "")}-${index}`;

  return (
    <g style={{ pointerEvents: "none" }}>
      <path
        id={id}
        d={`M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} ${sweep} ${x1} ${y1}`}
        fill="none"
      />
      <text style={{ fontSize: 11, fontWeight: 700, fill: "#fff" }}>
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {name}
        </textPath>
      </text>
    </g>
  );
}

/**
 * Donut con el total al centro y una leyenda inferior que muestra monto y % de
 * cada segmento (la identidad nunca depende solo del color).
 */
export function Donut({ datos }: { datos: SegmentoDonut[] }) {
  const conDatos = datos.filter((d) => d.monto > 0);
  const total = conDatos.reduce((a, d) => a + d.monto, 0);

  if (conDatos.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-sm text-gray-400">
        Sin datos en la selección.
      </p>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie
            data={conDatos}
            dataKey="monto"
            nameKey="nombre"
            innerRadius={62}
            outerRadius={95}
            paddingAngle={2}
            cornerRadius={6}
            stroke="none"
            isAnimationActive={false}
            label={EtiquetaSegmento as never}
            labelLine={false}
          >
            {conDatos.map((d) => (
              <Cell key={d.nombre} fill={d.color} />
            ))}
            <Label
              position="center"
              content={(props: any) => {
                const cx = props?.viewBox?.cx ?? 0;
                const cy = props?.viewBox?.cy ?? 0;
                return (
                  <text x={cx} y={cy} textAnchor="middle">
                    <tspan
                      x={cx}
                      dy="-0.2em"
                      style={{ fontSize: 17, fontWeight: 700, fill: "#111827" }}
                    >
                      {formatoCOP(total)}
                    </tspan>
                    <tspan x={cx} dy="1.5em" style={{ fontSize: 11, fill: "#9CA3AF" }}>
                      Total
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
          <Tooltip formatter={(v: number) => formatoCOP(v)} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="mt-2 space-y-1.5">
        {conDatos.map((d) => {
          const pct = total > 0 ? Math.round((d.monto / total) * 100) : 0;
          return (
            <li key={d.nombre} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: d.color }}
              />
              <span className="text-gray-600">{d.nombre}</span>
              <span className="ml-auto font-semibold text-gray-900">
                {formatoCOP(d.monto)}
              </span>
              <span className="w-9 text-right text-xs text-gray-400">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
