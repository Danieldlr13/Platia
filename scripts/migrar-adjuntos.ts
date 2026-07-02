// Migración histórica: lee por IMAP el correo que contiene los .eml de
// Bancolombia adjuntos (enviado desde danieldelarosa a dandelessp) y los
// guarda en Supabase.
//
// A diferencia del ingestor principal, este script:
//   1. No filtra por remitente/asunto de Bancolombia: busca todos los correos
//      no leídos que llegaron de danieldelarosa (o que contengan adjuntos .eml).
//   2. Recorre cada adjunto .eml y lo parsea individualmente.
//   3. Usa upsert idempotente igual que el ingestor; se puede ejecutar varias
//      veces sin duplicar datos.
//
// Uso: `npx tsx scripts/migrar-adjuntos.ts`
// Requiere las variables de .env (IMAP_USER, IMAP_PASSWORD, SUPABASE_*, CUENTAS_USER_ID).

import "../src/lib/env";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parsearCorreo } from "../src/lib/parser";
import { clasificar } from "../src/lib/classifier";
import { crearClienteServicio } from "../src/lib/supabase";
import { obtenerCategorias } from "../src/lib/categorias";

function requerir(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta la variable de entorno: ${nombre}`);
  return v;
}

// ─── Configuración ───────────────────────────────────────────────────────────

// Remitente del correo de migración.  Ajusta si usaste otra cuenta.
const REMITENTE_MIGRACION = "danieldelarosa706@gmail.com";

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const userId = requerir("CUENTAS_USER_ID");
  const supabase = crearClienteServicio();
  const categorias = await obtenerCategorias(supabase, userId);

  const client = new ImapFlow({
    host: process.env.IMAP_HOST ?? "imap.gmail.com",
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: {
      user: requerir("IMAP_USER"),
      pass: requerir("IMAP_PASSWORD"),
    },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");

  let leidos = 0;
  let adjuntosEncontrados = 0;
  let guardados = 0;
  let ignorados = 0;
  let errores = 0;

  try {
    // Busca TODOS los correos (leídos y no leídos) del remitente de migración.
    // Si ya los procesaste antes el upsert los ignorará sin duplicar.
    const uids = await client.search(
      { from: REMITENTE_MIGRACION },
      { uid: true },
    );

    if (!uids || uids.length === 0) {
      console.log(
        `⚠️  No se encontraron correos de "${REMITENTE_MIGRACION}" en el buzón.`,
      );
      console.log(
        "   Verifica que el correo llegó a dandelessp@gmail.com y que REMITENTE_MIGRACION coincide.",
      );
      return;
    }

    console.log(
      `📬 Encontrados ${uids.length} correo(s) de "${REMITENTE_MIGRACION}".\n`,
    );

    // ── Fase 1: leer y acumular (sin comandos IMAP durante el fetch) ─────────
    interface Pendiente {
      record: Record<string, unknown>;
      resumen: string;
    }
    const pendientes: Pendiente[] = [];

    for await (const msg of client.fetch(
      uids,
      { uid: true, source: true },
      { uid: true },
    )) {
      leidos++;
      const envolvente = await simpleParser(msg.source as Buffer);

      console.log(
        `── Correo uid ${msg.uid}  |  Asunto: "${envolvente.subject ?? "(sin asunto)"}"`,
      );
      console.log(
        `   De: ${envolvente.from?.text ?? "desconocido"}  |  Adjuntos: ${envolvente.attachments.length}`,
      );

      let encontrados = 0;

      // ── A) Probar el cuerpo del correo envolvente mismo ────────────────────
      if (envolvente.text) {
        const r = parsearCorreo(envolvente.text);
        if (r.ok && r.esGasto && r.movimiento) {
          const m = r.movimiento;
          const categoria = clasificar(m.comercio);
          const mid = envolvente.messageId ?? `body-uid-${msg.uid}`;
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
              raw_texto: envolvente.text.slice(0, 500),
              email_message_id: mid,
            },
            resumen: `${m.tipo} $${m.monto.toLocaleString("es-CO")} · ${m.comercio} · ${categoria}`,
          });
          encontrados++;
        }
      }

      // ── B) Procesar cada adjunto .eml ──────────────────────────────────────
      let adjIdx = 0;
      for (const att of envolvente.attachments) {
        const esCorreo =
          att.contentType === "message/rfc822" ||
          (att.filename ?? "").toLowerCase().endsWith(".eml");

        if (!esCorreo || !att.content) {
          adjIdx++;
          continue;
        }

        adjuntosEncontrados++;

        try {
          const interno = await simpleParser(att.content as Buffer);
          const texto = interno.text ?? "";

          if (!texto) {
            console.log(`   ⚠️  Adjunto ${adjIdx} sin texto plano — se omite`);
            ignorados++;
            adjIdx++;
            continue;
          }

          const r = parsearCorreo(texto);
          if (r.ok && r.esGasto && r.movimiento) {
            const m = r.movimiento;
            const categoria = clasificar(m.comercio);
            const mid =
              interno.messageId ??
              `${envolvente.messageId ?? msg.uid}-adj${adjIdx}`;

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
                email_message_id: mid,
              },
              resumen: `${m.tipo} $${m.monto.toLocaleString("es-CO")} · ${m.comercio} · ${categoria}`,
            });
            encontrados++;
          } else {
            console.log(
              `   – Adjunto ${adjIdx}: no reconocido como gasto (${r.razon ?? "sin razón"})`,
            );
            ignorados++;
          }
        } catch (e) {
          console.error(`   ✗ Adjunto ${adjIdx}: error al parsear —`, e);
          errores++;
        }

        adjIdx++;
      }

      console.log(
        `   → ${encontrados} movimiento(s) extraído(s) de este correo.\n`,
      );
    }

    // ── Fase 2: guardar en Supabase (fetch ya cerrado) ────────────────────────
    console.log(
      `\n💾 Guardando ${pendientes.length} movimiento(s) en Supabase…\n`,
    );
    for (const p of pendientes) {
      const { error } = await supabase
        .from("transacciones")
        .upsert(p.record, {
          onConflict: "user_id,email_message_id",
          ignoreDuplicates: true,
        });

      if (error) {
        console.error(`  ✗ Error al guardar: ${error.message}`);
        errores++;
      } else {
        guardados++;
        console.log(`  ✓ ${p.resumen}`);
      }
    }
  } finally {
    lock.release();
  }

  await client.logout();

  console.log("\n─────────────────────────────────────────────────");
  console.log(`📋 Resumen de migración:`);
  console.log(`   Correos leídos      : ${leidos}`);
  console.log(`   Adjuntos .eml       : ${adjuntosEncontrados}`);
  console.log(`   ✅ Guardados         : ${guardados}`);
  console.log(`   – Ignorados/no gasto: ${ignorados}`);
  console.log(`   ✗ Errores           : ${errores}`);
  console.log("─────────────────────────────────────────────────");

  if (guardados === 0 && adjuntosEncontrados === 0) {
    console.log(
      "\n⚠️  No se encontraron adjuntos .eml en el correo. Posibles causas:",
    );
    console.log(
      "   • El correo fue reenviado en línea (inline), no como adjunto .eml.",
    );
    console.log(
      "   • El asunto no coincide con la búsqueda por remitente.",
    );
    console.log(
      '   • Prueba: abre Gmail → busca el correo → "Más opciones" → "Descargar mensaje"',
    );
    console.log(
      "     y luego pon el .eml en la raíz del proyecto y ejecuta `npm run cargar:eml`.",
    );
  }
}

main().catch((err) => {
  console.error("\n❌ Fallo la migración:", err);
  process.exit(1);
});
