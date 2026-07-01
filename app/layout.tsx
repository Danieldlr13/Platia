import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CUENTAS — Mis gastos",
  description: "Seguimiento de gastos de Bancolombia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
