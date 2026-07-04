import { obtenerGastosManuales } from "@/lib/gastos";
import { GastosCrud } from "@/components/GastosCrud";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gastos manuales" };

export default async function GastosPage() {
  const gastos = await obtenerGastosManuales();
  return <GastosCrud inicial={gastos} />;
}
