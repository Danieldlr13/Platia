# Sidebar y reforma de diseño del panel

Fecha: 2026-07-30

## Problema

El panel es una sola página (`/`) que carga todo: KPIs, cuatro gráficos, la tabla de
movimientos y, encima, el bloque de Balance general. Categorías, gastos manuales y
cuentas viven en modales lanzados desde botones apretujados en el header.

Eso trae tres problemas:

1. **No hay navegación.** El header acumula botones (`+ Gasto`, `Categorías`, `Guía`,
   correo, `Salir`) y no comunica qué secciones existen.
2. **Los modales no dan espacio.** El CRUD de cuentas necesita mostrar el historial
   completo de cada cuenta con edición por registro; eso no cabe en un diálogo de
   `max-w-lg` con scroll interno.
3. **La página `/` hace demasiado.** `PanelInteractivo.tsx` sostiene el estado de
   transacciones, categorías y patrimonio a la vez.

## Solución

Sidebar de navegación con cuatro secciones, cada una su propia ruta. Los modales de
Categorías y Cuentas se convierten en páginas.

### Rutas

```
app/
  layout.tsx              sin cambios (<html>, metadata, globals.css)
  login/page.tsx          sin cambios — fuera del sidebar
  (app)/                  route group: no aparece en la URL
    layout.tsx            NUEVO — lee la sesión y envuelve en <SidebarShell>
    page.tsx              Gastos (dashboard actual), URL "/"
    balance/page.tsx      NUEVO — "/balance"
    categorias/page.tsx   NUEVO — "/categorias"
    guia/page.tsx         se muda desde app/guia/, misma URL "/guia"
```

`/login` queda fuera de `(app)`, así que no dibuja sidebar.

### Sidebar

`src/components/SidebarShell.tsx` (cliente). Recibe `{modo, email, children}`.

- **Desktop (`lg:` ≥1024px):** columna fija de 240px a la izquierda, contenido a la
  derecha.
- **Móvil:** el sidebar se oculta; una barra superior con botón `☰` lo abre como
  drawer superpuesto (overlay oscuro, cierra con Escape, click fuera o al elegir un
  ítem). Mismo patrón de cierre que los modales actuales.
- **Ítems:** Gastos `/`, Balance `/balance`, Categorías `/categorias`, Guía `/guia`.
  El activo se resalta comparando con `usePathname()`.
- **Pie:** badge "Datos de demostración" cuando `modo === "demo"`, correo del usuario
  y botón Salir (`cerrarSesion`).
- **Iconos:** SVG inline. No se añade ninguna dependencia.

### Datos

`(app)/layout.tsx` necesita solo `{modo, email}` — no debe cargar transacciones para
dibujar el sidebar. Se añade `src/lib/sesion.ts`:

```ts
export interface Sesion { modo: "supabase" | "demo"; email?: string }
export async function obtenerSesion(): Promise<Sesion>
```

`/categorias` necesita la lista de categorías sin las transacciones. Hoy esa lista
solo sale empaquetada dentro de `obtenerTransacciones()`. Se expone
`obtenerCategoriasUsuario(): Promise<CategoriaInfo[]>` reutilizando el
`listarCategorias()` que ya existe.

`/balance` sigue usando `obtenerPatrimonio()` tal cual.

Cada página es un server component que carga lo suyo y se lo pasa a su componente
cliente. Ninguna sección paga el costo de las otras.

### Componentes

| Componente | Cambio |
|---|---|
| `SidebarShell` | nuevo — navegación + shell responsive |
| `PanelInteractivo` | adelgaza: pierde patrimonio y el modal de categorías; conserva filtros, KPIs, gráficos, tabla y el modal de `+ Gasto` |
| `PanelBalance` | nuevo — absorbe `BalanceGeneral` + `ModalCuentas` como página |
| `PanelCategorias` | nuevo — el CRUD de `ModalCategorias` sin overlay, como página |
| `BalanceGeneral`, `ModalCuentas`, `ModalCategorias` | se eliminan (su contenido vive en los paneles nuevos) |

`ModalGastos` se queda como modal: es una acción rápida, no una sección.

## CRUD completo de cuentas

La página `/balance` cierra los huecos del balance general, que el modal no permitía.

### Backend (`src/lib/patrimonio-acciones.ts`)

Sin migración de base de datos: las políticas RLS ya usan `for all`, que cubre UPDATE
y DELETE por fila.

```ts
editarCuenta(cuentaId, { nombre, tipo })      // reemplaza a editarNombreCuenta
editarSaldoRegistro(saldoId, { saldo, fecha }) // NUEVO
eliminarSaldoRegistro(saldoId)                 // NUEVO
```

Ambas nuevas filtran por `.eq("id", …).eq("user_id", user.id)`.

### Lógica pura (`src/lib/patrimonio-agregaciones.ts`)

Se exporta `historialDeCuenta(cuentaId, saldos): SaldoRegistro[]` (orden descendente,
el más reciente primero) reutilizando el `historialPorCuenta` interno que ya existe.

### Interfaz de `/balance`

1. **Resumen arriba:** total, subtotales (En cuentas / Me deben) y gráfico de
   tendencia. Igual que hoy pero con el espacio de una página.
2. **Lista de cuentas primero.** El formulario de "Nueva cuenta" queda colapsado
   detrás de un botón `+ Nueva cuenta`, no ocupando el tope de la vista.
3. **Cada fila** muestra nombre, saldo actual y fecha de actualización, con acciones:
   - `Actualizar` — formulario en línea con el saldo actual precargado como
     referencia.
   - `Historial` — expande la fila con **todos** los registros pasados; cada uno con
     su propio Editar (saldo + fecha) y Borrar.
   - `Editar` — nombre **y tipo** (Cuenta ↔ Me deben), que hoy no se puede cambiar.
   - `Eliminar` — confirmación que dice cuántos registros de historial se pierden.
   - `Ya me pagaron` — solo en filas "Me deben": pone el saldo en 0 con fecha de hoy
     en un clic.
4. **Inputs de saldo con separador de miles** mientras se escribe (`1.250.000`),
   parseando a número al enviar.

## Pruebas

- **Unitarias (`vitest`):** `historialDeCuenta` (orden, cuenta sin registros, empate
  el mismo día) y el formateo/parseo de miles.
- **Build:** `npm run build` (type-check + producción).
- **Playwright:** navegación entre las cuatro secciones, drawer móvil (abrir, elegir
  ítem, cerrar) y revisión visual a 320 / 390 / 768 / 1024 / 1600 px de ancho CSS
  (recordando que en este entorno `devicePixelRatio` es 1.75, así que hay que pedir el
  ancho multiplicado por ese factor).
- **Persistencia real:** usuario de prueba aislado en Supabase para verificar editar y
  borrar registros del historial, y borrarlo al terminar.

## Fuera de alcance

- Rediseño de los gráficos de gasto (colores, tipos de gráfico): solo se mueven.
- Página de detalle por cuenta (`/balance/[id]`): el historial se expande en la misma
  lista.
- Cambios en el ingestor, el parser o el esquema de base de datos.
