"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Calculator,
  CalendarDays,
  ChefHat,
  ChevronLeft,
  LayoutDashboard,
  MessageSquare,
  MessageSquarePlus,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Users,
  Users2,
  UtensilsCrossed,
  Rocket,
  Warehouse,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCommandPalette } from "@/components/command-palette-provider";
import { HotelSwitcher } from "@/components/hotel-switcher";
import { useSidebar } from "@/lib/sidebar-context";
import { AssistantButton } from "@/features/assistant/components/AssistantButton";
import { AssistantPanel } from "@/features/assistant/components/AssistantPanel";

const navigation = [
  { name: "Setup inicial", href: "/onboarding", icon: Rocket },
  { name: "Modo Cocina", href: "/kitchen-mode", icon: ChefHat },
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Reservas", href: "/reservations", icon: CalendarDays },
  { name: "Clientes", href: "/clients", icon: Users },
  { name: "Recetas", href: "/recipes", icon: ChefHat },
  { name: "Menús", href: "/menus", icon: UtensilsCrossed },
  { name: "Ingeniería de Menú", href: "/menu-engineering", icon: BarChart3 },
  { name: "Escandallo", href: "/escandallo", icon: Calculator },
  { name: "Catálogo", href: "/catalog/products", icon: Package },
  { name: "Compras", href: "/procurement/orders", icon: ShoppingCart },
  { name: "Inventario", href: "/inventory", icon: Warehouse },
  { name: "Etiquetado", href: "/labeling", icon: Tag },
  { name: "APPCC", href: "/appcc", icon: ShieldCheck },
  { name: "Personal", href: "/staffing", icon: Users2 },
  { name: "Informes", href: "/reports", icon: BarChart3 },
  { name: "Mis tickets", href: "/my-tickets", icon: MessageSquare },
  { name: "Tickets", href: "/admin/tickets", icon: MessageSquarePlus },
  { name: "Pilotos", href: "/admin/setup-status", icon: BarChart3 },
  { name: "Registro cambios", href: "/admin/audit-log", icon: Search },
  { name: "Configuración", href: "/settings/hotel", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { open } = useCommandPalette();
  const { collapsed, mobileOpen, toggleCollapsed, setMobileOpen } = useSidebar();
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r bg-background transition-all duration-200",
          collapsed ? "w-16" : "w-64",
          // Mobile: hidden by default, shown when mobileOpen; desktop: always visible
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="flex h-14 items-center border-b px-3 shrink-0">
          {collapsed ? (
            <span className="font-bold text-orange-500 text-lg mx-auto">R</span>
          ) : (
            <span className="font-bold text-lg">
              Resto<span className="text-orange-500">OS</span>
            </span>
          )}
          {/* Collapse toggle — only on desktop (lg+) */}
          <button
            onClick={toggleCollapsed}
            className="ml-auto hidden lg:flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                collapsed && "rotate-180"
              )}
            />
          </button>
          {/* Close button — only on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto flex lg:hidden h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Hotel switcher — hidden when collapsed */}
        {!collapsed && (
          <div className="px-3 pt-2 shrink-0">
            <HotelSwitcher />
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {/* Search button */}
          {collapsed ? (
            <button
              onClick={open}
              title="Buscar (⌘K)"
              className="flex w-10 mx-auto items-center justify-center rounded-md border border-dashed p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mb-1"
            >
              <Search className="h-4 w-4 shrink-0" />
            </button>
          ) : (
            <button
              onClick={open}
              className="flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mb-1"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Buscar...</span>
              <kbd className="hidden lg:inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px]">
                ⌘K
              </kbd>
            </button>
          )}

          {/* AI Assistant */}
          <AssistantButton
            onClick={() => setAssistantOpen(true)}
            collapsed={collapsed}
          />

          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.name : undefined}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors",
                  collapsed
                    ? "justify-center px-0 w-10 mx-auto"
                    : "px-3",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: theme toggle */}
        <div
          className={cn(
            "border-t border-border p-3 shrink-0 flex items-center",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed && (
            <span className="text-xs text-muted-foreground">RestoOS</span>
          )}
          {/* ThemeToggle hidden — forced dark mode for demo */}
        </div>
      </aside>

      {/* AI Assistant Panel */}
      <AssistantPanel
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
      />
    </>
  );
}
