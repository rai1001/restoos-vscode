import { createClient } from "@/lib/db/client";
import type { MenuDish } from "../types";

const supabase = createClient();

/**
 * Fetch dishes with sales data for menu engineering analysis.
 * Joins recipes (with cost) + aggregated sales_data (units sold, revenue).
 */
export const menuEngineeringService = {
  async getDishes(
    hotelId: string,
    startDate?: string,
    endDate?: string
  ): Promise<MenuDish[]> {
    // Get recipes with cost data
    const { data: recipes, error: recipeError } = await supabase
      .from("recipes")
      .select("id, hotel_id, name, category, servings, total_cost, cost_per_serving, prep_time_min, cook_time_min, status, created_at")
      .eq("hotel_id", hotelId)
      .in("status", ["approved", "draft", "review_pending"])
      .order("name");
    if (recipeError) throw recipeError;

    // Get aggregated sales data
    let salesQuery = supabase
      .from("sales_data")
      .select("recipe_id, quantity_sold, unit_price")
      .eq("hotel_id", hotelId);

    if (startDate) salesQuery = salesQuery.gte("sale_date", startDate);
    if (endDate) salesQuery = salesQuery.lte("sale_date", endDate);

    const { data: sales, error: salesError } = await salesQuery;
    if (salesError) throw salesError;

    // Aggregate sales by recipe
    const salesByRecipe: Record<string, { units: number; avgPrice: number }> = {};
    for (const s of sales ?? []) {
      const rid = s.recipe_id;
      if (!rid) continue;
      if (!salesByRecipe[rid]) {
        salesByRecipe[rid] = { units: 0, avgPrice: 0 };
      }
      salesByRecipe[rid]!.units += s.quantity_sold;
      salesByRecipe[rid]!.avgPrice = s.unit_price;
    }

    // Map to MenuDish format
    return (recipes ?? [])
      .filter((r) => (salesByRecipe[r.id]?.units ?? 0) > 0 || r.total_cost)
      .map((r) => {
        const sales = salesByRecipe[r.id];
        const sellingPrice = sales?.avgPrice ?? (r.cost_per_serving ? r.cost_per_serving * 3.3 : 15);
        const costPrice = r.cost_per_serving ?? 0;

        return {
          id: r.id,
          hotel_id: r.hotel_id,
          name: r.name,
          category: (r.category ?? "principales") as MenuDish["category"],
          selling_price: sellingPrice,
          cost_price: costPrice,
          units_sold: sales?.units ?? 0,
          is_active: r.status !== "archived",
          description: null,
          created_at: r.created_at,
          prep_time_min: r.prep_time_min ?? undefined,
          batch_size: r.servings,
          service_time_min: r.cook_time_min ?? undefined,
        };
      });
  },
};
