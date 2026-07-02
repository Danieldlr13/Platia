# Dashboard con filtros y agrupaciones — Diseño

Fecha: 2026-07-02

## Objetivo

Afinar el panel web para que deje de estar clavado al "mes más reciente" y
permita **filtrar** y **agrupar** los gastos, con un dashboard visual, totalmente
funcional y **responsive** (móvil primero). Prioridad del cliente: entender el
gasto en **transporte**.

## Alcance (acordado)

Filtrar y agrupar por: **periodo** (mes o rango), **comercio** y **método de
pago** (efectivo vs tarjeta). La categoría (Transporte/Otros) también filtra.
El selector de categoría en la tabla **persiste** en Supabase. Layout de una sola
vista con barra de filtros. (Filtro por tarjeta queda fuera; fácil de sumar.)

## Arquitectura

- `app/page.tsx` (Server Component): sigue leyendo **todas** las transacciones de
  Supabase (o demo) y las pasa a un contenedor cliente.
- `src/components/PanelInteractivo.tsx` (Client Component): mantiene el estado de
  los filtros y recalcula todas las agregaciones con `useMemo`. El volumen es
  pequeño (decenas/cientos de tx), así que filtrar/agrupar en el cliente es
  instantáneo y sin round-trips.
- Las agregaciones viven en `src/lib/agregaciones.ts` como **funciones puras**
  (testeables). La UI no calcula, solo pinta.

## Modelo de filtros

```ts
type MetodoPago = "Efectivo" | "Tarjeta";

interface Filtros {
  periodo:
    | { tipo: "mes"; clave: string }        // "2026-06"
    | { tipo: "rango"; desde: string; hasta: string } // "YYYY-MM-DD"
    | { tipo: "todos" };
  categoria: Categoria | "todas";
  metodo: MetodoPago | "todos";
  comercio: string | "todos";
}
```

Los filtros se combinan con AND. Estado inicial: periodo = mes más reciente,
resto en "todos"/"todas".

## Funciones nuevas en `agregaciones.ts` (con tests)

- `esEfectivo(tarjeta): boolean` — `/efectivo|cash/i`.
- `metodoPago(tarjeta): MetodoPago`.
- `diaLocalCO(fechaIso): string` — "YYYY-MM-DD" en hora Colombia (para rangos).
- `filtrar(txs, filtros): TxUI[]` — aplica todos los filtros.
- `topComercios(txs, n?): { comercio; monto; conteo; categoria }[]` — agrupado y
  ordenado desc; los que sobran del top-N se pliegan en "Otros comercios".
- `porMetodoPago(txs): { metodo; monto; conteo }[]`.
- `mesesDisponibles(txs): string[]` — claves de mes presentes, desc (selector).
- `comerciosDisponibles(txs): string[]` — comercios presentes, alfabético.
- Se conservan las existentes (tendenciaMensual, gastoPorCategoria, etc.).

Comparación en KPIs: vs **mes anterior** solo cuando el periodo es "mes"; en
"rango"/"todos" se oculta la comparación (evita comparaciones sin sentido).

## Componentes

- `BarraFiltros.tsx` — controles: periodo (select de meses + toggle "Rango" con
  dos `date`), categoría, método, comercio; botón "Limpiar". Sticky arriba.
- `PanelInteractivo.tsx` — estado + orquestación + persistencia de categoría.
- `GraficoTopComercios.tsx` — barras horizontales (magnitud por comercio),
  coloreadas por categoría del comercio. Etiquetas de valor al final de cada barra.
- `GraficoMetodoPago.tsx` — dona pequeña Efectivo vs Tarjeta.
- Reutilizados: `GraficoCategoria`, `GraficoTendencia`, `TarjetaKPI`,
  `ListaTransacciones` (ahora con callback de cambio de categoría que persiste).

## KPIs

Transporte (destacado), Otros, Total, **# de movimientos** (nuevo). Reaccionan a
los filtros. `grid-cols-2` en móvil, `lg:grid-cols-4` en escritorio.

## Persistencia de categoría

`app/actions.ts` → server action `actualizarCategoria(id, categoria)`:
- Resuelve `categoria_id` del usuario (vía `obtenerCategorias`).
- `UPDATE transacciones SET categoria_id=…, categoria_manual=true WHERE id AND user_id`.
- En modo demo (sin Supabase) es no-op y devuelve ok, para que la UI siga
  funcionando. Update optimista en el cliente.

## Color (validado con el script de dataviz)

- Categoría: **Transporte `#00C389`** (verde marca, la estrella) / **Otros
  `#94A3B8`** (gris "resto", deliberadamente apagado). CVD ΔE≈35 (ok). El chroma
  bajo de Otros es intencional (bucket resto); se acompaña de leyenda + etiquetas
  directas + tabla como codificación secundaria.
- Método: **Efectivo `#F59E0B`** / **Tarjeta `#3B82F6`** — todos los checks pasan.
- Los WARN de contraste del verde/ámbar sobre blanco se cubren con etiquetas de
  valor visibles y la vista de tabla (nunca color solo).

## Responsive (requisito de primera clase)

- Contenedor `max-w-6xl px-3 sm:px-4 py-6`.
- Barra de filtros: `flex flex-col gap-2` en móvil (controles a ancho completo),
  `sm:flex-row sm:flex-wrap sm:items-end` en pantallas mayores. Sticky con
  `backdrop-blur`.
- KPIs: `grid-cols-2 lg:grid-cols-4`.
- Gráficos: `grid-cols-1 lg:grid-cols-2`; Top comercios a ancho completo
  (`lg:col-span-2`). Alturas fijas + `ResponsiveContainer` de Recharts.
- Tabla: `overflow-x-auto` en móvil; se ocultan columnas secundarias
  (`hidden sm:table-cell`) para que no reviente el ancho.
- Objetivos táctiles ≥40px en selects/botones.

## Interacción (dataviz)

Tooltips por defecto en todos los gráficos (Recharts los provee). Leyenda siempre
para ≥2 series. Filtros en una fila por encima de los gráficos.

## Testing

- Tests unitarios de las funciones puras nuevas (`filtrar`, `topComercios`,
  `porMetodoPago`, `esEfectivo`, `diaLocalCO`) en `test/agregaciones.test.ts`.
- Verificación manual: `npm run build` + `npm run dev`, captura a 1280px y 390px.

## Fuera de alcance (YAGNI)

Filtro por tarjeta, subcategorías de transporte, export CSV, multiselección de
comercios, modo oscuro. Anotados como extensiones fáciles.
```
