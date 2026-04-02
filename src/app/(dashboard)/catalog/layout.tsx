"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const tabs = [
  { name: "Catalogo", href: "/catalog" },
  { name: "Productos", href: "/catalog/products" },
  { name: "Proveedores", href: "/catalog/suppliers" },
  { name: "Categorias", href: "/catalog/categories" },
  { name: "Unidades", href: "/catalog/units" },
];

export default function CatalogLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b border-card-hover">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/catalog"
              ? pathname === "/catalog"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
