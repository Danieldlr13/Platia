import { obtenerTransacciones } from "@/lib/datos";
import { obtenerPatrimonio } from "@/lib/patrimonio-datos";
import { PanelInteractivo } from "@/components/PanelInteractivo";

// Se renderiza en cada petición para reflejar siempre los datos actuales del
// usuario con sesión (si fuera estático, mostraría los del momento del build).
export const dynamic = "force-dynamic";

export default async function Panel() {
  const [{ txs, categorias, modo, email }, patrimonio] = await Promise.all([
    obtenerTransacciones(),
    obtenerPatrimonio(),
  ]);
  return (
    <PanelInteractivo
      txsIniciales={txs}
      categoriasIniciales={categorias}
      cuentasIniciales={patrimonio.cuentas}
      saldosIniciales={patrimonio.saldos}
      modo={modo}
      userEmail={email}
    />
  );
}
