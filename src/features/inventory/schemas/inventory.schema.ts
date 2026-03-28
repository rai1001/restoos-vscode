import { z } from "zod";
import { STOCK_RESERVATION_STATUS, STOCK_MOVEMENT_TYPE } from "@/contracts/enums";

const reservationStatusValues = Object.values(STOCK_RESERVATION_STATUS) as [string, ...string[]];
const movementTypeValues = Object.values(STOCK_MOVEMENT_TYPE) as [string, ...string[]];

// --- Stock Lot ---
export const StockLotSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  product_id: z.string().uuid(),
  unit_id: z.string().uuid().nullable(),
  receipt_line_id: z.string().uuid().nullable(),
  lot_number: z.string().nullable(),
  initial_quantity: z.number(),
  current_quantity: z.number(),
  unit_cost: z.number(),
  expiry_date: z.string().nullable(),
  received_at: z.string(),
  created_at: z.string(),
});
export type StockLot = z.infer<typeof StockLotSchema>;

// --- Stock Movement ---
export const StockMovementSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  product_id: z.string().uuid(),
  lot_id: z.string().uuid().nullable(),
  movement_type: z.enum(movementTypeValues),
  quantity: z.number(),
  unit_id: z.string().uuid().nullable(),
  unit_cost: z.number().nullable(),
  reference_type: z.string().nullable(),
  reference_id: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
});
export type StockMovement = z.infer<typeof StockMovementSchema>;

// --- Stock Reservation ---
export const StockReservationSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  event_id: z.string().uuid(),
  product_id: z.string().uuid(),
  lot_id: z.string().uuid().nullable(),
  unit_id: z.string().uuid().nullable(),
  quantity_reserved: z.number(),
  quantity_consumed: z.number(),
  status: z.enum(reservationStatusValues),
  created_at: z.string(),
  updated_at: z.string(),
});
export type StockReservation = z.infer<typeof StockReservationSchema>;

// --- Stock Level (RPC response) ---
export const StockLevelSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  total_quantity: z.number(),
  lot_count: z.number(),
  earliest_expiry: z.string().nullable(),
});
export type StockLevel = z.infer<typeof StockLevelSchema>;
