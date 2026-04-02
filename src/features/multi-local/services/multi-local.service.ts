import { createClient } from "@/lib/db/client";

const supabase = createClient();

export interface HotelOverview {
  hotel_id: string
  name: string
  slug: string
  products_count: number
  recipes_count: number
  recipes_approved: number
  suppliers_count: number
  stock_value: number
  stock_lots_count: number
  stock_expiring_3d: number
  waste_30d_cost: number
  po_pending: number
  appcc_today_pct: number
  appcc_today_status: string
  appcc_incidents_open: number
  alerts_active: number
}

export interface PriceComparison {
  product_name: string
  hotel_id: string
  hotel_name: string
  price: number
  unit: string
  supplier_name: string
}

export const multiLocalService = {
  async getTenantOverview(tenantId: string): Promise<HotelOverview[]> {
    const { data, error } = await supabase.rpc("get_tenant_overview", {
      p_tenant_id: tenantId,
    });
    if (error) throw error;
    return data ?? [];
  },

  async getPriceComparisons(tenantId: string): Promise<PriceComparison[]> {
    const { data, error } = await supabase.rpc("get_price_comparisons", {
      p_tenant_id: tenantId,
    });
    if (error) throw error;
    return data ?? [];
  },
};
