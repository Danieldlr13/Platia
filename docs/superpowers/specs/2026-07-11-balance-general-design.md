# Balance general (patrimonio) — Diseño

Fecha: 2026-07-11

## Objetivo

Una sección nueva e independiente del tracking de gastos: cuánta plata tiene
el usuario en total, sumando todas sus cuentas **y** lo que le deben. Es un
snapshot que el usuario actualiza manualmente (no se deriva de transacciones),
con historial para poder ver la tendencia del total en el tiempo.

## Alcance (acordado)

- Lista de **cuentas con saldo** (no un solo número suelto). Cada cuenta tiene
  un **tipo**: `cuenta` (banco, efectivo, inversión…) o `por_cobrar` ("me
  deben" — dinero que tiene alguien más).
- **Con historial**: cada actualización de saldo es un registro nuevo, nunca
  se sobreescribe. El saldo actual de una cuenta = su registro más reciente.
- **Sección propia arriba del todo** del panel, antes de los KPIs de gastos.
- Actualización **cuenta por cuenta** (no un formulario masivo).
- La interfaz **separa "Cuentas" de "Me deben"** con subtotales, más el total
  general.

## Modelo de datos (Supabase)

Dos tablas nuevas, mismo patrón de RLS que el resto del esquema:

```sql
create table if not exists public.patrimonio_cuentas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  nombre      text not null,
  tipo        text not null default 'cuenta' check (tipo in ('cuenta', 'por_cobrar')),
  created_at  timestamptz not null default now()
);

create table if not exists public.patrimonio_saldos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  cuenta_id   uuid not null references public.patrimonio_cuentas (id) on delete cascade,
  saldo       numeric(14,2) not null,
  fecha       date not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_patrimonio_saldos_cuenta_fecha
  on public.patrimonio_saldos (cuenta_id, fecha desc, created_at desc);

alter table public.patrimonio_cuentas enable row level security;
alter table public.patrimonio_saldos  enable row level security;

create policy "patrimonio_cuentas propias" on public.patrimonio_cuentas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "patrimonio_saldos propias" on public.patrimonio_saldos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

`on delete cascade` en `cuenta_id`: borrar una cuenta borra su historial. No
hace falta reasignar nada (a diferencia de categorías), porque los saldos no
son "propiedad compartida" de nada más.

## Funciones puras (`src/lib/patrimonio-agregaciones.ts`, testeadas)

- `cuentasConSaldoActual(cuentas, saldos)`: para cada cuenta, su registro de
  saldo más reciente (por fecha, desempatando por `creadoEn`). Si nunca tuvo
  un registro, saldo actual = 0.
- `calcularResumen(cuentasConSaldo)`: `{ totalCuentas, totalPorCobrar, total }`.
- `calcularSerieTendencia(cuentas, saldos)`: para cada fecha en la que
  cualquier cuenta se actualizó, el total en ese momento usando el último
  saldo conocido de cada cuenta hasta esa fecha (carry-forward). Una cuenta
  sin ningún registro aún no contribuye al total histórico antes de su primer
  registro.

## Server actions (`src/lib/patrimonio-acciones.ts`, RLS)

- `crearCuenta(nombre, tipo, saldoInicial, fecha)`: inserta la cuenta y su
  primer registro de saldo. Si el segundo insert falla, borra la cuenta
  recién creada (evita huérfanos).
- `actualizarSaldo(cuentaId, saldo, fecha)`: inserta un registro nuevo (nunca
  edita uno existente).
- `editarNombreCuenta(cuentaId, nombre)`: renombra (metadata only).
- `eliminarCuenta(cuentaId)`: borra la cuenta; el historial se va en cascada.

Lectura (`src/lib/patrimonio-datos.ts`): si Supabase no está configurado o las
tablas aún no existen (usuario no ha corrido el SQL), degrada a vacío sin
romper el panel — nunca lanza un error visible al usuario.

## UI

**Sección "Balance general"** (arriba del todo, antes de los KPIs de gastos):
total grande, desglose "En cuentas: $X" + "Me deben: $Y" (esta última solo si
`totalPorCobrar > 0`), gráfico de tendencia (línea, un solo color — no hace
falta leyenda para una sola serie) o mensaje placeholder si hay <2 puntos, y
un botón "Gestionar cuentas".

**Modal `ModalCuentas`** (mismo lenguaje visual que `ModalCategorias`):
formulario con 3 modos (crear / actualizar saldo / renombrar) y dos listas
agrupadas (Cuentas / Me deben) con Actualizar/Editar/Eliminar por fila
(Eliminar con confirmación en dos pasos). Cada fila se apila en móvil
(lección aprendida de la revisión de responsive: nombre+botones no caben en
una sola línea en 320-375px).

## Fuera de alcance (YAGNI)

Multi-moneda, fechas de vencimiento/recordatorios de cobro, pagos parciales
con seguimiento especial (se resuelve actualizando el saldo al monto
restante), editar/borrar un registro histórico puntual (se corrige agregando
una actualización nueva).

## Despliegue del esquema

`db/schema.sql` es acumulativo e idempotente (`if not exists`). Para
aplicarlo a una base ya existente, basta con volver a correr el archivo
completo en el editor SQL de Supabase — no hace falta extraer un diff.
