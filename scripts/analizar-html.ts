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
      const asunto = interno.subject ?? "";

      // Si parsearReciboUber falla por no tener texto, extraemos de HTML
      if (!interno.text || interno.text.trim() === "") {
        console.log(`\n${"═".repeat(60)}`);
        console.log(`Adjunto ${i}: "${asunto}" [HTML ONLY]`);
        
        const html = interno.html || "";
        // Buscar TotalCOP
        const mTotal = html.match(/TotalCOP.*?([\d,\.]+)/i) || html.match(/COP.*?([\d,\.]+)/i);
        console.log(`  Monto encontrado en HTML: ${mTotal ? mTotal[1] : "No encontrado"}`);
        
        // Buscar Payments
        const hitIdx = html.toLowerCase().indexOf("payment");
        if (hitIdx !== -1) {
            const fragmento = html.slice(Math.max(0, hitIdx - 200), hitIdx + 600)
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            console.log(`  Sección pago: ${fragmento.slice(0, 200)}`);
        }
      }
      i++;
    }
  }
} finally { lock.release(); }
await client.logout();
