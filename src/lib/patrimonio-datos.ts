// Lectura del balance general (servidor). Si Supabase no está configurado, o
// las tablas de patrimonio aún no existen (el usuario no ha corrido el SQL),
// degrada a vacío sin romper el panel — nunca lanza un error visible.

import { crearClienteServidor } from "./supabase-server";
import { supabaseConfigurado } from "./supabase";
import type { CuentaPatrimonio, SaldoRegistro } from "./patrimonio-tipos";

export interface DatosPatrimonio {
  cuentas: CuentaPatrimonio[];
  saldos: SaldoRegistro[];
}

const VACIO: DatosPatrimonio = { cuentas: [], saldos: [] };

// Datos de demostración: una cuenta bancaria, efectivo y una "me deben", con
// un par de actualizaciones para que la tendencia se vea con datos.
function generarDemoPatrimonio(): DatosPatrimonio {
  const cuentas: CuentaPatrimonio[] = [
    { id: "demo-banco", nombre: "Bancolombia Ahorros", tipo: "cuenta" },
    { id: "demo-efectivo", nombre: "Efectivo", tipo: "cuenta" },
    { id: "demo-juan", nombre: "Juan Pérez", tipo: "por_cobrar" },
  ];
  const saldos: SaldoRegistro[] = [
    { id: "d1", cuentaId: "demo-banco", saldo: 3200000, fecha: "2026-05-15", creadoEn: "2026-05-15T12:00:00Z" },
    { id: "d2", cuentaId: "demo-efectivo", saldo: 150000, fecha: "2026-05-20", creadoEn: "2026-05-20T12:00:00Z" },
    { id: "d3", cuentaId: "demo-banco", saldo: 2800000, fecha: "2026-06-20", creadoEn: "2026-06-20T12:00:00Z" },
    { id: "d4", cuentaId: "demo-juan", saldo: 150000, fecha: "2026-06-25", creadoEn: "2026-06-25T12:00:00Z" },
    { id: "d5", cuentaId: "demo-efectivo", saldo: 220000, fecha: "2026-07-05", creadoEn: "2026-07-05T12:00:00Z" },
  ];
  return { cuentas, saldos };
}

export async function obtenerPatrimonio(): Promise<DatosPatrimonio> {
  if (!supabaseConfigurado()) return generarDemoPatrimonio();

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return VACIO;

  try {
    const [{ data: cuentasRaw, error: e1 }, { data: saldosRaw, error: e2 }] =
      await Promise.all([
        supabase
          .from("patrimonio_cuentas")
          .select("id, nombre, tipo")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("patrimonio_saldos")
          .select("id, cuenta_id, saldo, fecha, created_at")
          .eq("user_id", user.id)
          .order("fecha", { ascending: true }),
      ]);

    if (e1 || e2) {
      // Probable causa: las tablas aún no existen (falta correr db/schema.sql).
      console.error("Error leyendo patrimonio:", e1?.message ?? e2?.message);
      return VACIO;
    }

    const cuentas: CuentaPatrimonio[] = (cuentasRaw ?? []).map((c) => ({
      id: String(c.id),
      nombre: String(c.nombre),
      tipo: c.tipo === "por_cobrar" ? "por_cobrar" : "cuenta",
    }));
    const saldos: SaldoRegistro[] = (saldosRaw ?? []).map((s) => ({
      id: String(s.id),
      cuentaId: String(s.cuenta_id),
      saldo: Number(s.saldo),
      fecha: String(s.fecha),
      creadoEn: String(s.created_at),
    }));

    return { cuentas, saldos };
  } catch (e) {
    console.error("Error leyendo patrimonio:", (e as Error).message);
    return VACIO;
  }
}
