/**
 * @module demandEngine
 * @description Deterministic demand calculation engine.
 *
 * Explodes menus into ingredient-level demand by crossing:
 * - Events with assigned menus and pax counts
 * - Forecast covers for non-event days
 * - Recipe escandallos (ingredients + quantities + waste)
 *
 * Pure function — no side effects, no DB, no AI.
 *
 * **Business flow step 5-6**: "Sistema explota menu -> ingredientes -> demanda teorica"
 */

import type {
  EventWithMenu,
  ForecastDay,
  RecipeIngredientCalc,
  DemandLine,
  MeasurementUnit,
  RecipeMap,
  ProductMap,
} from "./types";

/** Aggregated demand for a single product across all sources */
interface DemandAccumulator {
  product_id: string;
  product_name: string;
  unit: MeasurementUnit;
  total_qty: number;
  breakdown: { source: string; qty: number }[];
}

/**
 * Calculates total ingredient demand from events and forecasts.
 *
 * For each event/forecast:
 * 1. Gets the assigned menu's recipes
 * 2. For each recipe, gets ingredients
 * 3. Multiplies ingredient qty x pax x (1 + waste%)
 * 4. If ingredient is a sub-recipe, recursively explodes it
 * 5. Aggregates by product_id across all sources
 *
 * @param events - Confirmed events with menus and pax
 * @param forecasts - Forecast days with expected covers
 * @param recipes - All recipes with ingredients
 * @param products - All products (for waste defaults)
 * @returns Aggregated demand per product, with breakdown by source
 *
 * @example
 * ```ts
 * const demand = calculateDemand(
 *   [{ event_id: "ev1", name: "Boda Garcia", date: "2026-03-15", pax: 120,
 *      menu: { items: [{ recipe_id: "r1", servings_per_pax: 1 }] } }],
 *   [],
 *   recipeMap,
 *   productMap
 * );
 * // demand[0] -> { product_id: "arroz", total_qty_needed: 48, ... }
 * ```
 */
export function calculateDemand(
  events: EventWithMenu[],
  forecasts: ForecastDay[],
  recipes: RecipeMap,
  products: ProductMap,
): DemandLine[] {
  const accumulator = new Map<string, DemandAccumulator>();

  // Process events
  for (const event of events) {
    const menuItems = event.menu?.items ?? [];
    for (const menuItem of menuItems) {
      const recipe = recipes[menuItem.recipe_id];
      if (!recipe) continue;

      // Each menu item serves 1 portion per pax by default
      const totalServings = event.pax;
      explodeRecipeIntoDemand(
        recipe.ingredients,
        totalServings,
        recipe.servings,
        `Evento: ${event.name} (${event.pax} pax)`,
        recipes,
        products,
        accumulator,
        new Set(),
      );
    }
  }

  // Process forecasts
  for (const forecast of forecasts) {
    for (const menuId of forecast.menu_ids) {
      // Find recipes associated with this menu
      // In a real system, a menu maps to recipes — here we assume
      // the recipes map contains entries whose IDs match or are referenced
      const menuRecipes = Object.values(recipes).filter(
        (r) => r.category === menuId || r.id === menuId,
      );

      for (const recipe of menuRecipes) {
        explodeRecipeIntoDemand(
          recipe.ingredients,
          forecast.expected_covers,
          recipe.servings,
          `Forecast: ${forecast.date} (${forecast.expected_covers} cubiertos)`,
          recipes,
          products,
          accumulator,
          new Set(),
        );
      }
    }
  }

  return [...accumulator.values()].map((a) => ({
    product_id: a.product_id,
    product_name: a.product_name,
    unit: a.unit,
    total_qty_needed: round2(a.total_qty),
    breakdown: a.breakdown,
  }));
}

/**
 * Explodes a recipe's ingredients into product-level demand, handling sub-recipes recursively.
 *
 * @param ingredients - Recipe ingredients to explode
 * @param totalServingsNeeded - How many servings are needed (pax x servings_per_pax)
 * @param recipeServings - How many servings the recipe makes (for scaling)
 * @param source - Human-readable source label for breakdown
 * @param recipes - All recipes (for sub-recipe resolution)
 * @param products - All products (for waste defaults)
 * @param accumulator - Mutable accumulator of demand by product
 * @param visited - Circular dependency guard
 */
function explodeRecipeIntoDemand(
  ingredients: RecipeIngredientCalc[],
  totalServingsNeeded: number,
  recipeServings: number,
  source: string,
  recipes: RecipeMap,
  products: ProductMap,
  accumulator: Map<string, DemandAccumulator>,
  visited: Set<string>,
): void {
  const scaleFactor = recipeServings > 0 ? totalServingsNeeded / recipeServings : 1;

  for (const ingredient of ingredients) {
    // Sub-recipe: recurse
    if (ingredient.sub_recipe_id) {
      if (visited.has(ingredient.sub_recipe_id)) continue; // skip circular
      visited.add(ingredient.sub_recipe_id);

      const subRecipe = recipes[ingredient.sub_recipe_id];
      if (!subRecipe) continue;

      const subQty = ingredient.quantity * scaleFactor;
      explodeRecipeIntoDemand(
        subRecipe.ingredients,
        subQty,
        subRecipe.servings,
        source,
        recipes,
        products,
        accumulator,
        new Set(visited),
      );
      continue;
    }

    // Regular product: accumulate
    if (!ingredient.product_id) continue;

    const product = products[ingredient.product_id];
    const wastePct = ingredient.waste_percent ?? (product ? (100 - product.yield_percent) / 100 : 0);
    const qtyNeeded = ingredient.quantity * scaleFactor * (1 + wastePct);

    const existing = accumulator.get(ingredient.product_id);
    if (existing) {
      existing.total_qty += qtyNeeded;
      existing.breakdown.push({ source, qty: round2(qtyNeeded) });
    } else {
      accumulator.set(ingredient.product_id, {
        product_id: ingredient.product_id,
        product_name: ingredient.product_name || "Desconocido",
        unit: ingredient.unit || ({ id: ingredient.unit_id, name: "", abbreviation: "" } as any),
        total_qty: qtyNeeded,
        breakdown: [{ source, qty: round2(qtyNeeded) }],
      });
    }
  }
}

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
