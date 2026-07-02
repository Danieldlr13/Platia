// Cliente de Supabase para el navegador (login). Comparte las cookies de sesión
// con el cliente de servidor vía @supabase/ssr.

import { createBrowserClient } from "@supabase/ssr";

export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
