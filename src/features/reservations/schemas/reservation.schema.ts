import { z } from "zod"

// ── Table ────────────────────────────────────────────────────────────────────

export const TableSchema = z.object({
  id: z.string(),
  hotel_id: z.string(),
  name: z.string(),
  zone: z.string(),
  capacity: z.number(),
  is_active: z.boolean(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
})

export type Table = z.infer<typeof TableSchema>

// ── Turn ─────────────────────────────────────────────────────────────────────

export const TurnSchema = z.object({
  id: z.string(),
  name: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  days: z.array(z.number()),
})

export type Turn = z.infer<typeof TurnSchema>

// ── Reservation ──────────────────────────────────────────────────────────────

export const ReservationStatusEnum = z.enum([
  "pending",
  "confirmed",
  "seated",
  "completed",
  "no_show",
  "cancelled",
])

export const ReservationSourceEnum = z.enum([
  "phone",
  "walk_in",
  "web",
  "app",
  "thefork",
])

export const ReservationSchema = z.object({
  id: z.string(),
  hotel_id: z.string(),
  customer_name: z.string(),
  customer_phone: z.string().optional(),
  customer_email: z.string().optional(),
  date: z.string(),
  time: z.string(),
  duration_min: z.number().optional(),
  pax: z.number(),
  table_id: z.string().optional(),
  status: ReservationStatusEnum,
  source: ReservationSourceEnum,
  notes: z.string().optional(),
  is_vip: z.boolean(),
  created_at: z.string(),
})

export type Reservation = z.infer<typeof ReservationSchema>
export type ReservationStatus = z.infer<typeof ReservationStatusEnum>
export type ReservationSource = z.infer<typeof ReservationSourceEnum>

// ── NewReservation (for form validation) ─────────────────────────────────────

export const NewReservationSchema = z.object({
  customer_name: z.string().min(1, "El nombre es obligatorio"),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal("")),
  date: z.string(),
  time: z.string(),
  duration_min: z.number().default(90),
  pax: z.number().min(1, "Mínimo 1 comensal"),
  table_id: z.string().optional(),
  source: ReservationSourceEnum.default("phone"),
  is_vip: z.boolean().default(false),
  notes: z.string().optional(),
})

export type NewReservation = z.infer<typeof NewReservationSchema>
