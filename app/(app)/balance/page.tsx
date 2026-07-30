import { obtenerPatrimonio } from "@/lib/patrimonio-datos";
import { PanelBalance } from "@/components/PanelBalance";

export const metadata = { title: "Balance general" };
export const dynamic = "force-dynamic";

export default async function BalancePage() {
  const { cuentas, saldos } = await obtenerPatrimonio();
  return <PanelBalance cuentasIniciales={cuentas} saldosIniciales={saldos} />;
}
