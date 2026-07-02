// Verifica en Supabase las transacciones de UBER RIDES para confirmar
// que no quedan registros con tarjeta "Desconocido".
// Uso: npx tsx scripts/verificar-uber-supabase.ts

import "../src/lib/env";
import { crearClienteServicio } from "../src/lib/supabase";

function requerir(n: string) {
  const v = process.env[n]; if (!v) throw new Error(`Falta: ${n}`); return v;
}

const supabase = crearClienteServicio();
const userId = requerir("CUENTAS_USER_ID");

const { data, error } = await supabase
  .from("transacciones")
  .select("id, fecha, monto, comercio, tarjeta, email_message_id")
  .eq("user_id", userId)
  .eq("comercio", "UBER RIDES")
  .order("fecha", { ascending: true });

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log(`\nUBER RIDES en Supabase: ${data.length} registros\n`);
console.log(`${"FECHA".padEnd(25)} ${"MONTO".padEnd(12)} TARJETA`);
console.log("─".repeat(65));

let desconocidos = 0;
for (const tx of data) {
  const tarjeta = String(tx.tarjeta ?? "null");
  if (tarjeta === "Desconocido") desconocidos++;
  const flag = tarjeta === "Desconocido" ? " ← ⚠️" : "";
  console.log(`${String(tx.fecha).slice(0, 23).padEnd(25)} $${String(tx.monto).padEnd(10)} ${tarjeta}${flag}`);
}

console.log("─".repeat(65));
if (desconocidos === 0) {
  console.log("\n✅ Sin registros 'Desconocido'. Todos los métodos de pago están correctos.");
} else {
  console.log(`\n⚠️  Aún hay ${desconocidos} registro(s) con tarjeta 'Desconocido'.`);
}
