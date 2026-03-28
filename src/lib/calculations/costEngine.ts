/**
 * @module costEngine
 * @description Deterministic cost calculation engine for escandallos (recipe costing).
 *
 * Calculates the full cost of a recipe including:
 * - Ingredient costs from catalog prices
 * - Waste/loss (merma) adjustments
 * - Sub-recipe cascade costing (recursive)
 * - Allergen aggregation from all ingredients and sub-recipes
 *
 * This module is **pure** — no side effects, no DB access, no AI.
 * All inputs are passed explicitly. Safe for unit testing.
 */

import type {
  RecipeIngredientCalc,
  CatalogEntry,
  RecipeCostResult,
  IngredientCostLine,
  AllergenCode,
  PricingConfig,
  RecipeMap,
  ProductMap,
  CatalogMap,
} from "./types";

/**
 * Calculates the full cost breakdown for a recipe, including sub-recipes.
 *
 * @param recipeId - The ID of the recipe to calculate
 * @param recipes - Map of all recipes (needed for sub-recipe resolution)
 * @param products - Map of all products (for allergen and waste defaults)
 * @param catalog - Map of product_id → catalog entries (supplier prices)
 * @param pricingConfig - Pricing rules for PVP calculation
 * @param visited - Internal: tracks visited recipes to prevent infinite loops
 * @returns Full cost breakdown with per-line details, totals, allergens, and PVP suggestion
 *
 * @example
 * ```ts
 * const result = calculateRecipeCost(
 *   "recipe-paella",
 *   recipeMap,
 *   productMap,
 *   catalogMap,
 *   { target_food_cost_pct: 0.30, target_margin_pct: 0.70, commercial_rounding: 0.50, channel_commissions: {} }
 * );
 * console.log(result.cost_per_serving); // 3.10
 * console.log(result.suggested_pvp);    // 10.50
 * ```
 *
 * @throws {Error} If a circular sub-recipe dependency is detected
 */
export function calculateRecipeCost(
  recipeId: string,
  recipes: RecipeMap,
  products: ProductMap,
  catalog: CatalogMap,
  pricingConfig: PricingConfig,
  visited: Set<string> = new Set(),
): RecipeCostResult {
  if (visited.has(recipeId)) {
    throw new Error(
      `Circular sub-recipe dependency detected: ${recipeId} already visited in chain [${[...visited].join(" → ")}]`,
    );
  }
  visited.add(recipeId);

  const recipe = recipes[recipeId];
  if (!recipe) {
    throw new Error(`Recipe not found: ${recipeId}`);
  }

  const allAllergens = new Set<AllergenCode>();
  const lines: IngredientCostLine[] = [];

  for (const ingredient of recipe.ingredients) {
    const line = calculateIngredientLine(
      ingredient,
      recipes,
      products,
      catalog,
      pricingConfig,
      new Set(visited),
    );
    lines.push(line);
    line.allergens.forEach((a) => allAllergens.add(a));
  }

  const totalCost = lines.reduce((sum, l) => sum + l.line_cost, 0);
  const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : totalCost;

  const suggestedPvp = calculateSuggestedPvp(
    costPerServing,
    pricingConfig.target_food_cost_pct,
    pricingConfig.commercial_rounding,
  );

  const foodCostPct = suggestedPvp > 0 ? costPerServing / suggestedPvp : 0;
  const marginGross = suggestedPvp - costPerServing;

  return {
    recipe_id: recipeId,
    recipe_name: recipe.name,
    total_cost: round2(totalCost),
    servings: recipe.servings,
    cost_per_serving: round2(costPerServing),
    food_cost_pct: round4(foodCostPct),
    suggested_pvp: suggestedPvp,
    margin_gross: round2(marginGross),
    allergens: [...allAllergens],
    lines,
  };
}

/**
 * Calculates cost for a single ingredient line.
 * If the ingredient is a sub-recipe, recursively calculates its cost.
 *
 * @param ingredient - The recipe ingredient to cost
 * @param recipes - All recipes (for sub-recipe resolution)
 * @param products - All products (for allergens and waste defaults)
 * @param catalog - Catalog entries by product_id
 * @param pricingConfig - Pricing configuration
 * @param visited - Visited recipe IDs (circular dependency detection)
 * @returns Fully costed ingredient line with allergens
 */
function calculateIngredientLine(
  ingredient: RecipeIngredientCalc,
  recipes: RecipeMap,
  products: ProductMap,
  catalog: CatalogMap,
  pricingConfig: PricingConfig,
  visited: Set<string>,
): IngredientCostLine {
  // Sub-recipe: recursive cost
  if (ingredient.sub_recipe_id) {
    const subResult = calculateRecipeCost(
      ingredient.sub_recipe_id,
      recipes,
      products,
      catalog,
      pricingConfig,
      visited,
    );

    const qtyWithWaste = ingredient.quantity * (1 + ingredient.waste_percent);
    // Sub-recipe cost per unit = total_cost / servings (how much 1 "serving" of sub-recipe costs)
    const subCostPerUnit =
      subResult.servings > 0
        ? subResult.total_cost / subResult.servings
        : subResult.total_cost;
    const lineCost = qtyWithWaste * subCostPerUnit;

    return {
      ingredient_id: ingredient.id,
      product_name: ingredient.product_name || "Desconocido",
      quantity_recipe: ingredient.quantity,
      quantity_with_waste: round4(qtyWithWaste),
      unit: ingredient.unit || ({ id: ingredient.unit_id, name: "", abbreviation: "" } as any),
      unit_cost: round4(subCostPerUnit),
      line_cost: round2(lineCost),
      waste_pct: ingredient.waste_percent,
      allergens: subResult.allergens,
      is_sub_recipe: true,
      sub_recipe_cost: subResult,
    };
  }

  // Regular product ingredient
  const product = ingredient.product_id ? products[ingredient.product_id] : null;
  const wastePct = ingredient.waste_percent ?? (product ? (100 - product.yield_percent) / 100 : 0);
  const qtyWithWaste = ingredient.quantity * (1 + wastePct);

  const unitCost = resolveUnitCost(ingredient, catalog);
  const lineCost = qtyWithWaste * unitCost;

  const allergens: AllergenCode[] = product?.allergens ?? [];

  return {
    ingredient_id: ingredient.id,
    product_name: ingredient.product_name || "Desconocido",
    quantity_recipe: ingredient.quantity,
    quantity_with_waste: round4(qtyWithWaste),
    unit: ingredient.unit || ({ id: ingredient.unit_id, name: "", abbreviation: "" } as any),
    unit_cost: round4(unitCost),
    line_cost: round2(lineCost),
    waste_pct: wastePct,
    allergens,
    is_sub_recipe: false,
  };
}

/**
 * Resolves the best unit cost for an ingredient from the catalog.
 *
 * Priority:
 * 1. If `catalog_entry_id` is set on the ingredient, use that specific entry
 * 2. Otherwise, find the cheapest catalog entry for the product
 * 3. Applies volume discounts if qty qualifies
 *
 * @param ingredient - The ingredient with optional catalog_entry_id
 * @param catalog - All catalog entries indexed by product_id
 * @returns Unit cost in EUR. Returns 0 if no catalog entry found.
 */
function resolveUnitCost(
  ingredient: RecipeIngredientCalc,
  catalog: CatalogMap,
): number {
  if (!ingredient.product_id) return 0;

  const entries = catalog[ingredient.product_id];
  if (!entries || entries.length === 0) return 0;

  // If explicit entry selected, use it
  if (ingredient.catalog_entry_id) {
    const selected = entries.find((e) => e.id === ingredient.catalog_entry_id);
    if (selected) {
      return getBestPrice(selected, ingredient.quantity * (1 + ingredient.waste_percent));
    }
  }

  // Otherwise, cheapest option considering volume
  const qtyNeeded = ingredient.quantity * (1 + ingredient.waste_percent);
  let bestPrice = Infinity;

  for (const entry of entries) {
    const price = getBestPrice(entry, qtyNeeded);
    if (price < bestPrice) {
      bestPrice = price;
    }
  }

  return bestPrice === Infinity ? 0 : bestPrice;
}

/**
 * Gets the best unit price from a catalog entry, considering volume discounts.
 *
 * @param entry - Catalog entry with potential volume discounts
 * @param quantity - Quantity being ordered
 * @returns Best applicable unit price
 */
function getBestPrice(entry: CatalogEntry, quantity: number): number {
  let bestPrice = entry.unit_price;

  for (const discount of entry.volume_discounts) {
    if (quantity >= discount.min_qty && discount.unit_price < bestPrice) {
      bestPrice = discount.unit_price;
    }
  }

  return bestPrice;
}

/**
 * Calculates a suggested PVP (public sale price) from cost per serving.
 *
 * Formula: `pvp = cost / target_food_cost_pct`, rounded to commercial increment.
 *
 * @param costPerServing - Cost per serving in EUR
 * @param targetFoodCostPct - Target food cost percentage (e.g. 0.30 for 30%)
 * @param commercialRounding - Rounding increment (e.g. 0.50 -> round to nearest 50 cents)
 * @returns PVP rounded to commercial increment
 *
 * @example
 * ```ts
 * calculateSuggestedPvp(3.10, 0.30, 0.50); // -> 10.50
 * ```
 */
export function calculateSuggestedPvp(
  costPerServing: number,
  targetFoodCostPct: number,
  commercialRounding: number,
): number {
  if (targetFoodCostPct <= 0 || targetFoodCostPct > 1) return 0;

  const rawPvp = costPerServing / targetFoodCostPct;

  if (commercialRounding <= 0) return round2(rawPvp);

  return round2(Math.ceil(rawPvp / commercialRounding) * commercialRounding);
}

/**
 * Collects all unique allergens from a recipe's cost result.
 * Useful for generating allergen declarations on menus and PDFs.
 *
 * @param costResult - The calculated recipe cost with aggregated allergen data
 * @returns Deduplicated sorted array of allergen codes
 *
 * @example
 * ```ts
 * const costResult = calculateRecipeCost("recipe-paella", recipeMap, productMap, catalogMap, config);
 * const allergens = collectAllergens(costResult);
 * console.log(allergens); // ["crustaceans", "gluten", "mollusks"]
 * ```
 */
export function collectAllergens(costResult: RecipeCostResult): AllergenCode[] {
  const set = new Set<AllergenCode>(costResult.allergens);
  return [...set].sort();
}

/** Round to 2 decimal places (money) */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Round to 4 decimal places (intermediate calculations) */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
