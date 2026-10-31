// Script de diagnóstico: muestra la estructura (tipo, tamaño, si trae texto o
// HTML) de cada adjunto del correo de migración para entender por qué no
// parsea. No imprime asuntos, remitentes ni texto de los correos.
// Uso: MIGRACION_REMITENTE=<direccion> npx tsx scripts/inspeccionar-adjuntos.ts

import "../src/lib/env";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { describirError } from "../src/ingest/log-seguro";

function requerir(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta: ${nombre}`);
  return v;
}

// Dirección del correo que envió los adjuntos; se lee del entorno.
const REMITENTE = requerir("MIGRACION_REMITENTE");

const client = new ImapFlow({
  host: process.env.IMAP_HOST ?? "imap.gmail.com",
  port: Number(process.env.IMAP_PORT ?? 993),
  secure: true,
  auth: { user: requerir("IMAP_USER"), pass: requerir("IMAP_PASSWORD") },
  logger: false,
});

await client.connect();
const lock = await client.getMailboxLock("INBOX");

try {
  const uids = await client.search({ from: REMITENTE }, { uid: true });
  console.log(`Correos del remitente de migración: ${uids.length}\n`);

  for await (const msg of client.fetch(
    uids,
    { uid: true, source: true },
    { uid: true },
  )) {
    const correo = await simpleParser(msg.source as Buffer);
    console.log(`\n${"═".repeat(60)}`);
    console.log(`uid=${msg.uid}`);
    console.log(`Adjuntos: ${correo.attachments.length}`);

    let i = 0;
    for (const att of correo.attachments) {
      console.log(`\n  ── Adjunto ${i} ──────────────────────────────`);
      console.log(`     contentType : ${att.contentType}`);
      console.log(`     size        : ${att.size} bytes`);

      const esCorreo =
        att.contentType === "message/rfc822" ||
        (att.filename ?? "").toLowerCase().endsWith(".eml");

      if (esCorreo && att.content) {
        try {
          const interno = await simpleParser(att.content as Buffer);
          const texto = interno.text ?? "";
          const traeHtml = Boolean(interno.html);
          if (texto) {
            console.log(`     [EML] texto plano: sí (${texto.length} caracteres)`);
          } else {
            console.log(`     [EML] sin texto plano. Partes HTML: ${traeHtml ? "sí" : "no"}`);
          }
        } catch (e) {
          console.log(`     [EML] error al parsear (${describirError(e)})`);
        }
      } else if (att.contentType.startsWith("text/")) {
        console.log(`     [TEXT] ${att.content?.length ?? 0} bytes`);
      }
      i++;
    }
  }
} finally {
  lock.release();
}

await client.logout();
