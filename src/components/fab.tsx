"use client";

import { useState } from "react";
import { Plus, ChefHat, CalendarDays, ShoppingCart, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const FAB_ACTIONS = [
  {
    icon: ChefHat,
    label: "Nueva receta",
    href: "/recipes/new",
    color: "bg-[var(--alert-ok)] hover:bg-[var(--alert-ok)]",
  },
  {
    icon: CalendarDays,
    label: "Nueva reserva",
    href: "/reservations",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    icon: ShoppingCart,
    label: "Nuevo pedido",
    href: "/procurement/orders",
    color: "bg-purple-500 hover:bg-purple-600",
  },
];

export function FAB() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col-reverse items-end gap-3 lg:hidden">
      {/* Action buttons — shown when open */}
      {open &&
        FAB_ACTIONS.map((action, i) => (
          <div
            key={action.href}
            className="flex items-center gap-2"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className="rounded-full bg-background border shadow px-2.5 py-1 text-xs font-medium whitespace-nowrap">
              {action.label}
            </span>
            <button
              onClick={() => {
                router.push(action.href);
                setOpen(false);
              }}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-all",
                action.color
              )}
              aria-label={action.label}
            >
              <action.icon className="h-5 w-5" />
            </button>
          </div>
        ))}

      {/* Main FAB button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all",
          open
            ? "bg-destructive text-white rotate-45"
            : "bg-primary hover:bg-primary/90 text-white"
        )}
        aria-label={open ? "Cerrar acciones" : "Acciones rápidas"}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
