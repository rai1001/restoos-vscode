import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────

export const TICKET_TYPE = {
  BUG: "bug",
  DESIGN: "design",
  FEATURE: "feature",
  OTHER: "other",
} as const;
export type TicketType = (typeof TICKET_TYPE)[keyof typeof TICKET_TYPE];

export const TICKET_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  NEEDS_INFO: "needs_info",
} as const;
export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;
export type TicketPriority = (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

// ─── Schema ─────────────────────────────────────────────────

export const FeedbackTicketSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  screenshot_url: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  created_by: z.string().uuid().nullable(),
  created_by_name: z.string().nullable(),
  created_by_email: z.string().nullable(),
  admin_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  resolved_at: z.string().nullable(),
});
export type FeedbackTicket = z.infer<typeof FeedbackTicketSchema>;

// ─── Form schema ────────────────────────────────────────────

export const CreateTicketSchema = z.object({
  type: z.enum(["bug", "design", "feature", "other"], { message: "Selecciona un tipo" }),
  title: z.string().min(1, "Titulo obligatorio").max(80, "Maximo 80 caracteres"),
  description: z.string().min(1, "Descripcion obligatoria").max(500, "Maximo 500 caracteres"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});
export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;

export const UpdateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "needs_info"]).optional(),
  admin_notes: z.string().max(2000).optional(),
});
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;

// ─── UI constants ───────────────────────────────────────────

export const TYPE_CONFIG: Record<TicketType, { label: string; emoji: string; color: string }> = {
  bug: { label: "Bug", emoji: "🐛", color: "text-[var(--alert-critical)]" },
  design: { label: "Diseño", emoji: "🎨", color: "text-purple-500" },
  feature: { label: "Funcionalidad", emoji: "✨", color: "text-blue-500" },
  other: { label: "Otro", emoji: "💬", color: "text-gray-500" },
};

export const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: "Abierto", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-950/30" },
  in_progress: { label: "En progreso", color: "text-[var(--alert-warning)] dark:text-[var(--alert-warning)]", bgColor: "bg-[var(--alert-warning)]/10 dark:bg-[var(--alert-warning)]/10" },
  resolved: { label: "Resuelto", color: "text-[var(--alert-ok)] dark:text-[var(--alert-ok)]", bgColor: "bg-[var(--alert-ok)]/10 dark:bg-[var(--alert-ok)]/10" },
  needs_info: { label: "Necesita info", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-100 dark:bg-orange-950/30" },
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: "Baja", color: "text-gray-500" },
  medium: { label: "Media", color: "text-[var(--alert-warning)]" },
  high: { label: "Alta", color: "text-[var(--alert-critical)]" },
};
