// Verifica en Supabase las transacciones de UBER RIDES para confirmar
// que no quedan registros con tarjeta "Desconocido".
// Uso: npx tsx scripts/verificar-uber-supabase.ts

import "../src/lib/env";
import { crearClienteServicio } from "../src/lib/supabase";

function requerir(n: string) {
  const v = process.env[n]; if (!v) throw new Error(`Falta: ${n}`); return v;
}

import { describirError } from "../src/ingest/log-seguro";

const supabase = crearClienteServicio();
const userId = requerir("CUENTAS_USER_ID");

const { data, error } = await supabase
  .from("transacciones")
  .select("id, tarjeta")
  .eq("user_id", userId)
  .eq("comercio", "UBER RIDES")
  .order("fecha", { ascending: true });

if (error) {
  console.error(`Error al consultar (${describirError(error)})`);
  process.exit(1);
}

// Solo conteos: no se imprimen fechas, montos ni medios de pago.
console.log(`\nUBER RIDES en Supabase: ${data.length} registros`);

let desconocidos = 0;
for (const tx of data) {
  if (String(tx.tarjeta ?? "null") === "Desconocido") desconocidos++;
}

if (desconocidos === 0) {
  console.log("\n✅ Sin registros 'Desconocido'. Todos los métodos de pago están correctos.");
} else {
  console.log(`\n⚠️  Aún hay ${desconocidos} registro(s) con tarjeta 'Desconocido'.`);
}
