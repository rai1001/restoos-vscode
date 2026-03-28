"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/db/client";
import { useActiveHotel } from "@/lib/auth/hooks";

// ── Types matching the get_dashboard_data RPC response ───────────────────────

export interface DashboardCurrent {
  events_confirmed: number;
  events_today: number;
  events_upcoming_7d: number;
  tasks_pending: number;
  tasks_blocked: number;
  recipes_pending_review: number;
  po_pending: number;
  stock_expiring_3d: number;
  alerts_active: number;
  jobs_failed: number;
}

export interface DashboardEvent {
  id: string;
  name: string;
  event_date: string;
  guest_count: number;
  status: "confirmed" | "in_operation" | "pending_confirmation";
}

export interface DashboardAlert {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  alert_type: string;
  created_at: string;
}

export interface DashboardBlockedTask {
  id: string;
  title: string;
  department: string;
  blocked_reason: string | null;
}

export interface SnapshotDay {
  date: string;
  data: Record<string, number>;
}

export interface DashboardData {
  current: DashboardCurrent;
  trend_7d: SnapshotDay[];
  upcoming_events: DashboardEvent[];
  active_alerts: DashboardAlert[];
  blocked_tasks: DashboardBlockedTask[];
}

// ── Hook ─────────────────────────────────────────────────────────────────────

// Cliente creado fuera del hook — una sola instancia, no se recrea en cada render
const supabase = createClient();

export function useDashboardData() {
  const { hotelId, loading: hotelLoading } = useActiveHotel();
  const queryClient = useQueryClient();

  const query = useQuery<DashboardData>({
    queryKey: ["dashboard", hotelId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_data", {
        p_hotel_id: hotelId!,
      });
      if (error) throw error;
      return data as DashboardData;
    },
    enabled: !hotelLoading && !!hotelId,
    staleTime: 60_000,        // Datos válidos 1 min — evita refetch en cada foco de ventana
    refetchInterval: 5 * 60_000, // Refresca cada 5 min en background
  });

  return {
    data: query.data ?? null,
    loading: hotelLoading || query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["dashboard", hotelId] }),
  };
}
