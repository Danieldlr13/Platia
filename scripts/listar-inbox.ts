// Cuenta los correos del INBOX (total y no leídos) para comprobar la conexión
// al buzón. No imprime remitentes ni asuntos.
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
  const noLeidos = await client.search({ seen: false }, { uid: true });
  console.log(`Total de correos en INBOX: ${uids.length}`);
  console.log(`No leídos: ${noLeidos ? noLeidos.length : 0}`);
} finally {
  lock.release();
}

await client.logout();
