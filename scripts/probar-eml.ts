// Valida el parser contra los correos .eml REALES de la carpeta del proyecto.
// Los .eml están gitignored (contienen datos financieros del cliente), así que
// esta prueba solo corre en local. Uso: `npm run ingest:eml`

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { simpleParser } from "mailparser";
import { parsearCorreo } from "../src/lib/parser";
import { clasificar } from "../src/lib/classifier";

const RAIZ = process.cwd();

const emls = (await readdir(RAIZ)).filter((f) => f.toLowerCase().endsWith(".eml"));

if (emls.length === 0) {
  console.log("No hay archivos .eml en la carpeta para probar.");
  process.exit(0);
}

console.log(`Encontrados ${emls.length} correos .eml\n`);

for (const archivo of emls) {
  const crudo = await readFile(join(RAIZ, archivo));
  const correo = await simpleParser(crudo);
  const texto = correo.text ?? "";
  const r = parsearCorreo(texto);

  console.log(`── ${archivo}`);
  console.log(`   Message-ID: ${correo.messageId ?? "(sin id)"}`);
  if (r.ok && r.movimiento) {
    const m = r.movimiento;
    const cat = clasificar(m.comercio);
    console.log(`   ✓ ${m.tipo}  $${m.monto.toLocaleString("es-CO")} COP`);
    console.log(`     Comercio : ${m.comercio}`);
    console.log(`     Tarjeta  : ${m.tarjeta}`);
    console.log(`     Fecha    : ${m.fecha.toISOString()} (${m.fechaTexto} ${m.horaTexto})`);
    console.log(`     Categoría: ${cat}`);
    console.log(`     Es gasto : ${r.esGasto ? "sí" : "no"}`);
  } else {
    console.log(`   ✗ No se pudo parsear: ${r.razon}`);
  }
  console.log("");
}
