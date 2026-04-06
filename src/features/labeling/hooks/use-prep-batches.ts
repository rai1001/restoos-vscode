"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveHotel } from "@/lib/auth/hooks";
import {
  differenceInHours,
  isPast,
  parseISO,
  addDays,
  format,
} from "date-fns";
import { toast } from "sonner";
import {
  MOCK_PREP_BATCHES,
  MOCK_PREP_ALERTS,
} from "../mock/labeling-mock-data";
import type {
  PrepBatch,
  PrepAlert,
  PrepBatchFilters,
  LabelFormData,
  BatchStatus,
  AlertType,
} from "../schemas/labeling.schema";
import { BATCH_STATUS } from "../schemas/labeling.schema";

// ── Expiry status helpers (re-exported for use in UI) ─────────────────────────

export type ExpiryLevel =
  | "safe"
  | "expiry_72h"
  | "expiry_48h"
  | "expiry_24h"
  | "expired";

export function getExpiryLevel(expiryDate: string): ExpiryLevel {
  const expiry = parseISO(expiryDate);
  const now = new Date();

  if (isPast(expiry)) return "expired";

  const hoursLeft = differenceInHours(expiry, now);
  if (hoursLeft <= 24) return "expiry_24h";
  if (hoursLeft <= 48) return "expiry_48h";
  if (hoursLeft <= 72) return "expiry_72h";
  return "safe";
}

export function getRowTint(batch: PrepBatch): string {
  if (
    batch.status === BATCH_STATUS.CONSUMED ||
    batch.status === BATCH_STATUS.DISCARDED
  ) {
    return "bg-muted/40";
  }
  const level = getExpiryLevel(batch.expiry_date);
  switch (level) {
    case "expired":
      return "bg-[var(--alert-critical)]/10 dark:bg-[var(--alert-critical)]/10";
    case "expiry_24h":
      return "bg-[var(--alert-critical)]/10 dark:bg-[var(--alert-critical)]/10";
    case "expiry_48h":
      return "bg-[var(--alert-warning)]/10 dark:bg-[var(--alert-warning)]/10";
    case "expiry_72h":
      return "bg-[var(--alert-warning)]/10 dark:bg-[var(--alert-warning)]/10";
    default:
      return "bg-[var(--alert-ok)]/10 dark:bg-[var(--alert-ok)]/10";
  }
}

// ── Alert classification ──────────────────────────────────────────────────────

function classifyAlert(expiryDate: string): AlertType | null {
  const hoursUntilExpiry = differenceInHours(
    new Date(expiryDate),
    new Date()
  );
  if (hoursUntilExpiry < 0) return "expired";
  if (hoursUntilExpiry <= 24) return "expiry_24h";
  if (hoursUntilExpiry <= 48) return "expiry_48h";
  if (hoursUntilExpiry <= 72) return "expiry_72h";
  return null;
}

// ── Batch code generator ──────────────────────────────────────────────────────

function generateBatchCode(existing: PrepBatch[]): string {
  const today = format(new Date(), "yyyyMMdd");
  const seq = String(
    existing.filter((b) => b.batch_code.includes(today)).length + 1
  ).padStart(3, "0");
  return `BCH-${today}-${seq}`;
}

// ── In-memory mock stores (mutated in dev mode) ──────────────────────────────

let mockBatches: PrepBatch[] = [...MOCK_PREP_BATCHES];
let mockAlerts: PrepAlert[] = [...MOCK_PREP_ALERTS];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePrepBatches() {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const queryClient = useQueryClient();

  // --- Filters ---
  const [filters, setFilters] = useState<PrepBatchFilters>({
    status: "all",
    station: undefined,
    search: undefined,
  });

  // --- Generate missing alerts on mount (dev mode) ---
  useEffect(() => {
    if (!isDev || hotelId) return;
    const now = new Date().toISOString();
    const existingBatchIds = new Set(mockAlerts.map((a) => a.batch_id));

    for (const batch of mockBatches) {
      if (batch.status !== "active") continue;
      if (existingBatchIds.has(batch.id)) continue;

      const alertType = classifyAlert(batch.expiry_date);
      if (!alertType) continue;

      mockAlerts.push({
        id: crypto.randomUUID(),
        batch_id: batch.id,
        hotel_id: batch.hotel_id,
        alert_type: alertType,
        triggered_at: now,
        dismissed: false,
        dismissed_by: null,
        dismissed_at: null,
        prep_batches: {
          prep_name: batch.prep_name,
          batch_code: batch.batch_code,
          expiry_date: batch.expiry_date,
          quantity: batch.quantity,
          unit: batch.unit,
        },
      });
    }
  }, [isDev, hotelId]);

  // --- Query: batches ---
  const batchesQuery = useQuery({
    queryKey: ["prep-batches", hotelId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(mockBatches);
      // TODO: Supabase query
      return Promise.resolve([] as PrepBatch[]);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });

  // --- Query: alerts ---
  const alertsQuery = useQuery({
    queryKey: ["prep-alerts", hotelId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(mockAlerts);
      // TODO: Supabase query
      return Promise.resolve([] as PrepAlert[]);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });

  // --- Filtered batches ---
  const batches = useMemo(() => {
    const all = batchesQuery.data ?? [];
    return all.filter((b) => {
      if (
        filters.status &&
        filters.status !== "all" &&
        b.status !== filters.status
      )
        return false;
      if (filters.station && b.station !== filters.station) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          b.prep_name.toLowerCase().includes(q) ||
          b.batch_code.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [batchesQuery.data, filters]);

  // --- Active (not dismissed) alerts ---
  const alerts = useMemo(() => {
    return (alertsQuery.data ?? []).filter((a) => !a.dismissed);
  }, [alertsQuery.data]);

  const alertCount = alerts.length;

  // --- Mutations ---

  const createBatchMutation = useMutation({
    mutationFn: async (data: LabelFormData): Promise<PrepBatch> => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        await new Promise((r) => setTimeout(r, 300));
        const expiryDate = addDays(
          new Date(data.elaboration_date),
          data.shelf_life_days
        ).toISOString();

        const newBatch: PrepBatch = {
          id: crypto.randomUUID(),
          hotel_id: "00000000-0000-0000-0000-000000000001",
          prep_id: data.prep_id ?? null,
          prep_name: data.prep_name,
          batch_code: generateBatchCode(mockBatches),
          quantity: data.quantity,
          unit: data.unit,
          location: data.location,
          station: data.station,
          chef_id: null,
          chef_name: null,
          allergens: data.allergens,
          shelf_life_days: data.shelf_life_days,
          elaboration_date: data.elaboration_date,
          expiry_date: expiryDate,
          status: "active",
          consumed_qty: 0,
          label_printed: false,
          notes: data.notes ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        mockBatches = [newBatch, ...mockBatches];

        // Generate alert if applicable
        const alertType = classifyAlert(expiryDate);
        if (alertType) {
          mockAlerts.push({
            id: crypto.randomUUID(),
            batch_id: newBatch.id,
            hotel_id: newBatch.hotel_id,
            alert_type: alertType,
            triggered_at: new Date().toISOString(),
            dismissed: false,
            dismissed_by: null,
            dismissed_at: null,
            prep_batches: {
              prep_name: newBatch.prep_name,
              batch_code: newBatch.batch_code,
              expiry_date: expiryDate,
              quantity: newBatch.quantity,
              unit: newBatch.unit,
            },
          });
        }

        return newBatch;
      }
      // TODO: Supabase insert
      throw new Error("Supabase not configured");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prep-batches"] });
      queryClient.invalidateQueries({ queryKey: ["prep-alerts"] });
      toast.success("Lote creado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      consumedQty,
    }: {
      id: string;
      status: BatchStatus;
      consumedQty?: number;
    }) => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        await new Promise((r) => setTimeout(r, 200));
        mockBatches = mockBatches.map((b) =>
          b.id === id
            ? {
                ...b,
                status,
                consumed_qty: consumedQty ?? b.consumed_qty,
                updated_at: new Date().toISOString(),
              }
            : b
        );
        return;
      }
      // TODO: Supabase update
      throw new Error("Supabase not configured");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prep-batches"] });
      toast.success("Estado actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        await new Promise((r) => setTimeout(r, 150));
        mockAlerts = mockAlerts.map((a) =>
          a.id === alertId
            ? {
                ...a,
                dismissed: true,
                dismissed_at: new Date().toISOString(),
              }
            : a
        );
        return;
      }
      // TODO: Supabase update
      throw new Error("Supabase not configured");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prep-alerts"] });
      toast.success("Alerta descartada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // --- Public API ---

  const createBatch = useCallback(
    (data: LabelFormData) => createBatchMutation.mutateAsync(data),
    [createBatchMutation]
  );

  const updateBatchStatus = useCallback(
    (id: string, status: BatchStatus, consumedQty?: number) =>
      updateStatusMutation.mutateAsync({ id, status, consumedQty }),
    [updateStatusMutation]
  );

  const dismissAlert = useCallback(
    (alertId: string) => dismissAlertMutation.mutateAsync(alertId),
    [dismissAlertMutation]
  );

  return {
    batches,
    loading: batchesQuery.isLoading,
    error: batchesQuery.error?.message ?? null,
    createBatch,
    updateBatchStatus,
    dismissAlert,
    alerts,
    alertCount,
    filters,
    setFilters,
  };
}
