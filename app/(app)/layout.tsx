import { obtenerSesion } from "@/lib/sesion";
import { SidebarShell } from "@/components/SidebarShell";

// Envuelve las secciones del panel con el sidebar. /login queda fuera de este
// grupo, así que no lo dibuja.
export const dynamic = "force-dynamic";

export default async function LayoutPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const { modo, email } = await obtenerSesion();
  return (
    <SidebarShell modo={modo} email={email}>
      {children}
    </SidebarShell>
  );
}
