// Ingestor: lee el buzón de Gmail dedicado por IMAP, parsea los correos de
// Bancolombia, los clasifica y los guarda en Supabase (sin duplicar).
//
// Se ejecuta periódicamente (GitHub Actions). Uso local: `npm run ingest`.
// Requiere las variables de entorno de .env.example.

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parsearCorreo } from "../lib/parser";
import { clasificar } from "../lib/classifier";
import { crearClienteServicio } from "../lib/supabase";
import type { Categoria } from "../lib/types";

function requerir(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`);
  return v;
}

/** Devuelve un mapa { nombreCategoria -> id }, creando las que falten. */
async function obtenerCategorias(
  supabase: ReturnType<typeof crearClienteServicio>,
  userId: string,
): Promise<Map<Categoria, string>> {
  const mapa = new Map<Categoria, string>();
  const { data } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("user_id", userId);

  for (const c of data ?? []) mapa.set(c.nombre as Categoria, c.id);

  const colores: Record<Categoria, string> = {
    Transporte: "#00C389",
    Otros: "#9CA3AF",
  };
  for (const nombre of ["Transporte", "Otros"] as Categoria[]) {
    if (!mapa.has(nombre)) {
      const { data: nueva } = await supabase
        .from("categorias")
        .insert({ user_id: userId, nombre, color: colores[nombre] })
        .select("id")
        .single();
      if (nueva) mapa.set(nombre, nueva.id);
    }
  }
  return mapa;
}

async function main() {
  const userId = requerir("CUENTAS_USER_ID");
  const supabase = crearClienteServicio();
  const categorias = await obtenerCategorias(supabase, userId);

  const client = new ImapFlow({
    host: process.env.IMAP_HOST ?? "imap.gmail.com",
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: { user: requerir("IMAP_USER"), pass: requerir("IMAP_PASSWORD") },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");

  let leidos = 0;
  let guardados = 0;
  let ignorados = 0;

  try {
    const uids = await client.search({ seen: false }, { uid: true });
    if (!uids || uids.length === 0) {
      console.log("No hay correos nuevos.");
    } else {
      // Paso 1: leer y parsear durante el fetch. NO se emiten comandos IMAP
      // aquí dentro (imapflow no lo permite mientras el fetch está abierto).
      const pendientes: Array<{ record: Record<string, unknown>; resumen: string }> = [];

      for await (const msg of client.fetch(uids, { uid: true, source: true }, { uid: true })) {
        leidos++;
        const correo = await simpleParser(msg.source as Buffer);
        const texto = correo.text ?? "";
        const messageId = correo.messageId ?? `sin-id-${msg.uid}`;
        const r = parsearCorreo(texto);

        if (r.ok && r.esGasto && r.movimiento) {
          const m = r.movimiento;
          const categoria = clasificar(m.comercio);
          pendientes.push({
            record: {
              user_id: userId,
              fecha: m.fecha.toISOString(),
              monto: m.monto,
              moneda: m.moneda,
              comercio: m.comercio,
              categoria_id: categorias.get(categoria) ?? null,
              categoria_manual: false,
              tarjeta: m.tarjeta,
              tipo: m.tipo,
              raw_texto: texto.slice(0, 500),
              email_message_id: messageId,
            },
            resumen: `${m.tipo} $${m.monto.toLocaleString("es-CO")} · ${m.comercio} · ${categoria}`,
          });
        } else {
          ignorados++;
          console.log(`  – Ignorado (${r.razon ?? "sin razón"})`);
        }
      }

      // Paso 2: guardar en Supabase (el fetch ya terminó).
      for (const p of pendientes) {
        const { error } = await supabase
          .from("transacciones")
          .upsert(p.record, {
            onConflict: "user_id,email_message_id",
            ignoreDuplicates: true,
          });
        if (error) {
          console.error("  ✗ Error al guardar:", error.message);
        } else {
          guardados++;
          console.log(`  ✓ ${p.resumen}`);
        }
      }

      // Paso 3: marcar como leídos en un solo comando IMAP (sin fetch activo).
      await client.messageFlagsAdd(uids, ["\\Seen"], { uid: true });
    }
  } finally {
    lock.release();
  }

  await client.logout();
  console.log(`\nResumen: ${leidos} leídos · ${guardados} guardados · ${ignorados} ignorados.`);
}

main().catch((err) => {
  console.error("Fallo el ingestor:", err);
  process.exit(1);
});
