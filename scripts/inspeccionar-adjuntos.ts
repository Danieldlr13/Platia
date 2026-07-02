// Script de diagnóstico: muestra el tipo y primeras líneas de texto de cada
// adjunto del correo de migración para entender por qué no parsea.
// Uso: npx tsx scripts/inspeccionar-adjuntos.ts

import "../src/lib/env";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

function requerir(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta: ${nombre}`);
  return v;
}

const REMITENTE = "danieldelarosa706@gmail.com";

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
  console.log(`Correos de ${REMITENTE}: ${uids.length}\n`);

  for await (const msg of client.fetch(
    uids,
    { uid: true, source: true },
    { uid: true },
  )) {
    const correo = await simpleParser(msg.source as Buffer);
    console.log(`\n${"═".repeat(60)}`);
    console.log(`uid=${msg.uid}  |  Asunto: "${correo.subject}"`);
    console.log(`Adjuntos: ${correo.attachments.length}`);

    let i = 0;
    for (const att of correo.attachments) {
      console.log(`\n  ── Adjunto ${i} ──────────────────────────────`);
      console.log(`     contentType : ${att.contentType}`);
      console.log(`     filename    : ${att.filename ?? "(sin nombre)"}`);
      console.log(`     size        : ${att.size} bytes`);

      const esCorreo =
        att.contentType === "message/rfc822" ||
        (att.filename ?? "").toLowerCase().endsWith(".eml");

      if (esCorreo && att.content) {
        try {
          const interno = await simpleParser(att.content as Buffer);
          const texto = interno.text ?? "";
          console.log(`     [EML] subject: ${interno.subject ?? "(sin asunto)"}`);
          console.log(`     [EML] from   : ${interno.from?.text ?? "?"}`);
          if (texto) {
            // Muestra las primeras 300 chars del texto para diagnosticar
            console.log(`     [EML] texto  :\n${texto.slice(0, 300).split("\n").map(l => "       " + l).join("\n")}`);
          } else {
            console.log(`     [EML] sin texto plano. Partes HTML: ${interno.html ? "sí" : "no"}`);
          }
        } catch (e) {
          console.log(`     [EML] error al parsear: ${e}`);
        }
      } else if (att.contentType.startsWith("text/")) {
        const txt = att.content?.toString("utf-8") ?? "";
        console.log(`     [TEXT] primeros 200 chars:\n${txt.slice(0, 200)}`);
      }
      i++;
    }
  }
} finally {
  lock.release();
}

await client.logout();
