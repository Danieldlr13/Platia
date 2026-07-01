// Clientes de Supabase.
//
// - `crearClienteServicio()` usa la SERVICE ROLE KEY: solo para el ingestor
//   (proceso de backend en GitHub Actions). Nunca exponer en el navegador.
// - `crearClienteNavegador()` usa la ANON KEY pública: para la web.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function crearClienteServicio(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function crearClienteNavegador(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createClient(url, key);
}

/** true si las variables de Supabase para la web están configuradas. */
export function supabaseConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
