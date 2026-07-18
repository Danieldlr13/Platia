-- Esquema de CUENTAS para Supabase (PostgreSQL).
-- Ejecutar en el editor SQL de Supabase.
--
-- Diseñado para 1 usuario pero listo para multiusuario: todo cuelga de user_id
-- (auth.users) y la seguridad por fila (RLS) aísla los datos de cada persona.

-- ───────────────────────── Categorías ─────────────────────────
create table if not exists public.categorias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  nombre      text not null,
  color       text not null default '#9CA3AF',
  created_at  timestamptz not null default now(),
  unique (user_id, nombre)
);

-- ───────────────────────── Reglas ─────────────────────────
-- Si el comercio contiene `patron` (sin distinguir mayúsculas) => categoria.
create table if not exists public.reglas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  patron        text not null,
  categoria_id  uuid not null references public.categorias (id) on delete cascade,
  prioridad     int not null default 100,
  created_at    timestamptz not null default now()
);

-- ───────────────────────── Transacciones ─────────────────────────
create table if not exists public.transacciones (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  fecha             timestamptz not null,
  monto             numeric(14,2) not null,
  moneda            text not null default 'COP',
  comercio          text not null,
  categoria_id      uuid references public.categorias (id) on delete set null,
  categoria_manual  boolean not null default false,
  tarjeta           text,
  tipo              text,
  raw_texto         text,
  email_message_id  text not null,
  created_at        timestamptz not null default now(),
  -- Evita duplicados: un mismo correo (Message-ID) no se guarda dos veces.
  unique (user_id, email_message_id)
);

create index if not exists idx_transacciones_user_fecha
  on public.transacciones (user_id, fecha desc);

-- ───────────────────────── Patrimonio (balance general) ─────────────────────────
-- Cuentas y "me deben" (cuentas por cobrar) que el usuario actualiza a mano.
-- No se deriva de transacciones: es un snapshot independiente del gasto.
create table if not exists public.patrimonio_cuentas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  nombre      text not null,
  tipo        text not null default 'cuenta' check (tipo in ('cuenta', 'por_cobrar')),
  created_at  timestamptz not null default now()
);

-- Historial de saldos: cada actualización es un registro nuevo (nunca se
-- sobreescribe), para poder graficar la tendencia del total en el tiempo.
-- El saldo actual de una cuenta es su registro con mayor (fecha, created_at).
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

-- ───────────────────────── Seguridad por fila (RLS) ─────────────────────────
alter table public.categorias         enable row level security;
alter table public.reglas             enable row level security;
alter table public.transacciones      enable row level security;
alter table public.patrimonio_cuentas enable row level security;
alter table public.patrimonio_saldos  enable row level security;

-- Cada usuario solo ve y edita lo suyo.
create policy "categorias propias" on public.categorias
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reglas propias" on public.reglas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transacciones propias" on public.transacciones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "patrimonio_cuentas propias" on public.patrimonio_cuentas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "patrimonio_saldos propias" on public.patrimonio_saldos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
