// Muestra TODOS los correos del INBOX con remitente y asunto, para localizar
// el correo de facturas/Bancolombia con el formato correcto.
// Uso: npx tsx scripts/listar-inbox.ts

import "../src/lib/env";
import { ImapFlow } from "imapflow";

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
  // Todos los correos del buzón
  const uids = await client.search({ all: true }, { uid: true });
  console.log(`Total de correos en INBOX: ${uids.length}\n`);
  console.log(
    `${"UID".padEnd(8)} ${"LEÍDO".padEnd(6)} ${"DE".padEnd(40)} ASUNTO`,
  );
  console.log("─".repeat(100));

  for await (const msg of client.fetch(
    uids,
    { uid: true, envelope: true, flags: true },
    { uid: true },
  )) {
    const leido = msg.flags?.has("\\Seen") ? "✓" : " ";
    const de = (msg.envelope?.from?.[0]?.address ?? "?").slice(0, 38);
    const asunto = (msg.envelope?.subject ?? "(sin asunto)").slice(0, 50);
    console.log(`${String(msg.uid).padEnd(8)} ${leido.padEnd(6)} ${de.padEnd(40)} ${asunto}`);
  }
} finally {
  lock.release();
}

await client.logout();
