"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/lib/sidebar-context";

export function MobileHeader() {
  const { toggleMobile } = useSidebar();

  return (
    <header className="flex h-14 items-center border-b bg-background px-4 lg:hidden">
      <button
        onClick={toggleMobile}
        className="rounded-md p-2 hover:bg-accent transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="ml-3 font-semibold">
        Chef<span className="text-orange-500">OS</span>
      </span>
    </header>
  );
}
