import { obtenerCategoriasUsuario } from "@/lib/sesion";
import { PanelCategorias } from "@/components/PanelCategorias";

export const metadata = { title: "Categorías" };
export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const categorias = await obtenerCategoriasUsuario();
  return <PanelCategorias categoriasIniciales={categorias} />;
}
