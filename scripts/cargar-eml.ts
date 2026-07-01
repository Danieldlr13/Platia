// Carga en Supabase los correos .eml que están en la carpeta del proyecto.
// Sirve para ver datos reales sin esperar al reenvío de Gmail.
// Uso: `npm run cargar:eml` (requiere las variables de Supabase en .env).

import "../src/lib/env";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { simpleParser } from "mailparser";
import { parsearCorreo } from "../src/lib/parser";
import { clasificar } from "../src/lib/classifier";
import { crearClienteServicio } from "../src/lib/supabase";
import { obtenerCategorias } from "../src/lib/categorias";

function requerir(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`);
  return v;
}

const RAIZ = process.cwd();
const userId = requerir("CUENTAS_USER_ID");
const supabase = crearClienteServicio();
const categorias = await obtenerCategorias(supabase, userId);

const emls = (await readdir(RAIZ)).filter((f) => f.toLowerCase().endsWith(".eml"));
if (emls.length === 0) {
  console.log("No hay archivos .eml en la carpeta.");
  process.exit(0);
}

let guardados = 0;
let ignorados = 0;

for (const archivo of emls) {
  const crudo = await readFile(join(RAIZ, archivo));
  const correo = await simpleParser(crudo);
  const texto = correo.text ?? "";
  const messageId = correo.messageId ?? `eml-${archivo}`;
  const r = parsearCorreo(texto);

  if (r.ok && r.esGasto && r.movimiento) {
    const m = r.movimiento;
    const categoria = clasificar(m.comercio);
    const { error } = await supabase.from("transacciones").upsert(
      {
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
        email_message_id: messageId,
      },
      { onConflict: "user_id,email_message_id", ignoreDuplicates: true },
    );
    if (error) {
      console.error(`  ✗ ${archivo}:`, error.message);
    } else {
      guardados++;
      console.log(`  ✓ ${m.tipo} $${m.monto.toLocaleString("es-CO")} · ${m.comercio} · ${categoria}`);
    }
  } else {
    ignorados++;
    console.log(`  – ${archivo}: ignorado (${r.razon ?? "sin razón"})`);
  }
}

console.log(`\nListo: ${guardados} guardados · ${ignorados} ignorados.`);
