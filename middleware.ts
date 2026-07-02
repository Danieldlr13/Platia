// Protege todas las rutas: refresca la sesión de Supabase y, si no hay usuario,
// redirige a /login. Si Supabase no está configurado (dev local), no hace nada
// para que el panel funcione con datos de demostración.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.next(); // sin Supabase: modo demo/dev, sin auth
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // No meter código entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const p = request.nextUrl.pathname;
  if (!user && !p.startsWith("/login") && !p.startsWith("/auth")) {
    const redir = request.nextUrl.clone();
    redir.pathname = "/login";
    return NextResponse.redirect(redir);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
