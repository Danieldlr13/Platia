// Ingestor: lee el buzón de Gmail dedicado por IMAP, parsea los correos de
// Bancolombia, los clasifica y los guarda en Supabase (sin duplicar).
//
// Se ejecuta periódicamente (GitHub Actions). Uso local: `npm run ingest`.
// Requiere las variables de entorno de .env.example.

import "../lib/env";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parsearCorreo } from "../lib/parser";
import { clasificar } from "../lib/classifier";
import { crearClienteServicio } from "../lib/supabase";
import { obtenerCategorias } from "../lib/categorias";

function requerir(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`);
  return v;
}

interface Candidato {
  texto: string;
  messageId: string;
}

/**
 * De un correo saca los textos a parsear: su propio cuerpo y, si trae correos
 * adjuntos (.eml), el cuerpo de cada uno. Esto cubre el reenvío normal (un
 * correo) y el "reenviar como adjunto" (varios correos en uno solo) que se usa
 * para migrar el histórico. Cada candidato lleva el Message-ID del correo
 * original (adjunto) para deduplicar de forma estable.
 */
async function extraerCandidatos(
  correo: Awaited<ReturnType<typeof simpleParser>>,
  uid: number,
): Promise<Candidato[]> {
  const candidatos: Candidato[] = [];
  if (correo.text) {
    candidatos.push({ texto: correo.text, messageId: correo.messageId ?? `sin-id-${uid}` });
  }
  let i = 0;
  for (const att of correo.attachments ?? []) {
    const esCorreo =
      att.contentType === "message/rfc822" ||
      (att.filename ?? "").toLowerCase().endsWith(".eml");
    if (esCorreo && att.content) {
      try {
        const interno = await simpleParser(att.content as Buffer);
        if (interno.text) {
          candidatos.push({
            texto: interno.text,
            messageId: interno.messageId ?? `${correo.messageId ?? uid}-adj${i}`,
          });
        }
      } catch {
        // Adjunto no parseable: se ignora.
      }
    }
    i++;
  }
  return candidatos;
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
    // Correos NO leídos de Bancolombia: por remitente (reenvío automático, que
    // conserva el From original) o por asunto (reenvío manual, útil para el
    // histórico). El parser es el filtro final: solo se guarda lo que parsea,
    // así no se toca ningún otro correo del buzón.
    const uids = await client.search(
      {
        seen: false,
        or: [
          { from: "notificacionesbancolombia.com" },
          { subject: "Alertas y Notificaciones" },
        ],
      },
      { uid: true },
    );
    if (!uids || uids.length === 0) {
      console.log("No hay correos nuevos de Bancolombia.");
    } else {
      // Paso 1: leer y parsear durante el fetch. NO se emiten comandos IMAP
      // aquí dentro (imapflow no lo permite mientras el fetch está abierto).
      const pendientes: Array<{ record: Record<string, unknown>; resumen: string }> = [];

      for await (const msg of client.fetch(uids, { uid: true, source: true }, { uid: true })) {
        leidos++;
        const correo = await simpleParser(msg.source as Buffer);
        const candidatos = await extraerCandidatos(correo, msg.uid);
        let algunoValido = false;

        for (const c of candidatos) {
          const r = parsearCorreo(c.texto);
          if (r.ok && r.esGasto && r.movimiento) {
            algunoValido = true;
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
                raw_texto: c.texto.slice(0, 500),
                email_message_id: c.messageId,
              },
              resumen: `${m.tipo} $${m.monto.toLocaleString("es-CO")} · ${m.comercio} · ${categoria}`,
            });
          }
        }

        if (!algunoValido) {
          ignorados++;
          console.log(`  – Correo sin gastos reconocibles (uid ${msg.uid})`);
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
