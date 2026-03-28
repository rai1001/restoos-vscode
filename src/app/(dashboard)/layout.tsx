import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/lib/sidebar-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { FeedbackButtonWrapper } from "@/features/feedback/components/FeedbackButtonWrapper";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar />
      <DashboardShell>{children}</DashboardShell>
      <FeedbackButtonWrapper />
    </SidebarProvider>
  );
}
