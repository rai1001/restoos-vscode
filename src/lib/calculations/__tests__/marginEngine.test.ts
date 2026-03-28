import { describe, it, expect } from "vitest";
import {
  calculatePricingByChannel,
  classifyDish,
  analyzeMenu,
  calculatePriceImpact,
} from "../marginEngine";
import type { PricingConfig } from "../types";

// ─── Helpers ────────────────────────────────────────────────

/** Shorthand: build a PricingConfig with sensible defaults. */
function makeConfig(
  overrides: Partial<PricingConfig> = {},
): PricingConfig {
  return {
    target_food_cost_pct: 0.3,
    target_margin_pct: 0.65,
    commercial_rounding: 0.5,
    channel_commissions: { sala: 0 },
    ...overrides,
  };
}

// ─── calculatePricingByChannel ──────────────────────────────

describe("calculatePricingByChannel", () => {
  it("sala only (0% commission) -> PVP = cost / food_cost_target, rounded up to 0.50", () => {
    const config = makeConfig({
      target_food_cost_pct: 0.3,
      target_margin_pct: 0.65,
      commercial_rounding: 0.5,
      channel_commissions: { sala: 0 },
    });

    const results = calculatePricingByChannel(3.0, config);

    expect(results).toHaveLength(1);
    const sala = results[0];
    expect(sala.channel).toBe("sala");

    // pvp_by_food_cost = 3.0 / 0.3 = 10.00
    expect(sala.pvp_by_food_cost).toBe(10.0);
    // pvp_by_margin = 3.0 / ((1 - 0.65) * 1) = 3.0 / 0.35 = 8.571... -> round2 = 8.57
    expect(sala.pvp_by_margin).toBe(8.57);
    // max(10.00, 8.57) = 10.00, ceil to 0.50 increment = 10.00
    expect(sala.pvp_recommended).toBe(10.0);
  });

  it("delivery channel with 30% commission -> higher PVP to compensate", () => {
    const config = makeConfig({
      target_food_cost_pct: 0.3,
      target_margin_pct: 0.65,
      commercial_rounding: 0.5,
      channel_commissions: { sala: 0, delivery_glovo: 0.3 },
    });

    const results = calculatePricingByChannel(3.0, config);
    const delivery = results.find((r) => r.channel === "delivery_glovo")!;

    // pvp_by_food_cost = 3.0 / (0.3 * 0.7) = 3.0 / 0.21 = 14.2857...
    expect(delivery.pvp_by_food_cost).toBe(14.29);
    // pvp_by_margin = 3.0 / ((1 - 0.65) * 0.7) = 3.0 / 0.245 = 12.2449...
    expect(delivery.pvp_by_margin).toBe(12.24);
    // max(14.29, 12.24) = 14.29, ceil to 0.50 = 14.50
    expect(delivery.pvp_recommended).toBe(14.5);
    // Higher than sala's 10.00
    const sala = results.find((r) => r.channel === "sala")!;
    expect(delivery.pvp_recommended).toBeGreaterThan(sala.pvp_recommended);
  });

  it("multiple channels -> returns one recommendation per channel", () => {
    const config = makeConfig({
      channel_commissions: {
        sala: 0,
        delivery_glovo: 0.3,
        delivery_uber: 0.25,
      },
    });

    const results = calculatePricingByChannel(4.0, config);

    expect(results).toHaveLength(3);
    const channels = results.map((r) => r.channel);
    expect(channels).toContain("sala");
    expect(channels).toContain("delivery_glovo");
    expect(channels).toContain("delivery_uber");
  });

  it("applies commercial rounding at 0.50 increment (ceil)", () => {
    // Pick a cost that yields a raw PVP not already on a 0.50 boundary.
    // cost 3.20, food_cost_pct 0.3 -> raw = 10.6667 -> ceil to 0.50 = 11.00
    const config = makeConfig({
      target_food_cost_pct: 0.3,
      target_margin_pct: 0.65,
      commercial_rounding: 0.5,
      channel_commissions: { sala: 0 },
    });

    const results = calculatePricingByChannel(3.2, config);
    const sala = results[0];
    // pvp_by_food_cost = 3.2 / 0.3 = 10.6667
    // pvp_by_margin = 3.2 / 0.35 = 9.1429
    // max = 10.6667, ceil(10.6667 / 0.5) * 0.5 = ceil(21.333) * 0.5 = 22 * 0.5 = 11.00
    expect(sala.pvp_recommended).toBe(11.0);
  });

  it("auto-adds 'sala' when not present in channel_commissions", () => {
    const config = makeConfig({
      channel_commissions: { delivery_glovo: 0.3 },
    });

    const results = calculatePricingByChannel(3.0, config);
    const channels = results.map((r) => r.channel);

    expect(channels[0]).toBe("sala");
    expect(channels).toContain("delivery_glovo");
    expect(results).toHaveLength(2);

    // sala should use 0 commission (default from ?? 0)
    const sala = results[0];
    expect(sala.pvp_by_food_cost).toBe(10.0); // 3.0 / 0.3
  });

  it("computes effective_margin_pct correctly", () => {
    const config = makeConfig({
      target_food_cost_pct: 0.3,
      target_margin_pct: 0.65,
      commercial_rounding: 0.5,
      channel_commissions: { sala: 0 },
    });

    const results = calculatePricingByChannel(3.0, config);
    const sala = results[0];
    // pvp_recommended = 10.00, netRevenue = 10.00 * 1 = 10.00
    // effective_margin = (10.00 - 3.00) / 10.00 = 0.7
    expect(sala.effective_margin_pct).toBe(0.7);
  });

  it("handles zero commercial_rounding (no rounding applied)", () => {
    const config = makeConfig({
      target_food_cost_pct: 0.3,
      target_margin_pct: 0.65,
      commercial_rounding: 0,
      channel_commissions: { sala: 0 },
    });

    const results = calculatePricingByChannel(3.2, config);
    const sala = results[0];
    // pvp_by_food_cost = 3.2 / 0.3 = 10.6667 -> round2 = 10.67
    // pvp_by_margin = 3.2 / 0.35 = 9.1429 -> round2 = 9.14
    // max = 10.67, commercialRound with 0 increment = round2(10.6667) = 10.67
    expect(sala.pvp_recommended).toBe(10.67);
  });
});

// ─── classifyDish ───────────────────────────────────────────

describe("classifyDish", () => {
  it("high popularity + high margin -> star", () => {
    expect(classifyDish(100, 80, 5.0, 4.0)).toBe("star");
  });

  it("high popularity + low margin -> workhorse", () => {
    expect(classifyDish(100, 80, 2.0, 4.0)).toBe("workhorse");
  });

  it("low popularity + high margin -> puzzle", () => {
    expect(classifyDish(50, 80, 5.0, 4.0)).toBe("puzzle");
  });

  it("low popularity + low margin -> dog", () => {
    expect(classifyDish(50, 80, 2.0, 4.0)).toBe("dog");
  });

  it("exactly at averages -> star (>= comparison)", () => {
    expect(classifyDish(80, 80, 4.0, 4.0)).toBe("star");
  });

  it("popularity equal but margin below -> workhorse", () => {
    expect(classifyDish(80, 80, 3.99, 4.0)).toBe("workhorse");
  });

  it("margin equal but popularity below -> puzzle", () => {
    expect(classifyDish(79, 80, 4.0, 4.0)).toBe("puzzle");
  });
});

// ─── analyzeMenu ────────────────────────────────────────────

describe("analyzeMenu", () => {
  const baseDishes = [
    { recipe_id: "r1", recipe_name: "Paella", units_sold: 120, revenue: 1800, cost_per_unit: 4.0, pvp: 15.0 },
    { recipe_id: "r2", recipe_name: "Gazpacho", units_sold: 100, revenue: 800, cost_per_unit: 2.0, pvp: 8.0 },
    { recipe_id: "r3", recipe_name: "Croquetas", units_sold: 60, revenue: 660, cost_per_unit: 3.0, pvp: 11.0 },
    { recipe_id: "r4", recipe_name: "Ensalada", units_sold: 40, revenue: 320, cost_per_unit: 5.0, pvp: 8.0 },
  ];

  it("classifies a full menu with correct distribution", () => {
    const result = analyzeMenu(baseDishes);

    expect(result).toHaveLength(4);

    // avgUnits = (120+100+60+40)/4 = 80
    // margins: [11, 6, 8, 3], avgMargin = 28/4 = 7

    // Paella: units 120 >= 80, margin 11 >= 7 -> star
    expect(result[0].category).toBe("star");
    expect(result[0].recipe_name).toBe("Paella");

    // Gazpacho: units 100 >= 80, margin 6 < 7 -> workhorse
    expect(result[1].category).toBe("workhorse");
    expect(result[1].recipe_name).toBe("Gazpacho");

    // Croquetas: units 60 < 80, margin 8 >= 7 -> puzzle
    expect(result[2].category).toBe("puzzle");
    expect(result[2].recipe_name).toBe("Croquetas");

    // Ensalada: units 40 < 80, margin 3 < 7 -> dog
    expect(result[3].category).toBe("dog");
    expect(result[3].recipe_name).toBe("Ensalada");
  });

  it("returns empty array for empty input", () => {
    const result = analyzeMenu([]);
    expect(result).toEqual([]);
  });

  it("all same margin and popularity -> all stars (all >= avg)", () => {
    const dishes = [
      { recipe_id: "a", recipe_name: "A", units_sold: 50, revenue: 500, cost_per_unit: 3.0, pvp: 10.0 },
      { recipe_id: "b", recipe_name: "B", units_sold: 50, revenue: 500, cost_per_unit: 3.0, pvp: 10.0 },
      { recipe_id: "c", recipe_name: "C", units_sold: 50, revenue: 500, cost_per_unit: 3.0, pvp: 10.0 },
    ];

    const result = analyzeMenu(dishes);
    expect(result.every((r) => r.category === "star")).toBe(true);
  });

  it("computes food_cost_pct and margin_per_unit correctly", () => {
    const result = analyzeMenu(baseDishes);

    // Paella: food_cost_pct = 4.0 / 15.0 = 0.2667
    expect(result[0].food_cost_pct).toBe(0.2667);
    // Paella: margin_per_unit = 15.0 - 4.0 = 11.0
    expect(result[0].margin_per_unit).toBe(11.0);

    // Ensalada: food_cost_pct = 5.0 / 8.0 = 0.625
    expect(result[3].food_cost_pct).toBe(0.625);
  });

  it("includes recommendation text for each category", () => {
    const result = analyzeMenu(baseDishes);

    // star recommendation
    expect(result[0].recommendation).toContain("Mantener");
    // workhorse
    expect(result[1].recommendation).toContain("escandallo");
    // puzzle
    expect(result[2].recommendation).toContain("visibilidad");
    // dog
    expect(result[3].recommendation).toContain("retirar");
  });

  it("handles single-dish menu (dish is always a star)", () => {
    const dishes = [
      { recipe_id: "solo", recipe_name: "Solo", units_sold: 10, revenue: 100, cost_per_unit: 3.0, pvp: 10.0 },
    ];

    const result = analyzeMenu(dishes);
    expect(result).toHaveLength(1);
    // avg = itself, so units >= avg and margin >= avg -> star
    expect(result[0].category).toBe("star");
  });
});

// ─── calculatePriceImpact ───────────────────────────────────

describe("calculatePriceImpact", () => {
  const baseRecipe = {
    recipe_id: "r1",
    recipe_name: "Paella",
    current_cost_per_serving: 4.0,
    current_pvp: 15.0,
    ingredient_qty_with_waste: 0.5, // 0.5 kg of this ingredient per serving
  };

  it("price increase -> new cost higher, new food cost higher", () => {
    const result = calculatePriceImpact(
      [baseRecipe],
      "ing_aceite",
      2.0, // old price
      3.0, // new price
      0.3, // target food cost 30%
    );

    expect(result.ingredient_id).toBe("ing_aceite");
    // price_change_pct = ((3 - 2) / 2) * 100 = 50%
    expect(result.price_change_pct).toBe(50.0);

    const affected = result.affected_recipes[0];
    expect(affected.old_cost).toBe(4.0);
    // new_cost = 4.0 + (0.5 * 1.0) = 4.5
    expect(affected.new_cost).toBe(4.5);
    // old_food_cost = 4.0 / 15.0 = 0.2667
    expect(affected.old_food_cost_pct).toBe(0.2667);
    // new_food_cost = 4.5 / 15.0 = 0.3
    expect(affected.new_food_cost_pct).toBe(0.3);
  });

  it("price decrease -> costs decrease", () => {
    const result = calculatePriceImpact(
      [baseRecipe],
      "ing_aceite",
      3.0, // old price
      2.0, // new price (decrease)
      0.3,
    );

    expect(result.price_change_pct).toBe(-33.33);

    const affected = result.affected_recipes[0];
    // new_cost = 4.0 + (0.5 * -1.0) = 3.5
    expect(affected.new_cost).toBe(3.5);
    expect(affected.new_cost).toBeLessThan(affected.old_cost);
    expect(affected.new_food_cost_pct).toBeLessThan(affected.old_food_cost_pct);
  });

  it("sets exceeds_target when new food cost > threshold", () => {
    // Make a large price increase so food cost exceeds 30%
    const result = calculatePriceImpact(
      [baseRecipe],
      "ing_aceite",
      2.0,
      6.0, // big increase: priceDiff = 4.0
      0.3,
    );

    const affected = result.affected_recipes[0];
    // new_cost = 4.0 + (0.5 * 4.0) = 6.0
    // new_food_cost = 6.0 / 15.0 = 0.4 > 0.3
    expect(affected.new_food_cost_pct).toBe(0.4);
    expect(affected.exceeds_target).toBe(true);
  });

  it("exceeds_target is false when within threshold", () => {
    const result = calculatePriceImpact(
      [baseRecipe],
      "ing_aceite",
      2.0,
      2.1, // tiny increase
      0.3,
    );

    const affected = result.affected_recipes[0];
    // new_cost = 4.0 + (0.5 * 0.1) = 4.05
    // new_food_cost = 4.05 / 15.0 = 0.27 < 0.3
    expect(affected.exceeds_target).toBe(false);
  });

  it("handles multiple affected recipes", () => {
    const recipes = [
      { ...baseRecipe, recipe_id: "r1", recipe_name: "Paella" },
      {
        recipe_id: "r2",
        recipe_name: "Gazpacho",
        current_cost_per_serving: 2.0,
        current_pvp: 8.0,
        ingredient_qty_with_waste: 0.3,
      },
    ];

    const result = calculatePriceImpact(recipes, "ing_tomate", 1.5, 2.5, 0.3);

    expect(result.affected_recipes).toHaveLength(2);

    // priceDiff = 1.0
    // r1: new_cost = 4.0 + (0.5 * 1.0) = 4.5
    expect(result.affected_recipes[0].new_cost).toBe(4.5);
    // r2: new_cost = 2.0 + (0.3 * 1.0) = 2.3
    expect(result.affected_recipes[1].new_cost).toBe(2.3);
  });

  it("handles oldPrice of zero (price_change_pct = 0)", () => {
    const result = calculatePriceImpact(
      [baseRecipe],
      "ing_new",
      0, // old price zero (new ingredient)
      5.0,
      0.3,
    );

    expect(result.price_change_pct).toBe(0);
    // cost still changes: 4.0 + (0.5 * 5.0) = 6.5
    expect(result.affected_recipes[0].new_cost).toBe(6.5);
  });
});
