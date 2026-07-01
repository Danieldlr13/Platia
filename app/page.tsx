import { obtenerTransacciones } from "@/lib/datos";
import {
  tendenciaMensual,
  gastoPorCategoria,
  transaccionesDelMes,
  mesMasReciente,
  mesAnterior,
  etiquetaMes,
  type ResumenMes,
} from "@/lib/agregaciones";
import { TarjetaKPI } from "@/components/TarjetaKPI";
import { GraficoCategoria } from "@/components/GraficoCategoria";
import { GraficoTendencia } from "@/components/GraficoTendencia";
import { ListaTransacciones } from "@/components/ListaTransacciones";

// Se renderiza en cada petición para reflejar siempre los datos actuales de
// Supabase (si fuera estático, mostraría los datos del momento del build).
export const dynamic = "force-dynamic";

function buscarMes(tendencia: ResumenMes[], clave: string): ResumenMes {
  return (
    tendencia.find((m) => m.clave === clave) ?? {
      clave,
      total: 0,
      transporte: 0,
      otros: 0,
    }
  );
}

export default async function Panel() {
  const { txs, modo } = await obtenerTransacciones();

  const tendencia = tendenciaMensual(txs);
  const claveActual = mesMasReciente(txs);
  const clavePrev = mesAnterior(claveActual);

  const actual = buscarMes(tendencia, claveActual);
  const previo = buscarMes(tendencia, clavePrev);

  const porCategoria = gastoPorCategoria(txs, claveActual);
  const delMes = transaccionesDelMes(txs, claveActual);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Encabezado */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Mis gastos
          </h1>
          <p className="text-sm text-gray-500">
            Resumen de {etiquetaMes(claveActual)}
          </p>
        </div>
        {modo === "demo" && (
          <span className="rounded-full bg-banco-amarillo/30 px-3 py-1 text-xs font-medium text-banco-oscuro">
            Datos de demostración
          </span>
        )}
      </header>

      {/* KPIs */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TarjetaKPI
          titulo="Gasto en transporte"
          monto={actual.transporte}
          destacado
          comparacion={{ anterior: previo.transporte }}
        />
        <TarjetaKPI
          titulo="Otros gastos"
          monto={actual.otros}
          comparacion={{ anterior: previo.otros }}
        />
        <TarjetaKPI
          titulo="Gasto total"
          monto={actual.total}
          comparacion={{ anterior: previo.total }}
        />
      </section>

      {/* Gráficos */}
      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Gasto por categoría
          </h2>
          <GraficoCategoria datos={porCategoria} />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Tendencia mensual
          </h2>
          <GraficoTendencia datos={tendencia} />
        </div>
      </section>

      {/* Lista */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <h2 className="border-b border-gray-100 px-4 py-4 text-sm font-semibold text-gray-700">
          Movimientos de {etiquetaMes(claveActual)}
        </h2>
        <ListaTransacciones inicial={delMes} />
      </section>

      <footer className="mt-8 text-center text-xs text-gray-400">
        CUENTAS · gastos de Bancolombia
      </footer>
    </main>
  );
}
