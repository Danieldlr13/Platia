// Migración de recibos de Uber (noreply@uber.com) adjuntos en el correo "uber"
// de danieldelarosa706@gmail.com.
//
// Diferencias frente al ingestor principal:
//  • Usa parsearReciboUber (no parsearCorreo de Bancolombia).
//  • El comercio siempre es "UBER RIDES" → categoría Transporte.
//  • El tipo es "Compraste" para consistencia con el resto del panel.
//  • Los correos de "Payment Failed" se ignoran (pago no efectivo).
//  • El email_message_id usa el Message-ID interno del .eml adjunto.
//
// Uso: npx tsx scripts/migrar-uber.ts
// Requiere variables de .env.

import "../src/lib/env";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parsearReciboUber, htmlATexto } from "../src/lib/parser-uber";
import { crearClienteServicio } from "../src/lib/supabase";
import { obtenerCategorias } from "../src/lib/categorias";

function requerir(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta: ${nombre}`);
  return v;
}

// UID del correo que contiene los recibos de Uber adjuntos
const UID_CORREO_UBER = 150;
const REMITENTE = "danieldelarosa706@gmail.com";

async function main() {
  const userId = requerir("CUENTAS_USER_ID");
  const supabase = crearClienteServicio();
  const categorias = await obtenerCategorias(supabase, userId);
  const categoriaTransporte = categorias.get("Transporte") ?? null;

  const client = new ImapFlow({
    host: process.env.IMAP_HOST ?? "imap.gmail.com",
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: { user: requerir("IMAP_USER"), pass: requerir("IMAP_PASSWORD") },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");

  let procesados = 0;
  let guardados = 0;
  let ignorados = 0;
  let fallidos = 0;
  let errores = 0;

  interface Pendiente {
    record: Record<string, unknown>;
    resumen: string;
  }
  const pendientes: Pendiente[] = [];

  try {
    console.log(`📬 Leyendo correo uid ${UID_CORREO_UBER} de ${REMITENTE}…\n`);

    for await (const msg of client.fetch(
      [UID_CORREO_UBER],
      { uid: true, source: true },
      { uid: true },
    )) {
      const correo = await simpleParser(msg.source as Buffer);
      console.log(`Correo: "${correo.subject}" — ${correo.attachments.length} adjuntos`);

      let adjIdx = 0;
      for (const att of correo.attachments) {
        const esCorreo =
          att.contentType === "message/rfc822" ||
          (att.filename ?? "").toLowerCase().endsWith(".eml");

        if (!esCorreo || !att.content) { adjIdx++; continue; }
        procesados++;

        try {
          const interno = await simpleParser(att.content as Buffer);
          const asunto = interno.subject ?? att.filename ?? "";
          // Muchos recibos de Uber vienen solo en HTML: usarlo como respaldo.
          const texto = interno.text || (interno.html ? htmlATexto(interno.html) : "");

          if (!texto) {
            console.log(`  ⚠️  Adjunto ${adjIdx} sin texto ni HTML: "${asunto}" — se omite`);
            ignorados++;
            adjIdx++;
            continue;
          }

          const r = parsearReciboUber(texto, asunto);

          if (!r.ok || !r.recibo) {
            console.log(`  – Adjunto ${adjIdx}: ${r.razon}`);
            ignorados++;
            adjIdx++;
            continue;
          }

          const recibo = r.recibo;

          // Ignorar pagos fallidos
          if (recibo.pagoFallido) {
            console.log(`  ✗ Adjunto ${adjIdx}: pago fallido — "${asunto}" — se omite`);
            fallidos++;
            adjIdx++;
            continue;
          }

          const mid =
            interno.messageId ??
            `uber-uid${UID_CORREO_UBER}-adj${adjIdx}`;

          const metodo = recibo.esEfectivo ? "efectivo" : recibo.metodoPago;
          pendientes.push({
            record: {
              user_id: userId,
              fecha: recibo.fecha.toISOString(),
              monto: recibo.monto,
              moneda: recibo.moneda,
              comercio: "UBER RIDES",
              categoria_id: categoriaTransporte,
              categoria_manual: false,
              tarjeta: recibo.esEfectivo ? "Efectivo" : recibo.metodoPago,
              tipo: "Compraste",
              raw_texto: texto.slice(0, 500),
              email_message_id: mid,
            },
            resumen: `$${recibo.monto.toLocaleString("es-CO")} · ${recibo.fecha.toLocaleDateString("es-CO")} · ${metodo}`,
          });
        } catch (e) {
          console.error(`  ✗ Adjunto ${adjIdx}: error al parsear —`, e);
          errores++;
        }
        adjIdx++;
      }
    }

    // ── Guardar en Supabase ──────────────────────────────────────────────────
    console.log(`\n💾 Guardando ${pendientes.length} recibo(s) de Uber en Supabase…\n`);
    for (const p of pendientes) {
      const { error } = await supabase
        .from("transacciones")
        .upsert(p.record, {
          onConflict: "user_id,email_message_id",
          ignoreDuplicates: false, // actualiza tarjeta si ya existía
        });

      if (error) {
        console.error(`  ✗ ${p.resumen}: ${error.message}`);
        errores++;
      } else {
        guardados++;
        console.log(`  ✓ Uber  ${p.resumen}`);
      }
    }
  } finally {
    lock.release();
  }

  await client.logout();

  console.log("\n─────────────────────────────────────────────────");
  console.log("📋 Resumen migración Uber:");
  console.log(`   Adjuntos .eml procesados: ${procesados}`);
  console.log(`   ✅ Guardados             : ${guardados}`);
  console.log(`   – Sin texto/no reconocido: ${ignorados}`);
  console.log(`   ✗ Pagos fallidos (omit.) : ${fallidos}`);
  console.log(`   ✗ Errores               : ${errores}`);
  console.log("─────────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("\n❌ Fallo la migración de Uber:", err);
  process.exit(1);
});
