// Muestra el texto Y el HTML de los adjuntos que el parser marcó como
// "Desconocido" (ni Cash ni tarjeta reconocida), para identificar el patrón.
// Uso: npx tsx scripts/debug-uber-pago.ts

import "../src/lib/env";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parsearReciboUber } from "../src/lib/parser-uber";

function requerir(n: string) {
  const v = process.env[n]; if (!v) throw new Error(`Falta: ${n}`); return v;
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
  for await (const msg of client.fetch([150], { uid: true, source: true }, { uid: true })) {
    const correo = await simpleParser(msg.source as Buffer);
    let i = 0;
    for (const att of correo.attachments) {
      const esCorreo = att.contentType === "message/rfc822" || (att.filename ?? "").toLowerCase().endsWith(".eml");
      if (!esCorreo || !att.content) { i++; continue; }

      const interno = await simpleParser(att.content as Buffer);
      const texto = interno.text ?? "";
      const asunto = interno.subject ?? "";

      if (!texto) { i++; continue; }

      const r = parsearReciboUber(texto, asunto);
      if (r.ok && r.recibo?.metodoPago === "Desconocido") {
        console.log(`\n${"═".repeat(60)}`);
        console.log(`Adjunto ${i}: "${asunto}"`);
        console.log(`\n── TEXTO PLANO (sección Payments) ──`);
        // Mostrar solo la sección de pagos
        const idx = texto.indexOf("Payments");
        if (idx !== -1) {
          console.log(texto.slice(idx, idx + 400));
        } else {
          console.log(texto.slice(0, 600));
        }

        // También buscar en el HTML
        if (interno.html) {
          console.log(`\n── HTML (fragmento con 'COP') ──`);
          const html = interno.html;
          // Buscar la sección de pagos en el HTML
          const hitIdx = html.toLowerCase().indexOf("payment");
          if (hitIdx !== -1) {
            // Extraer fragmento limpio de etiquetas
            const fragmento = html.slice(Math.max(0, hitIdx - 200), hitIdx + 600)
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            console.log(fragmento.slice(0, 500));
          }
        }
      }
      i++;
    }
  }
} finally { lock.release(); }

await client.logout();
console.log("\n✓ Listo.");
