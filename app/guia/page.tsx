import { BotonCopiar } from "@/components/BotonCopiar";

export const metadata = {
  title: "Guía de implementación — CUENTAS",
};

const ENV_VARS = `IMAP_USER=
IMAP_PASSWORD=
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CUENTAS_USER_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=`;

interface Valor {
  etiqueta?: string;
  valor: string;
  multilinea?: boolean;
}

interface Paso {
  titulo: string;
  quien: "Operador" | "Cliente";
  descripcion: string;
  valores?: Valor[];
}

const PASOS: Paso[] = [
  {
    titulo: "Buzón de ingesta dedicado",
    quien: "Operador",
    descripcion:
      "Usa un Gmail dedicado que recibirá los correos. Activa la verificación en dos pasos y genera una «Contraseña de aplicación» (Google → Seguridad). Esa clave es tu IMAP_PASSWORD.",
    valores: [{ etiqueta: "Host IMAP", valor: "imap.gmail.com" }],
  },
  {
    titulo: "Reenvío automático desde el Gmail del cliente",
    quien: "Cliente",
    descripcion:
      "En el Gmail del cliente: Configuración → Reenvío → añade el buzón dedicado y confírmalo. Luego crea un filtro por remitente que reenvíe esos correos al buzón.",
    valores: [{ etiqueta: "Filtrar por remitente", valor: "notificacionesbancolombia.com" }],
  },
  {
    titulo: "Base de datos en Supabase",
    quien: "Operador",
    descripcion:
      "Crea el proyecto en Supabase y ejecuta el esquema en el editor SQL (crea tablas + seguridad por fila). Ajusta el correo en la semilla y ejecútala.",
    valores: [
      { etiqueta: "Esquema", valor: "db/schema.sql" },
      { etiqueta: "Semilla", valor: "db/seed.sql" },
    ],
  },
  {
    titulo: "Crear el usuario (acceso al panel)",
    quien: "Operador",
    descripcion:
      "En Supabase → Authentication → Users → Add user: correo y contraseña del cliente (marca el correo como confirmado). Copia su User UID: ese es el CUENTAS_USER_ID.",
  },
  {
    titulo: "Variables de entorno",
    quien: "Operador",
    descripcion:
      "Copia .env.example a .env y complétalo con los valores del buzón y de Supabase. Estas son las variables que necesitas:",
    valores: [{ valor: ENV_VARS, multilinea: true }],
  },
  {
    titulo: "Secrets y cron en GitHub",
    quien: "Operador",
    descripcion:
      "Sube el repo a GitHub y carga las mismas variables como Secrets (Settings → Secrets → Actions). El workflow de ingesta corre solo cada 15 min; también puedes dispararlo a mano en la pestaña Actions.",
    valores: [{ etiqueta: "Workflow", valor: ".github/workflows/ingest.yml" }],
  },
  {
    titulo: "Desplegar la web en Vercel",
    quien: "Operador",
    descripcion:
      "Importa el repo en Vercel y carga las variables (incluyendo las NEXT_PUBLIC_*). Con eso el cliente entra por el URL e inicia sesión con su correo y contraseña.",
  },
  {
    titulo: "Cargar el histórico y verificar",
    quien: "Operador",
    descripcion:
      "Pide al cliente que reenvíe en lote sus correos anteriores. Espera al cron (o dispáralo) y verifica que aparezcan en el panel. Para recibos de Uber reenviados como adjuntos usa el migrador.",
    valores: [
      { etiqueta: "Migrar adjuntos", valor: "npm run migrar:adjuntos" },
      { etiqueta: "Migrar Uber", valor: "npm run migrar:uber" },
    ],
  },
];

function BadgeQuien({ quien }: { quien: Paso["quien"] }) {
  const es = quien === "Cliente";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        es
          ? "bg-blue-50 text-blue-600"
          : "bg-banco-verde/10 text-banco-verde"
      }`}
    >
      {quien}
    </span>
  );
}

function FilaValor({ v }: { v: Valor }) {
  return (
    <div className="mt-2 flex items-start gap-2">
      <div className="min-w-0 flex-1">
        {v.etiqueta && (
          <span className="mr-2 text-xs text-gray-400">{v.etiqueta}:</span>
        )}
        <code
          className={`rounded bg-gray-100 px-2 py-1 text-xs text-gray-800 ${
            v.multilinea ? "block whitespace-pre overflow-x-auto" : "break-all"
          }`}
        >
          {v.valor}
        </code>
      </div>
      <BotonCopiar texto={v.valor} />
    </div>
  );
}

export default function GuiaPage() {
  return (
    <main className="mx-auto max-w-3xl px-3 py-8 sm:px-4">
      <a href="/" className="text-sm text-banco-verde hover:underline">
        ← Volver al panel
      </a>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Implementación paso a paso
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Cómo dar de alta un cliente nuevo: del correo de Bancolombia al panel.
          Los pasos marcados <BadgeQuien quien="Cliente" /> los hace el cliente;
          el resto, el operador.
        </p>
      </header>

      <ol className="space-y-4">
        {PASOS.map((paso, i) => (
          <li
            key={i}
            className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-banco-verde/10 text-sm font-bold text-banco-verde">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">
                  {paso.titulo}
                </h2>
                <BadgeQuien quien={paso.quien} />
              </div>
              <p className="mt-1 text-sm text-gray-600">{paso.descripcion}</p>
              {paso.valores?.map((v, j) => (
                <FilaValor key={j} v={v} />
              ))}
            </div>
          </li>
        ))}
      </ol>

      <footer className="mt-8 text-center text-xs text-gray-400">
        CUENTAS · guía de implementación
      </footer>
    </main>
  );
}
