import { createClient } from "@/lib/db/client";
import type { Alert } from "../schemas/reporting.schema";

const supabase = createClient();

export const reportingService = {
  async getDashboardData(hotelId: string) {
    const { data, error } = await supabase.rpc("get_dashboard_data", {
      p_hotel_id: hotelId,
    });
    if (error) throw error;
    return data;
  },

  async generateSnapshot(hotelId: string, date?: string) {
    const { data, error } = await supabase.rpc("generate_daily_snapshot", {
      p_hotel_id: hotelId,
      p_date: date ?? new Date().toISOString().split("T")[0],
    });
    if (error) throw error;
    return data;
  },

  async checkAlertThresholds(hotelId: string) {
    const { data, error } = await supabase.rpc("check_alert_thresholds", {
      p_hotel_id: hotelId,
    });
    if (error) throw error;
    return data;
  },

  async dismissAlert(hotelId: string, alertId: string) {
    const { data, error } = await supabase.rpc("dismiss_alert", {
      p_hotel_id: hotelId,
      p_alert_id: alertId,
    });
    if (error) throw error;
    return data;
  },

  async listAlerts(hotelId: string, dismissed?: boolean): Promise<Alert[]> {
    let query = supabase
      .from("alerts")
      .select("*")
      .eq("hotel_id", hotelId);
    if (dismissed !== undefined) query = query.eq("is_dismissed", dismissed);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  },
};
