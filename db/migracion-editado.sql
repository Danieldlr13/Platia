-- Marca de "editado" en los movimientos.
-- Pegar TODO esto en Supabase → SQL Editor → Run.
-- Es seguro correrlo varias veces: si la columna ya existe, no hace nada.

alter table public.transacciones
  add column if not exists editado boolean not null default false;
