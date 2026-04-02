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

export const metadata: Metadata = {
  title: "RestoOS",
  description:
    "Plataforma SaaS para gestión integral de restaurantes",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RestoOS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#09090b" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
      </head>
      <body
        className={`${dmSans.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <PWARegister />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
