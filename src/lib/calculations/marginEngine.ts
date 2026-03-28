/**
 * @module marginEngine
 * @description Deterministic pricing and margin calculation engine.
 *
 * Computes PVP recommendations across channels (sala, delivery platforms)
 * taking into account food cost targets, margin targets, and platform commissions.
 *
 * Also provides menu engineering classification (Boston matrix).
 *
 * Pure function — no side effects, no DB, no AI.
 */

import type {
  PricingConfig,
  PricingChannel,
  PricingRecommendation,
  MenuCategory,
  MenuEngineeringItem,
} from "./types";

/**
 * Calculates recommended selling prices (PVP) for all configured sales channels.
 *
 * Computes a PVP per channel by applying food cost targets, margin targets, and
 * platform commissions. The "sala" channel is always included even if not in config.
 *
 * @param costPerServing - Cost per serving from the recipe escandallo (EUR)
 * @param config - Pricing configuration with targets, commissions, and rounding rules
 * @returns Array of {@link PricingRecommendation} objects, one per channel
 *
 * @example
 * ```ts
 * const recs = calculatePricingByChannel(3.50, {
 *   target_food_cost_pct: 0.30,
 *   target_margin_pct: 0.65,
 *   commercial_rounding: 0.50,
 *   channel_commissions: { sala: 0, glovo: 0.30, uber_eats: 0.35 },
 * });
 * // recs[0] -> { channel: "sala", pvp_recommended: 12.00, effective_margin_pct: 0.7083, ... }
 * ```
 */
export function calculatePricingByChannel(
  costPerServing: number,
  config: PricingConfig,
): PricingRecommendation[] {
  const channels = Object.keys(config.channel_commissions) as PricingChannel[];

  if (!channels.includes("sala")) {
    channels.unshift("sala");
  }

  return channels.map((channel) => {
    const commission = config.channel_commissions[channel] ?? 0;
    return calculateChannelPvp(costPerServing, config, channel, commission);
  });
}

function calculateChannelPvp(
  costPerServing: number,
  config: PricingConfig,
  channel: PricingChannel,
  commission: number,
): PricingRecommendation {
  const netFactor = 1 - commission;

  const pvpByFoodCost =
    netFactor > 0 && config.target_food_cost_pct > 0
      ? costPerServing / (config.target_food_cost_pct * netFactor)
      : 0;

  const marginFactor = (1 - config.target_margin_pct) * netFactor;
  const pvpByMargin = marginFactor > 0 ? costPerServing / marginFactor : 0;

  const rawPvp = Math.max(pvpByFoodCost, pvpByMargin);
  const pvpRecommended = commercialRound(rawPvp, config.commercial_rounding);

  const netRevenue = pvpRecommended * netFactor;
  const effectiveMarginPct =
    netRevenue > 0 ? (netRevenue - costPerServing) / netRevenue : 0;

  return {
    channel,
    pvp_by_food_cost: round2(pvpByFoodCost),
    pvp_by_margin: round2(pvpByMargin),
    pvp_recommended: pvpRecommended,
    effective_margin_pct: round4(effectiveMarginPct),
  };
}

/**
 * Classifies a dish into the Boston matrix (menu engineering quadrant).
 *
 * Compares the dish's popularity and margin against their respective averages
 * to assign one of four categories: star, workhorse, puzzle, or dog.
 *
 * @param unitsSold - Number of units sold for this dish in the period
 * @param avgUnitsSold - Average units sold across all dishes in the analysis set
 * @param marginPerUnit - Gross margin per unit for this dish (EUR)
 * @param avgMarginPerUnit - Average margin per unit across all dishes (EUR)
 * @returns A {@link MenuCategory} classification: "star" | "workhorse" | "puzzle" | "dog"
 *
 * @example
 * ```ts
 * const category = classifyDish(120, 80, 5.50, 4.00);
 * // -> "star" (high popularity + high margin)
 *
 * const category2 = classifyDish(40, 80, 2.00, 4.00);
 * // -> "dog" (low popularity + low margin)
 * ```
 */
export function classifyDish(
  unitsSold: number,
  avgUnitsSold: number,
  marginPerUnit: number,
  avgMarginPerUnit: number,
): MenuCategory {
  const highPopularity = unitsSold >= avgUnitsSold;
  const highMargin = marginPerUnit >= avgMarginPerUnit;

  if (highPopularity && highMargin) return "star";
  if (highPopularity && !highMargin) return "workhorse";
  if (!highPopularity && highMargin) return "puzzle";
  return "dog";
}

/**
 * Performs full menu engineering analysis (Boston matrix) on a set of dishes.
 *
 * Calculates average popularity and margin across the set, then classifies each
 * dish and attaches an actionable recommendation in Spanish.
 *
 * @param dishes - Array of dish performance data for the analysis period
 * @param dishes[].recipe_id - Unique recipe identifier
 * @param dishes[].recipe_name - Human-readable recipe name
 * @param dishes[].units_sold - Units sold in the period
 * @param dishes[].revenue - Total revenue generated (EUR)
 * @param dishes[].cost_per_unit - Cost per serving from escandallo (EUR)
 * @param dishes[].pvp - Selling price per unit (EUR)
 * @returns Array of {@link MenuEngineeringItem} with classification, food cost %, and recommendation
 *
 * @example
 * ```ts
 * const results = analyzeMenu([
 *   { recipe_id: "r1", recipe_name: "Paella", units_sold: 150, revenue: 2250, cost_per_unit: 4.20, pvp: 15.00 },
 *   { recipe_id: "r2", recipe_name: "Croquetas", units_sold: 60, revenue: 540, cost_per_unit: 2.10, pvp: 9.00 },
 * ]);
 * // results[0] -> { recipe_name: "Paella", category: "star", food_cost_pct: 0.28, ... }
 * ```
 */
export function analyzeMenu(
  dishes: {
    recipe_id: string;
    recipe_name: string;
    units_sold: number;
    revenue: number;
    cost_per_unit: number;
    pvp: number;
  }[],
): MenuEngineeringItem[] {
  if (dishes.length === 0) return [];

  const totalUnits = dishes.reduce((s, d) => s + d.units_sold, 0);
  const avgUnits = totalUnits / dishes.length;

  const margins = dishes.map((d) => d.pvp - d.cost_per_unit);
  const avgMargin = margins.reduce((s, m) => s + m, 0) / margins.length;

  return dishes.map((dish, i) => {
    const marginPerUnit = margins[i]!;
    const category = classifyDish(dish.units_sold, avgUnits, marginPerUnit, avgMargin);
    const foodCostPct = dish.pvp > 0 ? dish.cost_per_unit / dish.pvp : 0;

    return {
      recipe_id: dish.recipe_id,
      recipe_name: dish.recipe_name,
      category,
      units_sold: dish.units_sold,
      food_cost_pct: round4(foodCostPct),
      margin_per_unit: round2(marginPerUnit),
      revenue: round2(dish.revenue),
      recommendation: getRecommendation(category),
    };
  });
}

function getRecommendation(category: MenuCategory): string {
  const recommendations: Record<MenuCategory, string> = {
    star: "Mantener y potenciar. Ubicar en posiciones destacadas de la carta.",
    workhorse: "Revisar escandallo para reducir coste o considerar subir precio.",
    puzzle: "Mejorar visibilidad en carta. Incluir en sugerencias del día.",
    dog: "Considerar retirar de la carta o reformular completamente.",
  };
  return recommendations[category];
}

/**
 * Calculates the margin impact across recipes when an ingredient price changes.
 *
 * For each affected recipe, recomputes the cost per serving and food cost percentage
 * under the new ingredient price, and flags recipes that would exceed the target food cost.
 *
 * @param affectedRecipes - Recipes that use the ingredient, with current cost and quantity data
 * @param affectedRecipes[].recipe_id - Unique recipe identifier
 * @param affectedRecipes[].recipe_name - Human-readable recipe name
 * @param affectedRecipes[].current_cost_per_serving - Current cost per serving (EUR)
 * @param affectedRecipes[].current_pvp - Current selling price (EUR)
 * @param affectedRecipes[].ingredient_qty_with_waste - Quantity of ingredient used per serving, including waste factor
 * @param ingredientId - Identifier of the ingredient whose price changed
 * @param oldPrice - Previous unit price of the ingredient (EUR)
 * @param newPrice - New unit price of the ingredient (EUR)
 * @param targetFoodCostPct - Target food cost percentage (e.g., 0.30 for 30%)
 * @returns Object with overall price change percentage and per-recipe impact details
 *
 * @example
 * ```ts
 * const impact = calculatePriceImpact(
 *   [{ recipe_id: "r1", recipe_name: "Risotto", current_cost_per_serving: 3.80, current_pvp: 14.00, ingredient_qty_with_waste: 0.25 }],
 *   "ing_butter",
 *   8.00,
 *   10.50,
 *   0.30,
 * );
 * // impact.price_change_pct -> 31.25
 * // impact.affected_recipes[0].exceeds_target -> true
 * ```
 */
export function calculatePriceImpact(
  affectedRecipes: {
    recipe_id: string;
    recipe_name: string;
    current_cost_per_serving: number;
    current_pvp: number;
    ingredient_qty_with_waste: number;
  }[],
  ingredientId: string,
  oldPrice: number,
  newPrice: number,
  targetFoodCostPct: number,
): {
  ingredient_id: string;
  price_change_pct: number;
  affected_recipes: {
    recipe_id: string;
    recipe_name: string;
    old_cost: number;
    new_cost: number;
    old_food_cost_pct: number;
    new_food_cost_pct: number;
    exceeds_target: boolean;
  }[];
} {
  const priceChangePct = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;
  const priceDiff = newPrice - oldPrice;

  const affected = affectedRecipes.map((r) => {
    const costIncrease = r.ingredient_qty_with_waste * priceDiff;
    const newCost = r.current_cost_per_serving + costIncrease;
    const oldFoodCost = r.current_pvp > 0 ? r.current_cost_per_serving / r.current_pvp : 0;
    const newFoodCost = r.current_pvp > 0 ? newCost / r.current_pvp : 0;

    return {
      recipe_id: r.recipe_id,
      recipe_name: r.recipe_name,
      old_cost: round2(r.current_cost_per_serving),
      new_cost: round2(newCost),
      old_food_cost_pct: round4(oldFoodCost),
      new_food_cost_pct: round4(newFoodCost),
      exceeds_target: newFoodCost > targetFoodCostPct,
    };
  });

  return {
    ingredient_id: ingredientId,
    price_change_pct: round2(priceChangePct),
    affected_recipes: affected,
  };
}

function commercialRound(value: number, increment: number): number {
  if (increment <= 0) return round2(value);
  return round2(Math.ceil(value / increment) * increment);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
