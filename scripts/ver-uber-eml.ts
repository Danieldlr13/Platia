// Muestra el texto completo de los adjuntos .eml del correo "uber" (uid 150)
// para entender el formato y poder escribir un parser.
// Uso: npx tsx scripts/ver-uber-eml.ts

import "../src/lib/env";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

function requerir(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta: ${nombre}`);
  return v;
}

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
  // Solo el correo uid 150 ("uber")
  for await (const msg of client.fetch(
    [150],
    { uid: true, source: true },
    { uid: true },
  )) {
    const correo = await simpleParser(msg.source as Buffer);
    console.log(`Correo: "${correo.subject}" — ${correo.attachments.length} adjuntos\n`);

    let i = 0;
    for (const att of correo.attachments) {
      const esCorreo =
        att.contentType === "message/rfc822" ||
        (att.filename ?? "").toLowerCase().endsWith(".eml");
      if (!esCorreo || !att.content) { i++; continue; }

      try {
        const interno = await simpleParser(att.content as Buffer);
        const texto = interno.text ?? "";
        console.log(`${"═".repeat(60)}`);
        console.log(`Adjunto ${i}: ${interno.subject}`);
        console.log(`Texto completo:\n`);
        // Imprimir TODO el texto para ver todos los campos
        console.log(texto.slice(0, 1500));
        console.log("...(fin)\n");
      } catch { /* skip */ }
      i++;

      // Solo los primeros 5 para no saturar
      if (i >= 5) break;
    }
  }
} finally {
  lock.release();
}

await client.logout();
