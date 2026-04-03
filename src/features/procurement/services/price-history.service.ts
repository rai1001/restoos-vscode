import { createClient } from "@/lib/db/client";

const supabase = createClient();

export interface PriceHistoryEntry {
  id: string;
  hotel_id: string;
  product_id: string;
  supplier_id: string;
  unit_price: number;
  unit_id: string | null;
  quantity: number | null;
  date: string;
  source: "receipt" | "ocr" | "manual";
  order_id: string | null;
  receipt_id: string | null;
  created_at: string;
}

export interface PriceStats {
  productId: string;
  avg: number;
  min: number;
  max: number;
  latest: number;
  count: number;
  trend: "up" | "down" | "stable";
  changePercent: number;
}

export const priceHistoryService = {
  async getPriceHistory(
    hotelId: string,
    productId: string,
    filters: { supplierId?: string; dateFrom?: string; dateTo?: string } = {}
  ): Promise<PriceHistoryEntry[]> {
    let query = supabase
      .from("price_history")
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("product_id", productId)
      .order("date", { ascending: true });

    if (filters.supplierId) query = query.eq("supplier_id", filters.supplierId);
    if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("date", filters.dateTo);

    const { data, error } = await query.limit(500);
    if (error) throw error;
    return data ?? [];
  },

  async getLatestPrices(
    hotelId: string,
    productIds: string[]
  ): Promise<Map<string, { unitPrice: number; supplierId: string; date: string; source: string }>> {
    const result = new Map<string, { unitPrice: number; supplierId: string; date: string; source: string }>();
    if (productIds.length === 0) return result;

    // Get the latest price for each product using distinct on
    const { data, error } = await supabase
      .from("price_history")
      .select("product_id, unit_price, supplier_id, date, source")
      .eq("hotel_id", hotelId)
      .in("product_id", productIds)
      .order("product_id")
      .order("date", { ascending: false })
      .limit(productIds.length * 3); // get a few per product to ensure coverage

    if (error) throw error;

    // Keep only the latest per product
    for (const row of data ?? []) {
      if (!result.has(row.product_id)) {
        result.set(row.product_id, {
          unitPrice: row.unit_price,
          supplierId: row.supplier_id,
          date: row.date,
          source: row.source,
        });
      }
    }

    return result;
  },

  async getPriceStats(
    hotelId: string,
    productId: string
  ): Promise<PriceStats | null> {
    const { data, error } = await supabase
      .from("price_history")
      .select("unit_price, date")
      .eq("hotel_id", hotelId)
      .eq("product_id", productId)
      .order("date", { ascending: true })
      .limit(200);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const prices = data.map((d) => d.unit_price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const latest = prices[prices.length - 1]!;

    // Trend: compare last 7 entries avg vs previous 7
    let trend: "up" | "down" | "stable" = "stable";
    let changePercent = 0;

    if (prices.length >= 4) {
      const mid = Math.floor(prices.length / 2);
      const recentAvg = prices.slice(mid).reduce((a, b) => a + b, 0) / (prices.length - mid);
      const olderAvg = prices.slice(0, mid).reduce((a, b) => a + b, 0) / mid;

      if (olderAvg > 0) {
        changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
        if (changePercent > 3) trend = "up";
        else if (changePercent < -3) trend = "down";
      }
    }

    return {
      productId,
      avg,
      min,
      max,
      latest,
      count: prices.length,
      trend,
      changePercent,
    };
  },

  async getPriceAlerts(
    hotelId: string,
    thresholdPercent: number = 15
  ): Promise<Array<{ productId: string; productName: string; latest: number; avg30d: number; changePercent: number }>> {
    // Get all products with price history in the last 60 days
    const { data, error } = await supabase
      .from("price_history")
      .select("product_id, unit_price, date, products(name)")
      .eq("hotel_id", hotelId)
      .gte("date", new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10))
      .order("product_id")
      .order("date", { ascending: true })
      .limit(1000);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Group by product and calculate alerts
    const byProduct = new Map<string, { name: string; prices: { price: number; date: string }[] }>();
    for (const row of data) {
      const pid = row.product_id;
      if (!byProduct.has(pid)) {
        const productName = ((row as Record<string, unknown>).products as { name: string } | null)?.name ?? "Desconocido";
        byProduct.set(pid, { name: productName, prices: [] });
      }
      byProduct.get(pid)!.prices.push({ price: row.unit_price, date: row.date });
    }

    const alerts: Array<{ productId: string; productName: string; latest: number; avg30d: number; changePercent: number }> = [];

    for (const [productId, { name, prices }] of byProduct) {
      if (prices.length < 2) continue;
      const latest = prices[prices.length - 1]!.price;
      const avg30d = prices.reduce((a, b) => a + b.price, 0) / prices.length;
      const change = ((latest - avg30d) / avg30d) * 100;

      if (Math.abs(change) >= thresholdPercent) {
        alerts.push({ productId, productName: name, latest, avg30d, changePercent: change });
      }
    }

    return alerts.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  },

  async insertManualPrice(
    hotelId: string,
    productId: string,
    supplierId: string,
    unitPrice: number,
    unitId?: string
  ) {
    const { data, error } = await supabase
      .from("price_history")
      .insert({
        hotel_id: hotelId,
        product_id: productId,
        supplier_id: supplierId,
        unit_price: unitPrice,
        unit_id: unitId ?? null,
        date: new Date().toISOString().slice(0, 10),
        source: "manual",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
