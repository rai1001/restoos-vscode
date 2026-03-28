"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/sidebar-context";
import { UserMenu } from "@/components/user-menu";
import { MobileHeader } from "@/components/mobile-header";
import { FAB } from "@/components/fab";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col transition-all duration-200",
        collapsed ? "lg:pl-16" : "lg:pl-64"
      )}
    >
      {/* Mobile header — only visible below lg */}
      <MobileHeader />

      {/* Desktop top bar — only visible at lg+ */}
      <header className="hidden lg:flex h-14 items-center justify-end border-b px-6">
        <UserMenu />
      </header>

      <main className="flex-1 p-4 md:p-6">{children}</main>

      {/* FAB for mobile/tablet quick actions */}
      <FAB />
    </div>
  );
}
