import { obtenerTransacciones } from "@/lib/datos";
import { PanelInteractivo } from "@/components/PanelInteractivo";

// Se renderiza en cada petición para reflejar siempre los datos actuales de
// Supabase (si fuera estático, mostraría los datos del momento del build).
export const dynamic = "force-dynamic";

export default async function Panel() {
  const { txs, modo } = await obtenerTransacciones();
  return <PanelInteractivo txsIniciales={txs} modo={modo} />;
}
