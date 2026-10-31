// Valida el parser contra los correos .eml REALES de la carpeta del proyecto.
// Los .eml están gitignored (contienen datos financieros del cliente), así que
// esta prueba solo corre en local. Uso: `npm run ingest:eml`

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { simpleParser } from "mailparser";
import { parsearCorreo } from "../src/lib/parser";

const RAIZ = process.cwd();

const emls = (await readdir(RAIZ)).filter((f) => f.toLowerCase().endsWith(".eml"));

if (emls.length === 0) {
  console.log("No hay archivos .eml en la carpeta para probar.");
  process.exit(0);
}

console.log(`Encontrados ${emls.length} correos .eml\n`);

let gastos = 0;
let noGastos = 0;
let noParseados = 0;

for (const archivo of emls) {
  const crudo = await readFile(join(RAIZ, archivo));
  const correo = await simpleParser(crudo);
  const texto = correo.text ?? "";
  const r = parsearCorreo(texto);

  if (r.ok && r.movimiento) {
    if (r.esGasto) gastos++;
    else noGastos++;
  } else {
    noParseados++;
  }
}

// Solo conteos: los .eml reales traen datos financieros y no deben imprimirse.
console.log(
  `Resultado: ${gastos} gastos · ${noGastos} movimientos que no son gasto · ${noParseados} no parseados.`,
);
