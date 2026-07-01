-- Datos iniciales para un usuario: categorías (Transporte / Otros) y reglas de
-- transporte. Ejecutar en el editor SQL de Supabase DESPUÉS de crear el usuario
-- (Authentication > Users) y de correr schema.sql.
--
-- 👉 Reemplaza el correo por el del cliente antes de ejecutar.

do $$
declare
  v_user       uuid;
  v_transporte uuid;
  v_otros      uuid;
  v_patron     text;
begin
  select id into v_user from auth.users where email = 'REEMPLAZA@correo.com';
  if v_user is null then
    raise exception 'No existe un usuario con ese correo. Créalo primero en Authentication > Users.';
  end if;

  -- Categorías
  insert into public.categorias (user_id, nombre, color)
    values (v_user, 'Transporte', '#00C389')
    on conflict (user_id, nombre) do update set color = excluded.color
    returning id into v_transporte;

  insert into public.categorias (user_id, nombre, color)
    values (v_user, 'Otros', '#9CA3AF')
    on conflict (user_id, nombre) do update set color = excluded.color
    returning id into v_otros;

  -- Reglas de transporte (comercio contiene el patrón => Transporte)
  foreach v_patron in array array[
    'UBER','DIDI','CABIFY','BEAT','INDRIVE','INDRIVER','TAXI',
    'TERPEL','PRIMAX','TEXACO','BIOMAX','ESSO','MOBIL','PETROBRAS','ZEUSS',
    'TRANSMILENIO','METRO DE','TULLAVE','CIVICA','PEAJE'
  ]
  loop
    insert into public.reglas (user_id, patron, categoria_id, prioridad)
    values (v_user, v_patron, v_transporte, 100);
  end loop;

  raise notice 'Seed completado para el usuario %', v_user;
end $$;
