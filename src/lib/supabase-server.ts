// Cliente de Supabase para componentes/acciones de servidor: usa la ANON KEY y
// la sesión del usuario (cookies), de modo que RLS aísla los datos de cada quien.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: lo refresca el middleware.
          }
        },
      },
    },
  );
}
