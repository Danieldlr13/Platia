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

  return (
    <div className="sticky top-0 z-10 -mx-3 mb-6 border-b border-gray-200 bg-gray-50/90 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4">
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
    </div>
  );
}
