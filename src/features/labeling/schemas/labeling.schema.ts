import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────

export const BATCH_STATUS = {
  ACTIVE: "active",
  CONSUMED: "consumed",
  EXPIRED: "expired",
  DISCARDED: "discarded",
} as const;

export type BatchStatus = (typeof BATCH_STATUS)[keyof typeof BATCH_STATUS];

export const ALERT_TYPE = {
  EXPIRY_72H: "expiry_72h",
  EXPIRY_48H: "expiry_48h",
  EXPIRY_24H: "expiry_24h",
  EXPIRED: "expired",
  LOW_QUANTITY: "low_quantity",
} as const;

export type AlertType = (typeof ALERT_TYPE)[keyof typeof ALERT_TYPE];

// ─── Schemas ────────────────────────────────────────────────

export const PrepBatchSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  prep_id: z.string().uuid().nullable(),
  prep_name: z.string(),
  batch_code: z.string(),
  quantity: z.number(),
  unit: z.string(),
  location: z.string().nullable(),
  station: z.string().nullable(),
  chef_id: z.string().uuid().nullable(),
  chef_name: z.string().nullable(),
  allergens: z.array(z.string()),
  shelf_life_days: z.number().nullable(),
  elaboration_date: z.string(),
  expiry_date: z.string(),
  status: z.string(),
  consumed_qty: z.number(),
  label_printed: z.boolean(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PrepBatch = z.infer<typeof PrepBatchSchema>;

export const PrepAlertSchema = z.object({
  id: z.string().uuid(),
  batch_id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  alert_type: z.string(),
  triggered_at: z.string(),
  dismissed: z.boolean(),
  dismissed_by: z.string().uuid().nullable(),
  dismissed_at: z.string().nullable(),
  prep_batches: z
    .object({
      prep_name: z.string(),
      batch_code: z.string(),
      expiry_date: z.string(),
      quantity: z.number(),
      unit: z.string(),
    })
    .optional(),
});
export type PrepAlert = z.infer<typeof PrepAlertSchema>;

// ─── Form types ─────────────────────────────────────────────

export const LabelFormSchema = z.object({
  prep_id: z.string().uuid().optional(),
  prep_name: z.string().min(1, "Nombre obligatorio"),
  quantity: z.coerce.number().positive("Cantidad debe ser > 0"),
  unit: z.string().min(1),
  location: z.string().min(1, "Ubicacion obligatoria"),
  station: z.string().min(1, "Partida obligatoria"),
  shelf_life_days: z.coerce.number().int().positive("Dias de vida util obligatorios"),
  elaboration_date: z.string().min(1, "Fecha de elaboracion obligatoria"),
  allergens: z.array(z.string()),
  notes: z.string().optional(),
});
export type LabelFormData = z.infer<typeof LabelFormSchema>;

export interface PrepBatchFilters {
  status?: BatchStatus | "all";
  station?: string;
  search?: string;
}

// ─── Constants ──────────────────────────────────────────────

export const UNITS = ["kg", "g", "L", "ml", "uds", "porciones"] as const;

export const LOCATIONS = [
  "Camara 1",
  "Camara 2",
  "Linea caliente",
  "Linea fria",
  "Pasteleria",
  "Otro",
] as const;

export const STATIONS = [
  "Cuarto frio",
  "Caliente",
  "Pasteleria",
  "Entremetier",
  "Garde Manger",
] as const;

export const EU_ALLERGENS = [
  { id: "gluten", label: "Gluten", emoji: "🌾" },
  { id: "crustaceos", label: "Crustaceos", emoji: "🦐" },
  { id: "huevos", label: "Huevos", emoji: "🥚" },
  { id: "pescado", label: "Pescado", emoji: "🐟" },
  { id: "cacahuetes", label: "Cacahuetes", emoji: "🥜" },
  { id: "soja", label: "Soja", emoji: "🫘" },
  { id: "lacteos", label: "Lacteos", emoji: "🥛" },
  { id: "frutos_cascara", label: "Frutos de cascara", emoji: "🌰" },
  { id: "apio", label: "Apio", emoji: "🥬" },
  { id: "mostaza", label: "Mostaza", emoji: "🟡" },
  { id: "sesamo", label: "Sesamo", emoji: "⚪" },
  { id: "sulfitos", label: "Sulfitos", emoji: "🍷" },
  { id: "altramuces", label: "Altramuces", emoji: "🫛" },
  { id: "moluscos", label: "Moluscos", emoji: "🐚" },
] as const;
