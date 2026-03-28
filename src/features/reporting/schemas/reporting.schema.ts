import { z } from "zod";

// --- KPI Snapshot ---
export const KpiSnapshotSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  period_type: z.string(),
  period_date: z.string(),
  data: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});
export type KpiSnapshot = z.infer<typeof KpiSnapshotSchema>;

// --- Alert ---
export const AlertSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  alert_type: z.string(),
  severity: z.string(),
  title: z.string(),
  message: z.string().nullable(),
  entity_type: z.string().nullable(),
  entity_id: z.string().uuid().nullable(),
  is_dismissed: z.boolean(),
  dismissed_by: z.string().uuid().nullable(),
  dismissed_at: z.string().nullable(),
  created_at: z.string(),
});
export type Alert = z.infer<typeof AlertSchema>;

// --- Alert Rule ---
export const AlertRuleSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  name: z.string(),
  alert_type: z.string(),
  condition_config: z.record(z.string(), z.unknown()),
  severity: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AlertRule = z.infer<typeof AlertRuleSchema>;

// --- Dashboard Data (RPC response) ---
export const DashboardCurrentSchema = z.object({
  events_confirmed: z.number(),
  events_today: z.number(),
  events_upcoming_7d: z.number(),
  tasks_pending: z.number(),
  tasks_blocked: z.number(),
  recipes_pending_review: z.number(),
  po_pending: z.number(),
  stock_expiring_3d: z.number(),
  alerts_active: z.number(),
  jobs_failed: z.number(),
});
export type DashboardCurrent = z.infer<typeof DashboardCurrentSchema>;
