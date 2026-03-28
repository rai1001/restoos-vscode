import { createClient } from "@/lib/db/client";
import type {
  StockLot,
  StockMovement,
  StockReservation,
} from "../schemas/inventory.schema";

const supabase = createClient();

export const inventoryService = {
  // --- Stock Levels ---
  async getStockLevels(hotelId: string) {
    const { data, error } = await supabase.rpc("get_stock_levels", {
      p_hotel_id: hotelId,
    });
    if (error) throw error;
    return data ?? [];
  },

  // --- Lots ---
  async listLots(hotelId: string, productId?: string): Promise<StockLot[]> {
    let query = supabase
      .from("stock_lots")
      .select("*")
      .eq("hotel_id", hotelId);
    if (productId) query = query.eq("product_id", productId);
    const { data, error } = await query.order("expiry_date", { ascending: true }).limit(200);
    if (error) throw error;
    return data ?? [];
  },

  // --- Movements ---
  async listMovements(hotelId: string, productId?: string): Promise<StockMovement[]> {
    let query = supabase
      .from("stock_movements")
      .select("*")
      .eq("hotel_id", hotelId);
    if (productId) query = query.eq("product_id", productId);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  },

  // --- Reservations ---
  async listReservations(hotelId: string, eventId?: string): Promise<StockReservation[]> {
    let query = supabase
      .from("stock_reservations")
      .select("*")
      .eq("hotel_id", hotelId);
    if (eventId) query = query.eq("event_id", eventId);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data ?? [];
  },

  async reserveStockForEvent(hotelId: string, eventId: string) {
    const { data, error } = await supabase.rpc("reserve_stock_for_event", {
      p_hotel_id: hotelId,
      p_event_id: eventId,
    });
    if (error) throw error;
    return data;
  },

  async consumeStock(hotelId: string, reservationId: string, quantity: number) {
    const { data, error } = await supabase.rpc("consume_stock", {
      p_hotel_id: hotelId,
      p_reservation_id: reservationId,
      p_quantity: quantity,
    });
    if (error) throw error;
    return data;
  },

  async recordWaste(hotelId: string, productId: string, lotId: string, quantity: number, notes?: string) {
    const { data, error } = await supabase.rpc("record_waste", {
      p_hotel_id: hotelId,
      p_product_id: productId,
      p_lot_id: lotId,
      p_quantity: quantity,
      p_notes: notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  async calculateRealCost(hotelId: string, eventId: string) {
    const { data, error } = await supabase.rpc("calculate_real_cost", {
      p_hotel_id: hotelId,
      p_event_id: eventId,
    });
    if (error) throw error;
    return data;
  },

  async checkAlerts(hotelId: string, minDays?: number) {
    const { data, error } = await supabase.rpc("check_stock_alerts", {
      p_hotel_id: hotelId,
      p_min_days_to_expiry: minDays ?? 3,
    });
    if (error) throw error;
    return data;
  },
};
