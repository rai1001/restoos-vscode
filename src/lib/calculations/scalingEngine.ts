/**
 * @module scalingEngine
 * @description Deterministic recipe scaling engine.
 *
 * Scales a recipe to any target number of servings, recalculating:
 * - Ingredient quantities (with waste applied)
 * - Costs per line and total
 * - Cost per serving
 *
 * Use case: banquets, events, catering, production changes.
 *
 * Pure function — no side effects, no DB, no AI.
 */

import type {
  RecipeIngredient,
  ScaledRecipe,
  ScaledIngredientLine,
  MeasurementUnit,
  CatalogEntry,
  CatalogMap,
} from "./types";

/**
 * Scales a recipe from its original servings to a target number, recalculating quantities, waste, and costs.
 *
 * @param originalServings - The base number of servings the recipe was written for (must be > 0)
 * @param targetServings - The desired number of servings to scale to
 * @param ingredients - Array of {@link RecipeIngredient} items from the recipe
 * @param catalog - A {@link CatalogMap} keyed by product_id, used to resolve unit prices
 * @returns A {@link ScaledRecipe} with per-line and total cost breakdowns
 * @throws {Error} If originalServings is zero or negative
 *
 * @example
 * ```ts
 * const result = scaleRecipe(4, 20, recipeIngredients, catalogMap);
 * console.log(result.scale_factor);      // 5
 * console.log(result.cost_per_serving);  // e.g. 2.35
 * ```
 */
export function scaleRecipe(
  originalServings: number,
  targetServings: number,
  ingredients: RecipeIngredient[],
  catalog: CatalogMap,
): ScaledRecipe {
  if (originalServings <= 0) {
    throw new Error(`originalServings must be positive, got: ${originalServings}`);
  }

  const scaleFactor = targetServings / originalServings;

  const lines: ScaledIngredientLine[] = ingredients.map((ing) => {
    const originalQty = ing.quantity;
    const scaledQty = originalQty * scaleFactor;
    const scaledQtyWithWaste = scaledQty * (1 + (ing.waste_percent || 0));
    const unitCost = resolvePrice(ing, catalog);
    const lineCost = scaledQtyWithWaste * unitCost;

    return {
      product_name: ing.product_name || "Desconocido",
      original_qty: round2(originalQty),
      scaled_qty: round2(scaledQty),
      scaled_qty_with_waste: round2(scaledQtyWithWaste),
      unit: ing.unit || { id: ing.unit_id, name: "", abbreviation: "" } as MeasurementUnit,
      unit_cost: round4(unitCost),
      line_cost: round2(lineCost),
    };
  });

  const totalCost = lines.reduce((s, l) => s + l.line_cost, 0);
  const costPerServing = targetServings > 0 ? totalCost / targetServings : 0;

  return {
    original_servings: originalServings,
    target_servings: targetServings,
    scale_factor: round4(scaleFactor),
    lines,
    total_cost: round2(totalCost),
    cost_per_serving: round2(costPerServing),
  };
}

/** Shopping list line item */
export interface ShoppingListItem {
  product_name: string;
  product_id: string;
  unit: MeasurementUnit;
  qty_needed: number;
  qty_to_order: number;
  packs: number;
  supplier_name: string;
  estimated_cost: number;
}

/**
 * Generates an aggregated shopping list from a scaled recipe, selecting the cheapest supplier per product.
 *
 * Aggregates duplicate products, calculates pack-based ordering quantities respecting
 * minimum order quantities, and selects the cheapest catalog entry per product.
 *
 * @param scaled - The {@link ScaledRecipe} output from {@link scaleRecipe}
 * @param catalog - A {@link CatalogMap} keyed by product_id with supplier entries
 * @param ingredients - The original {@link RecipeIngredient} array (must align by index with scaled.lines)
 * @returns An array of {@link ShoppingListItem} with order quantities and estimated costs
 *
 * @example
 * ```ts
 * const scaled = scaleRecipe(4, 100, ingredients, catalog);
 * const list = generateShoppingList(scaled, catalog, ingredients);
 * list.forEach(item => {
 *   console.log(`${item.product_name}: order ${item.qty_to_order} (${item.packs} packs) — $${item.estimated_cost}`);
 * });
 * ```
 */
export function generateShoppingList(
  scaled: ScaledRecipe,
  catalog: CatalogMap,
  ingredients: RecipeIngredient[],
): ShoppingListItem[] {
  const aggregated = new Map<string, {
    product_name: string;
    product_id: string;
    unit: MeasurementUnit;
    qty_needed: number;
  }>();

  for (let i = 0; i < scaled.lines.length; i++) {
    const line = scaled.lines[i];
    const ing = ingredients[i];
    if (!ing?.product_id) continue;

    const existing = aggregated.get(ing.product_id);
    if (existing) {
      existing.qty_needed += line!.scaled_qty_with_waste;
    } else {
      aggregated.set(ing.product_id, {
        product_name: line!.product_name,
        product_id: ing.product_id,
        unit: line!.unit,
        qty_needed: line!.scaled_qty_with_waste,
      });
    }
  }

  return [...aggregated.values()].map((item) => {
    const entries = catalog[item.product_id] ?? [];
    const bestEntry = findCheapestEntry(entries);
    const packSize = bestEntry?.pack_size ?? 1;
    const moq = bestEntry?.min_order_qty ?? 0;

    const packsNeeded = Math.ceil(item.qty_needed / packSize);
    const qtyToOrder = Math.max(packsNeeded * packSize, moq);

    return {
      product_name: item.product_name,
      product_id: item.product_id,
      unit: item.unit,
      qty_needed: round2(item.qty_needed),
      qty_to_order: round2(qtyToOrder),
      packs: packsNeeded,
      supplier_name: bestEntry?.supplier_name ?? "Sin proveedor",
      estimated_cost: round2(qtyToOrder * (bestEntry?.unit_price ?? 0)),
    };
  });
}

function findCheapestEntry(entries: CatalogEntry[]): CatalogEntry | undefined {
  if (entries.length === 0) return undefined;
  return entries.reduce((cheapest, e) =>
    e.unit_price < cheapest.unit_price ? e : cheapest,
  );
}

function resolvePrice(
  ingredient: RecipeIngredient,
  catalog: CatalogMap,
): number {
  if (!ingredient.product_id) return 0;
  const entries = catalog[ingredient.product_id] ?? [];
  const cheapest = findCheapestEntry(entries);
  return cheapest?.unit_price ?? 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
