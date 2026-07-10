import { obtenerTransacciones } from "@/lib/datos";
import { PanelInteractivo } from "@/components/PanelInteractivo";

// Se renderiza en cada petición para reflejar siempre los datos actuales del
// usuario con sesión (si fuera estático, mostraría los del momento del build).
export const dynamic = "force-dynamic";

export default async function Panel() {
  const { txs, categorias, modo, email } = await obtenerTransacciones();
  return (
    <PanelInteractivo
      txsIniciales={txs}
      categoriasIniciales={categorias}
      modo={modo}
      userEmail={email}
    />
  );
}
