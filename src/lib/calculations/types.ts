/**
 * @module calculations/types
 * @description Engine-specific types (independent of Supabase/Zod schemas).
 *
 * These are the "universal" types the calculation engines work with.
 * They bridge the OLD CULINARY engine types with the NEW RestoOS app types.
 * Pure data structures — no runtime dependencies.
 */

// ─── Shared primitives ──────────────────────────────────────

export interface MeasurementUnit {
  id: string;
  name: string;
  abbreviation: string;
}

export type AllergenCode =
  | "gluten"
  | "crustaceos"
  | "huevos"
  | "pescado"
  | "cacahuetes"
  | "soja"
  | "lacteos"
  | "frutos_cascara"
  | "apio"
  | "mostaza"
  | "sesamo"
  | "sulfitos"
  | "altramuces"
  | "moluscos";

// ─── Recipe types for engine consumption ────────────────────

export interface RecipeIngredientCalc {
  id: string;
  product_id: string | null;
  product_name: string;
  sub_recipe_id: string | null;
  quantity: number;
  unit: MeasurementUnit;
  unit_id: string;
  waste_percent: number; // 0-1
  catalog_entry_id?: string | null;
  notes?: string | null;
}

export interface RecipeCalc {
  id: string;
  name: string;
  servings: number;
  category?: string | null;
  ingredients: RecipeIngredientCalc[];
}

export interface RecipeMap {
  [recipeId: string]: RecipeCalc & {
    ingredients: RecipeIngredientCalc[];
    servings: number;
  };
}

// ─── Product types for engine consumption ───────────────────

export interface ProductCalc {
  id: string;
  name: string;
  yield_percent: number; // 0-100 (85 = 15% waste)
  allergens: AllergenCode[];
}

export interface ProductMap {
  [productId: string]: ProductCalc;
}

// ─── Catalog & Pricing ──────────────────────────────────────

export interface VolumeDiscount {
  min_qty: number;
  unit_price: number;
}

export interface CatalogEntry {
  id: string;
  supplier_id: string;
  supplier_name: string;
  product_id: string;
  unit_price: number;
  min_order_qty: number;
  pack_size: number;
  is_preferred: boolean;
  volume_discounts: VolumeDiscount[];
}

export interface CatalogMap {
  [productId: string]: CatalogEntry[];
}

export interface PricingConfig {
  target_food_cost_pct: number; // 0-1 (e.g., 0.30)
  target_margin_pct: number;
  commercial_rounding: number; // e.g., 0.50
  channel_commissions: Record<string, number>;
}

// ─── Cost calculation results ───────────────────────────────

export interface IngredientCostLine {
  ingredient_id: string;
  product_name: string;
  quantity_recipe: number;
  quantity_with_waste: number;
  unit: MeasurementUnit;
  unit_cost: number;
  line_cost: number;
  waste_pct: number;
  allergens: AllergenCode[];
  is_sub_recipe: boolean;
  sub_recipe_cost?: RecipeCostResult;
}

export interface RecipeCostResult {
  recipe_id: string;
  recipe_name: string;
  total_cost: number;
  servings: number;
  cost_per_serving: number;
  food_cost_pct: number;
  suggested_pvp: number;
  margin_gross: number;
  allergens: AllergenCode[];
  lines: IngredientCostLine[];
}

// ─── Demand types ───────────────────────────────────────────

export interface EventWithMenu {
  event_id: string;
  name: string;
  date: string;
  pax: number;
  menu?: {
    items: { recipe_id: string; servings_per_pax?: number }[];
  };
}

export interface ForecastDay {
  date: string;
  expected_covers: number;
  menu_ids: string[];
}

export interface DemandLine {
  product_id: string;
  product_name: string;
  unit: MeasurementUnit;
  total_qty_needed: number;
  breakdown: { source: string; qty: number }[];
}

// ─── Procurement types ──────────────────────────────────────

export interface StockSnapshot {
  product_id: string;
  product_name: string;
  unit: MeasurementUnit;
  qty_available: number;
  qty_committed: number;
  safety_stock: number;
}

export interface PurchaseSuggestion {
  product_id: string;
  product_name: string;
  unit: MeasurementUnit;
  qty_needed: number;
  qty_in_stock: number;
  qty_committed: number;
  qty_to_order: number;
  suggested_supplier_id: string;
  suggested_supplier_name: string;
  estimated_cost: number;
  urgency: "normal" | "urgent" | "critical";
}

// ─── Margin / Pricing types ──────────────────────────────────

export type PricingChannel = "sala" | `delivery_${string}` | string;

export interface PricingRecommendation {
  channel: PricingChannel;
  pvp_by_food_cost: number;
  pvp_by_margin: number;
  pvp_recommended: number;
  effective_margin_pct: number;
}

export type MenuCategory = "star" | "workhorse" | "puzzle" | "dog";

export interface MenuEngineeringItem {
  recipe_id: string;
  recipe_name: string;
  category: MenuCategory;
  units_sold: number;
  food_cost_pct: number;
  margin_per_unit: number;
  revenue: number;
  recommendation: string;
}

// ─── Scaling types ───────────────────────────────────────────

export interface RecipeIngredient {
  product_id: string | null;
  sub_recipe_id?: string | null;
  product_name?: string;
  unit_id: string;
  unit?: MeasurementUnit;
  quantity: number;
  waste_percent?: number;
}

export interface ScaledIngredientLine {
  product_name: string;
  original_qty: number;
  scaled_qty: number;
  scaled_qty_with_waste: number;
  unit: MeasurementUnit;
  unit_cost: number;
  line_cost: number;
}

export interface ScaledRecipe {
  original_servings: number;
  target_servings: number;
  scale_factor: number;
  lines: ScaledIngredientLine[];
  total_cost: number;
  cost_per_serving: number;
}
