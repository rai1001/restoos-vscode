"use client";

import Link from "next/link";
import { Building2, Users2, Bell, ChevronRight } from "lucide-react";

const SETTINGS_SECTIONS = [
  {
    title: "Restaurante",
    description: "Nombre, zona horaria, moneda y datos generales del establecimiento.",
    href: "/settings/hotel",
    icon: Building2,
  },
  {
    title: "Equipo",
    description: "Gestiona los miembros, roles y permisos del equipo.",
    href: "/settings/team",
    icon: Users2,
  },
  {
    title: "Notificaciones",
    description: "Resumen diario por email o WhatsApp con alertas, caducidades y pedidos sugeridos.",
    href: "/settings/notifications",
    icon: Bell,
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316] mb-1">
          CONFIGURACION
        </p>
        <h1 className="text-3xl font-bold text-[#E5E2E1]">Ajustes</h1>
        <p className="text-[#A78B7D] text-sm mt-1">
          Configura tu establecimiento y equipo
        </p>
      </div>

      {/* Section cards */}
      <div className="space-y-4">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <div className="group rounded-lg bg-[#1A1A1A] p-5 flex items-center gap-4 transition-colors hover:bg-[#222] cursor-pointer">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10">
                  <Icon className="h-5 w-5 text-[#F97316]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#E5E2E1]">{section.title}</p>
                  <p className="text-xs text-[#A78B7D] mt-0.5">{section.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#A78B7D] group-hover:text-[#F97316] transition-colors shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
