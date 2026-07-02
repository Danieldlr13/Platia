# Login (Supabase Auth) + Guía de onboarding — Diseño

Fecha: 2026-07-02

## Objetivo

Proteger la web con login y prepararla para **multi-cliente**: cada usuario
inicia sesión y ve solo sus datos (RLS por `auth.uid()`). Además, una **guía
visual de implementación paso a paso** para onboardear clientes nuevos.

## Decisiones (acordadas)

- **Multi-cliente en una instancia** con RLS (la web deja de usar la service
  role + `CUENTAS_USER_ID` fijo y pasa a la sesión del usuario).
- **Email + contraseña, por invitación** (el admin crea usuarios en Supabase; no
  hay auto-registro).
- **Guía informativa** en `/guia` (visual, responsive, copiar-al-portapapeles).

## A. Autenticación

- Dependencia nueva: **`@supabase/ssr`** (sesión por cookies en App Router).
- `src/lib/supabase-browser.ts` → `createBrowserClient` (anon key).
- `src/lib/supabase-server.ts` → `createServerClient` que lee/escribe cookies
  con `await cookies()` (Next.js 15: `cookies()` es async). Se valida al usuario
  con `getUser()` (no `getSession()`, que solo lee la cookie sin validar).
- `middleware.ts`: refresca la sesión y protege rutas; sin usuario → redirige a
  `/login`. Excepciones: `/login`, assets y estáticos.
- `app/login/page.tsx` (client): formulario email+contraseña →
  `signInWithPassword`; errores visibles; redirige al panel al entrar.
- Cerrar sesión: `app/auth/signout/route.ts` (o server action) → `signOut` +
  redirige a `/login`.

## B. La web pasa a datos por-usuario (RLS)

- `src/lib/datos.ts`: usa el cliente de servidor con la sesión. `userId =
  user.id`. RLS filtra. Si Supabase no está configurado → modo demo (dev local).
  Si está configurado pero no hay usuario → el middleware ya redirigió a login.
- `src/lib/acciones.ts`: `actualizarCategoria` usa la sesión (RLS) en vez de la
  service role. Verifica que haya usuario.
- Estado vacío: usuario nuevo sin datos ve panel vacío con CTA a `/guia`.

## C. Guía de onboarding (`/guia`)

Página de servidor, visual y responsive (paleta banco). Pasos con número, ícono
de estado, descripción y botón **copiar** para comandos/valores:

1. Buzón de ingesta + contraseña de aplicación de Gmail
2. Filtro de reenvío en el Gmail del cliente → buzón dedicado
3. Crear el usuario en Supabase (email + contraseña)
4. Variables / Secrets de GitHub
5. Activar el cron (ya incluido en `.github/workflows/ingest.yml`)
6. Deploy en Vercel
7. Reenvío del histórico

Enlace a la guía desde el header del panel. El botón "copiar" es un pequeño
client component reutilizable.

## Fuera de alcance (siguiente paso)

**Ruteo correo→usuario en el ingestor.** Hoy atribuye todo a `CUENTAS_USER_ID`.
Multi-tenant real de datos requiere enrutar por alias (`buzon+cliente@gmail.com`)
o buzón por cliente. Se hará después; la web multi-cliente y el login no dependen
de ello.

## Responsive / visual

- Login: tarjeta centrada, campos a ancho completo, botón grande.
- Guía: columna única en móvil; pasos como tarjetas apiladas con conector
  vertical; en `sm+` más aire. Objetivos táctiles ≥44px.

## Testing / verificación

- Tests y build verdes.
- Prueba en vivo: redirección sin sesión → login → panel con datos propios →
  logout; guía en móvil y escritorio (capturas).
