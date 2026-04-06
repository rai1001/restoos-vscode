import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "@/lib/providers";
import { PWARegister } from "@/components/pwa-register";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://restoos.app";

export const metadata: Metadata = {
  title: {
    default: "RestoOS",
    template: "%s — RestoOS",
  },
  description:
    "Plataforma SaaS para gestión integral de restaurantes. Escandallos, APPCC, inventario, compras y 6 agentes IA.",
  metadataBase: new URL(BASE_URL),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RestoOS",
  },
  openGraph: {
    type: "website",
    siteName: "RestoOS",
    locale: "es_ES",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={dmSans.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#09090b" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <PWARegister />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
