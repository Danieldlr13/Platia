"use client";

// Shell de navegación: barra lateral fija en escritorio, cajón deslizante en
// móvil. Envuelve todas las secciones del panel (no el login).

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cerrarSesion } from "@/lib/acciones";

interface Props {
  modo: "supabase" | "demo";
  email?: string;
  children: React.ReactNode;
}

interface Seccion {
  href: string;
  etiqueta: string;
  icono: React.ReactNode;
}

const TRAZO = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Icono({ d }: { d: string[] }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
      {d.map((p) => (
        <path key={p} d={p} {...TRAZO} />
      ))}
    </svg>
  );
}

const SECCIONES: Seccion[] = [
  {
    href: "/",
    etiqueta: "Gastos",
    icono: (
      <Icono
        d={[
          "M3.75 20.25h16.5",
          "M6 20.25v-6.5",
          "M10.5 20.25V8.5",
          "M15 20.25v-9",
          "M19.5 20.25V4.75",
        ]}
      />
    ),
  },
  {
    href: "/balance",
    etiqueta: "Balance",
    icono: (
      <Icono
        d={[
          "M3.75 7.5A1.75 1.75 0 0 1 5.5 5.75h11A1.75 1.75 0 0 1 18.25 7.5v1",
          "M3.75 7.5v9A1.75 1.75 0 0 0 5.5 18.25h13A1.75 1.75 0 0 0 20.25 16.5v-6A1.75 1.75 0 0 0 18.5 8.75H5.5",
          "M16.5 13.5h.008v.008H16.5z",
        ]}
      />
    ),
  },
  {
    href: "/categorias",
    etiqueta: "Categorías",
    icono: (
      <Icono
        d={[
          "M4 4.75h5.25l10 10-5.25 5.25-10-10z",
          "M7.25 8h.008v.008H7.25z",
        ]}
      />
    ),
  },
  {
    href: "/guia",
    etiqueta: "Guía",
    icono: (
      <Icono
        d={[
          "M12 6.5A7.5 7.5 0 0 0 4.5 4.75v13A7.5 7.5 0 0 1 12 19.5a7.5 7.5 0 0 1 7.5-1.75v-13A7.5 7.5 0 0 0 12 6.5z",
          "M12 6.5v13",
        ]}
      />
    ),
  },
];

function esActiva(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SidebarShell({ modo, email, children }: Props) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  // Al navegar, el cajón se cierra solo (en escritorio no está abierto nunca).
  useEffect(() => setAbierto(false), [pathname]);

  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto]);

  return (
    <div className="min-h-screen lg:flex">
      {abierto && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setAbierto(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-banco-oscuro text-gray-300 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-banco-verde text-base font-bold text-white">
              P
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              Platia
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
            className="rounded-lg p-1 text-2xl leading-none text-gray-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {SECCIONES.map((s) => {
            const activa = esActiva(pathname, s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={activa ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  activa
                    ? "bg-banco-verde text-white"
                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {s.icono}
                {s.etiqueta}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/10 px-5 py-4">
          {modo === "demo" && (
            <span className="inline-block rounded-full bg-banco-amarillo/20 px-2.5 py-1 text-[11px] font-medium text-banco-amarillo">
              Datos de demostración
            </span>
          )}
          {email && (
            <>
              <p className="truncate text-xs text-gray-500" title={email}>
                {email}
              </p>
              <form action={cerrarSesion}>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior solo en móvil: el sidebar está oculto. */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label="Abrir menú"
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <path d="M4 6.75h16M4 12h16M4 17.25h16" {...TRAZO} />
            </svg>
          </button>
          <span className="flex items-center gap-2 text-base font-bold tracking-tight text-gray-900">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-banco-verde text-xs font-bold text-white">
              P
            </span>
            Platia
          </span>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
