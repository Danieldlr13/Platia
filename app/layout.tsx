import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Platia — Gastos claros",
    template: "%s · Platia",
  },
  description:
    "Platia consolida tus gastos de Bancolombia y te muestra a dónde va tu plata.",
  metadataBase: new URL("https://platia-nu.vercel.app"),
};

export const viewport: Viewport = {
  themeColor: "#00C389",
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
