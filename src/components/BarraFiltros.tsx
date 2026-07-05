"use client";

import { etiquetaMes, type Filtros } from "@/lib/agregaciones";

interface Props {
  filtros: Filtros;
  meses: string[];
  comercios: string[];
  onChange: (f: Filtros) => void;
  onLimpiar: () => void;
}

const SELECT_CLS =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-banco-verde focus:outline-none focus:ring-1 focus:ring-banco-verde sm:w-auto";

// Presets de rango rápido por días (hasta hoy, hora Colombia local del navegador).
const PRESETS = [
  { label: "Hoy", dias: 0 },
  { label: "7 días", dias: 6 },
  { label: "30 días", dias: 29 },
  { label: "90 días", dias: 89 },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function fechaStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function hoyStr(): string {
  return fechaStr(new Date());
}
function hoyMenos(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return fechaStr(d);
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

export function BarraFiltros({ filtros, meses, comercios, onChange, onLimpiar }: Props) {
  const { periodo } = filtros;

  const periodoValue =
    periodo.tipo === "mes" ? `mes:${periodo.clave}` : periodo.tipo;

  function setPeriodo(v: string) {
    if (v === "todos") onChange({ ...filtros, periodo: { tipo: "todos" } });
    else if (v === "rango")
      onChange({ ...filtros, periodo: { tipo: "rango", desde: "", hasta: "" } });
    else onChange({ ...filtros, periodo: { tipo: "mes", clave: v.slice(4) } });
  }

  function aplicarPreset(dias: number) {
    onChange({
      ...filtros,
      periodo: { tipo: "rango", desde: hoyMenos(dias), hasta: hoyStr() },
    });
  }
  function presetActivo(dias: number): boolean {
    return (
      periodo.tipo === "rango" &&
      periodo.desde === hoyMenos(dias) &&
      periodo.hasta === hoyStr()
    );
  }

  return (
    <div className="-mx-4 mb-6 border-b border-gray-200 px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Campo label="Periodo">
          <select
            className={SELECT_CLS}
            value={periodoValue}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            {meses.map((m) => (
              <option key={m} value={`mes:${m}`}>
                {etiquetaMes(m)}
              </option>
            ))}
            <option value="todos">Todo el histórico</option>
            <option value="rango">Rango personalizado…</option>
          </select>
        </Campo>

        {periodo.tipo === "rango" && (
          <>
            <Campo label="Desde">
              <input
                type="date"
                className={SELECT_CLS}
                value={periodo.desde}
                onChange={(e) =>
                  onChange({
                    ...filtros,
                    periodo: { ...periodo, desde: e.target.value },
                  })
                }
              />
            </Campo>
            <Campo label="Hasta">
              <input
                type="date"
                className={SELECT_CLS}
                value={periodo.hasta}
                onChange={(e) =>
                  onChange({
                    ...filtros,
                    periodo: { ...periodo, hasta: e.target.value },
                  })
                }
              />
            </Campo>
          </>
        )}

        <Campo label="Categoría">
          <select
            className={SELECT_CLS}
            value={filtros.categoria}
            onChange={(e) =>
              onChange({ ...filtros, categoria: e.target.value as Filtros["categoria"] })
            }
          >
            <option value="todas">Todas</option>
            <option value="Transporte">Transporte</option>
            <option value="Otros">Otros</option>
          </select>
        </Campo>

        <Campo label="Método">
          <select
            className={SELECT_CLS}
            value={filtros.metodo}
            onChange={(e) =>
              onChange({ ...filtros, metodo: e.target.value as Filtros["metodo"] })
            }
          >
            <option value="todos">Todos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
          </select>
        </Campo>

        <Campo label="Comercio">
          <select
            className={SELECT_CLS}
            value={filtros.comercio}
            onChange={(e) => onChange({ ...filtros, comercio: e.target.value })}
          >
            <option value="todos">Todos</option>
            {comercios.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Campo>

        <button
          type="button"
          onClick={onLimpiar}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 sm:ml-auto"
        >
          Limpiar
        </button>
      </div>

      {/* Rango rápido por días */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-gray-400">Rápido:</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => aplicarPreset(p.dias)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              presetActivo(p.dias)
                ? "border-banco-verde bg-banco-verde/10 text-banco-verde"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
