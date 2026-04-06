import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://restoos.app";

export const metadata: Metadata = {
  title: "RestoOS — Tu cocina bajo control, tu negocio en crecimiento",
  description:
    "Plataforma integral para restaurantes independientes. Controla costes, inventario, recetas y proveedores desde una sola pantalla. APPCC digital, 6 agentes IA y escandallo automático.",
  openGraph: {
    title: "RestoOS — Gestión integral de restaurantes",
    description:
      "Controla costes, inventario, recetas y proveedores. APPCC digital, 6 agentes IA, escandallo automático. Desde 99 €/mes.",
    url: `${BASE_URL}/landing`,
    siteName: "RestoOS",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RestoOS — Gestión integral de restaurantes",
    description:
      "Controla costes, inventario, recetas y proveedores. Desde 99 €/mes.",
  },
  alternates: {
    canonical: `${BASE_URL}/landing`,
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
