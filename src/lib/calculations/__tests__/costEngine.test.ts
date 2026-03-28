/**
 * Unit tests for costEngine — deterministic recipe costing.
 * vitest globals enabled: describe, it, expect are available without imports.
 */
import {
  calculateRecipeCost,
  calculateSuggestedPvp,
  collectAllergens,
} from "../costEngine";
import type {
  RecipeMap,
  ProductMap,
  CatalogMap,
  PricingConfig,
  RecipeCostResult,
  MeasurementUnit,
  RecipeIngredientCalc,
  AllergenCode,
} from "../types";

// ─── Shared helpers & fixtures ──────────────────────────────

const unit = (abbr: string): MeasurementUnit => ({
  id: `unit-${abbr}`,
  name: abbr,
  abbreviation: abbr,
});

const KG = unit("kg");
const L = unit("L");
const UN = unit("un");

const DEFAULT_PRICING: PricingConfig = {
  target_food_cost_pct: 0.30,
  target_margin_pct: 0.70,
  commercial_rounding: 0.50,
  channel_commissions: {},
};

function ingredient(
  overrides: Partial<RecipeIngredientCalc> & { id: string },
): RecipeIngredientCalc {
  return {
    product_id: null,
    product_name: "Desconocido",
    sub_recipe_id: null,
    quantity: 1,
    unit: KG,
    unit_id: KG.id,
    waste_percent: 0,
    ...overrides,
  };
}

// ─── calculateRecipeCost ────────────────────────────────────

describe("calculateRecipeCost", () => {
  it("calculates a basic recipe with two ingredients", () => {
    const products: ProductMap = {
      "prod-tomato": {
        id: "prod-tomato",
        name: "Tomate",
        yield_percent: 100,
        allergens: [],
      },
      "prod-onion": {
        id: "prod-onion",
        name: "Cebolla",
        yield_percent: 100,
        allergens: [],
      },
    };
    const catalog: CatalogMap = {
      "prod-tomato": [
        {
          id: "cat-tom-1",
          supplier_id: "sup-1",
          supplier_name: "FreshCo",
          product_id: "prod-tomato",
          unit_price: 2.0, // EUR/kg
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
      "prod-onion": [
        {
          id: "cat-oni-1",
          supplier_id: "sup-1",
          supplier_name: "FreshCo",
          product_id: "prod-onion",
          unit_price: 1.5,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
    };
    const recipes: RecipeMap = {
      "recipe-salsa": {
        id: "recipe-salsa",
        name: "Salsa de Tomate",
        servings: 4,
        ingredients: [
          ingredient({
            id: "ing-1",
            product_id: "prod-tomato",
            product_name: "Tomate",
            quantity: 2,
          }),
          ingredient({
            id: "ing-2",
            product_id: "prod-onion",
            product_name: "Cebolla",
            quantity: 0.5,
          }),
        ],
      },
    };

    const result = calculateRecipeCost(
      "recipe-salsa",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );

    // Tomate: 2kg * 2.0 = 4.00, Cebolla: 0.5kg * 1.5 = 0.75
    expect(result.total_cost).toBe(4.75);
    expect(result.servings).toBe(4);
    expect(result.cost_per_serving).toBeCloseTo(1.19, 2);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].line_cost).toBe(4.0);
    expect(result.lines[1].line_cost).toBe(0.75);
    expect(result.recipe_id).toBe("recipe-salsa");
    expect(result.recipe_name).toBe("Salsa de Tomate");
  });

  it("applies waste_percent on ingredient lines", () => {
    const products: ProductMap = {
      "prod-fish": {
        id: "prod-fish",
        name: "Merluza",
        yield_percent: 100,
        allergens: ["pescado"],
      },
    };
    const catalog: CatalogMap = {
      "prod-fish": [
        {
          id: "cat-fish-1",
          supplier_id: "sup-2",
          supplier_name: "Lonja",
          product_id: "prod-fish",
          unit_price: 12.0,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
    };
    const recipes: RecipeMap = {
      "recipe-fish": {
        id: "recipe-fish",
        name: "Merluza a la plancha",
        servings: 2,
        ingredients: [
          ingredient({
            id: "ing-f1",
            product_id: "prod-fish",
            product_name: "Merluza",
            quantity: 1,
            waste_percent: 0.15, // 15% waste
          }),
        ],
      },
    };

    const result = calculateRecipeCost(
      "recipe-fish",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );

    const line = result.lines[0];
    // qty_with_waste = 1 * (1 + 0.15) = 1.15
    expect(line.quantity_with_waste).toBeCloseTo(1.15, 4);
    // line_cost = 1.15 * 12 = 13.80
    expect(line.line_cost).toBe(13.8);
    expect(line.waste_pct).toBe(0.15);
    expect(result.total_cost).toBe(13.8);
    expect(result.cost_per_serving).toBe(6.9);
  });

  it("uses product yield_percent as default waste when ingredient waste is 0 via product lookup", () => {
    // When waste_percent is 0, the engine checks product yield_percent as fallback
    // via: wastePct = ingredient.waste_percent ?? (product ? (100 - product.yield_percent) / 100 : 0)
    // But since waste_percent is 0 (not null/undefined), it won't fall through.
    // This test verifies the explicit waste_percent takes precedence.
    const products: ProductMap = {
      "prod-prawn": {
        id: "prod-prawn",
        name: "Gamba",
        yield_percent: 60, // 40% waste normally
        allergens: ["crustaceos"],
      },
    };
    const catalog: CatalogMap = {
      "prod-prawn": [
        {
          id: "cat-pr-1",
          supplier_id: "sup-3",
          supplier_name: "MarPesca",
          product_id: "prod-prawn",
          unit_price: 20.0,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
    };
    const recipes: RecipeMap = {
      "recipe-gambas": {
        id: "recipe-gambas",
        name: "Gambas al ajillo",
        servings: 2,
        ingredients: [
          ingredient({
            id: "ing-g1",
            product_id: "prod-prawn",
            product_name: "Gamba",
            quantity: 0.5,
            waste_percent: 0, // explicitly set to 0
          }),
        ],
      },
    };

    const result = calculateRecipeCost(
      "recipe-gambas",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );

    // waste_percent is 0 (explicit), so qty_with_waste = 0.5 * 1.0 = 0.5
    expect(result.lines[0].quantity_with_waste).toBe(0.5);
    expect(result.lines[0].line_cost).toBe(10.0);
  });

  it("recursively costs a sub-recipe ingredient", () => {
    const products: ProductMap = {
      "prod-flour": {
        id: "prod-flour",
        name: "Harina",
        yield_percent: 100,
        allergens: ["gluten"],
      },
      "prod-egg": {
        id: "prod-egg",
        name: "Huevo",
        yield_percent: 100,
        allergens: ["huevos"],
      },
      "prod-cream": {
        id: "prod-cream",
        name: "Nata",
        yield_percent: 100,
        allergens: ["lacteos"],
      },
    };
    const catalog: CatalogMap = {
      "prod-flour": [
        {
          id: "cat-fl-1",
          supplier_id: "sup-1",
          supplier_name: "HarinaSA",
          product_id: "prod-flour",
          unit_price: 0.8,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
      "prod-egg": [
        {
          id: "cat-eg-1",
          supplier_id: "sup-1",
          supplier_name: "Granja",
          product_id: "prod-egg",
          unit_price: 3.0,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
      "prod-cream": [
        {
          id: "cat-cr-1",
          supplier_id: "sup-1",
          supplier_name: "Lactea",
          product_id: "prod-cream",
          unit_price: 4.0,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
    };

    // Sub-recipe: Bechamel (makes 4 servings)
    // Flour: 0.2kg * 0.80 = 0.16, Cream: 1L * 4.00 = 4.00 → total = 4.16
    const recipes: RecipeMap = {
      "recipe-bechamel": {
        id: "recipe-bechamel",
        name: "Bechamel",
        servings: 4,
        ingredients: [
          ingredient({
            id: "ing-b1",
            product_id: "prod-flour",
            product_name: "Harina",
            quantity: 0.2,
          }),
          ingredient({
            id: "ing-b2",
            product_id: "prod-cream",
            product_name: "Nata",
            quantity: 1,
            unit: L,
            unit_id: L.id,
          }),
        ],
      },
      // Main recipe: Lasagna uses Bechamel + Eggs
      "recipe-lasagna": {
        id: "recipe-lasagna",
        name: "Lasagna",
        servings: 6,
        ingredients: [
          ingredient({
            id: "ing-l1",
            sub_recipe_id: "recipe-bechamel",
            product_name: "Bechamel",
            quantity: 2, // 2 servings of bechamel
          }),
          ingredient({
            id: "ing-l2",
            product_id: "prod-egg",
            product_name: "Huevo",
            quantity: 3,
            unit: UN,
            unit_id: UN.id,
          }),
        ],
      },
    };

    const result = calculateRecipeCost(
      "recipe-lasagna",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );

    // Bechamel total_cost = 0.16 + 4.00 = 4.16, cost per serving = 4.16 / 4 = 1.04
    // Bechamel line: qty=2, waste=0, so line_cost = 2 * 1.04 = 2.08
    const bechamelLine = result.lines[0];
    expect(bechamelLine.is_sub_recipe).toBe(true);
    expect(bechamelLine.unit_cost).toBeCloseTo(1.04, 2);
    expect(bechamelLine.line_cost).toBe(2.08);
    expect(bechamelLine.sub_recipe_cost).toBeDefined();
    expect(bechamelLine.sub_recipe_cost!.total_cost).toBe(4.16);

    // Egg line: 3 * 3.0 = 9.00
    const eggLine = result.lines[1];
    expect(eggLine.line_cost).toBe(9.0);

    // Total: 2.08 + 9.00 = 11.08
    expect(result.total_cost).toBe(11.08);
    expect(result.servings).toBe(6);
    expect(result.cost_per_serving).toBeCloseTo(1.85, 2);

    // Allergens should bubble up from sub-recipe + direct ingredients
    expect(result.allergens).toContain("gluten");
    expect(result.allergens).toContain("lacteos");
    expect(result.allergens).toContain("huevos");
  });

  it("throws on circular sub-recipe dependency", () => {
    const recipes: RecipeMap = {
      "recipe-a": {
        id: "recipe-a",
        name: "Recipe A",
        servings: 1,
        ingredients: [
          ingredient({ id: "ing-a1", sub_recipe_id: "recipe-b", product_name: "B" }),
        ],
      },
      "recipe-b": {
        id: "recipe-b",
        name: "Recipe B",
        servings: 1,
        ingredients: [
          ingredient({ id: "ing-b1", sub_recipe_id: "recipe-a", product_name: "A" }),
        ],
      },
    };

    expect(() =>
      calculateRecipeCost("recipe-a", recipes, {}, {}, DEFAULT_PRICING),
    ).toThrow(/Circular sub-recipe dependency/);
  });

  it("returns 0 cost for a recipe with no ingredients", () => {
    const recipes: RecipeMap = {
      "recipe-empty": {
        id: "recipe-empty",
        name: "Empty Recipe",
        servings: 4,
        ingredients: [],
      },
    };

    const result = calculateRecipeCost(
      "recipe-empty",
      recipes,
      {},
      {},
      DEFAULT_PRICING,
    );

    expect(result.total_cost).toBe(0);
    expect(result.cost_per_serving).toBe(0);
    expect(result.lines).toHaveLength(0);
    expect(result.allergens).toHaveLength(0);
    expect(result.suggested_pvp).toBe(0);
  });

  it("returns 0 cost lines when ingredient product is not in catalog", () => {
    const products: ProductMap = {
      "prod-salt": {
        id: "prod-salt",
        name: "Sal",
        yield_percent: 100,
        allergens: [],
      },
    };
    const catalog: CatalogMap = {}; // empty catalog
    const recipes: RecipeMap = {
      "recipe-salt": {
        id: "recipe-salt",
        name: "Agua con sal",
        servings: 1,
        ingredients: [
          ingredient({
            id: "ing-s1",
            product_id: "prod-salt",
            product_name: "Sal",
            quantity: 0.01,
          }),
        ],
      },
    };

    const result = calculateRecipeCost(
      "recipe-salt",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );

    expect(result.lines[0].unit_cost).toBe(0);
    expect(result.lines[0].line_cost).toBe(0);
    expect(result.total_cost).toBe(0);
  });

  it("returns 0 cost when ingredient has no product_id", () => {
    const recipes: RecipeMap = {
      "recipe-misc": {
        id: "recipe-misc",
        name: "Misc",
        servings: 1,
        ingredients: [
          ingredient({
            id: "ing-m1",
            product_id: null,
            product_name: "Decoracion",
            quantity: 1,
          }),
        ],
      },
    };

    const result = calculateRecipeCost(
      "recipe-misc",
      recipes,
      {},
      {},
      DEFAULT_PRICING,
    );

    expect(result.lines[0].unit_cost).toBe(0);
    expect(result.lines[0].line_cost).toBe(0);
  });

  it("applies volume discounts from catalog entries", () => {
    const products: ProductMap = {
      "prod-oil": {
        id: "prod-oil",
        name: "Aceite de Oliva",
        yield_percent: 100,
        allergens: [],
      },
    };
    const catalog: CatalogMap = {
      "prod-oil": [
        {
          id: "cat-oil-1",
          supplier_id: "sup-4",
          supplier_name: "Aceitera",
          product_id: "prod-oil",
          unit_price: 6.0, // base price per L
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [
            { min_qty: 5, unit_price: 5.0 },
            { min_qty: 20, unit_price: 4.0 },
          ],
        },
      ],
    };
    const recipes: RecipeMap = {
      "recipe-oil-small": {
        id: "recipe-oil-small",
        name: "Small Oil Use",
        servings: 1,
        ingredients: [
          ingredient({
            id: "ing-o1",
            product_id: "prod-oil",
            product_name: "Aceite de Oliva",
            quantity: 2, // below 5L threshold
            unit: L,
            unit_id: L.id,
          }),
        ],
      },
      "recipe-oil-medium": {
        id: "recipe-oil-medium",
        name: "Medium Oil Use",
        servings: 1,
        ingredients: [
          ingredient({
            id: "ing-o2",
            product_id: "prod-oil",
            product_name: "Aceite de Oliva",
            quantity: 10, // above 5L threshold
            unit: L,
            unit_id: L.id,
          }),
        ],
      },
      "recipe-oil-large": {
        id: "recipe-oil-large",
        name: "Large Oil Use",
        servings: 1,
        ingredients: [
          ingredient({
            id: "ing-o3",
            product_id: "prod-oil",
            product_name: "Aceite de Oliva",
            quantity: 25, // above 20L threshold
            unit: L,
            unit_id: L.id,
          }),
        ],
      },
    };

    // Small: 2L at 6.00 = 12.00 (no discount)
    const small = calculateRecipeCost(
      "recipe-oil-small",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );
    expect(small.lines[0].unit_cost).toBe(6.0);
    expect(small.total_cost).toBe(12.0);

    // Medium: 10L at 5.00 = 50.00 (5L tier)
    const medium = calculateRecipeCost(
      "recipe-oil-medium",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );
    expect(medium.lines[0].unit_cost).toBe(5.0);
    expect(medium.total_cost).toBe(50.0);

    // Large: 25L at 4.00 = 100.00 (20L tier)
    const large = calculateRecipeCost(
      "recipe-oil-large",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );
    expect(large.lines[0].unit_cost).toBe(4.0);
    expect(large.total_cost).toBe(100.0);
  });

  it("picks the cheapest catalog entry when multiple suppliers exist", () => {
    const products: ProductMap = {
      "prod-rice": {
        id: "prod-rice",
        name: "Arroz",
        yield_percent: 100,
        allergens: [],
      },
    };
    const catalog: CatalogMap = {
      "prod-rice": [
        {
          id: "cat-rice-expensive",
          supplier_id: "sup-a",
          supplier_name: "Expensive",
          product_id: "prod-rice",
          unit_price: 3.0,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: false,
          volume_discounts: [],
        },
        {
          id: "cat-rice-cheap",
          supplier_id: "sup-b",
          supplier_name: "Cheap",
          product_id: "prod-rice",
          unit_price: 1.5,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
    };
    const recipes: RecipeMap = {
      "recipe-rice": {
        id: "recipe-rice",
        name: "Arroz blanco",
        servings: 2,
        ingredients: [
          ingredient({
            id: "ing-r1",
            product_id: "prod-rice",
            product_name: "Arroz",
            quantity: 0.5,
          }),
        ],
      },
    };

    const result = calculateRecipeCost(
      "recipe-rice",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );

    // Should pick 1.5 (cheapest)
    expect(result.lines[0].unit_cost).toBe(1.5);
    expect(result.total_cost).toBe(0.75);
  });

  it("uses explicit catalog_entry_id when set on ingredient", () => {
    const products: ProductMap = {
      "prod-rice": {
        id: "prod-rice",
        name: "Arroz",
        yield_percent: 100,
        allergens: [],
      },
    };
    const catalog: CatalogMap = {
      "prod-rice": [
        {
          id: "cat-rice-expensive",
          supplier_id: "sup-a",
          supplier_name: "Expensive",
          product_id: "prod-rice",
          unit_price: 3.0,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: false,
          volume_discounts: [],
        },
        {
          id: "cat-rice-cheap",
          supplier_id: "sup-b",
          supplier_name: "Cheap",
          product_id: "prod-rice",
          unit_price: 1.5,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
    };
    const recipes: RecipeMap = {
      "recipe-rice-forced": {
        id: "recipe-rice-forced",
        name: "Arroz premium",
        servings: 1,
        ingredients: [
          ingredient({
            id: "ing-rf1",
            product_id: "prod-rice",
            product_name: "Arroz",
            quantity: 1,
            catalog_entry_id: "cat-rice-expensive", // force expensive supplier
          }),
        ],
      },
    };

    const result = calculateRecipeCost(
      "recipe-rice-forced",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );

    expect(result.lines[0].unit_cost).toBe(3.0);
    expect(result.total_cost).toBe(3.0);
  });

  it("throws when recipe ID is not found", () => {
    expect(() =>
      calculateRecipeCost("nonexistent", {}, {}, {}, DEFAULT_PRICING),
    ).toThrow(/Recipe not found: nonexistent/);
  });

  it("populates suggested_pvp and margin fields", () => {
    const products: ProductMap = {
      "prod-chicken": {
        id: "prod-chicken",
        name: "Pollo",
        yield_percent: 100,
        allergens: [],
      },
    };
    const catalog: CatalogMap = {
      "prod-chicken": [
        {
          id: "cat-ch-1",
          supplier_id: "sup-1",
          supplier_name: "Avicola",
          product_id: "prod-chicken",
          unit_price: 5.0,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
    };
    const recipes: RecipeMap = {
      "recipe-pollo": {
        id: "recipe-pollo",
        name: "Pollo asado",
        servings: 2,
        ingredients: [
          ingredient({
            id: "ing-ch1",
            product_id: "prod-chicken",
            product_name: "Pollo",
            quantity: 1.5,
          }),
        ],
      },
    };

    const result = calculateRecipeCost(
      "recipe-pollo",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );

    // total = 7.5, cost_per_serving = 3.75
    // pvp = ceil(3.75 / 0.30 / 0.50) * 0.50 = ceil(12.5 / 0.50) * 0.50 = ceil(25) * 0.50 = 12.50
    expect(result.suggested_pvp).toBe(12.5);
    expect(result.margin_gross).toBe(12.5 - 3.75);
    expect(result.food_cost_pct).toBeCloseTo(3.75 / 12.5, 4);
  });

  it("handles recipe with servings = 0 gracefully", () => {
    const recipes: RecipeMap = {
      "recipe-zero": {
        id: "recipe-zero",
        name: "Zero servings",
        servings: 0,
        ingredients: [
          ingredient({
            id: "ing-z1",
            product_id: "prod-x",
            product_name: "X",
            quantity: 1,
          }),
        ],
      },
    };
    const catalog: CatalogMap = {
      "prod-x": [
        {
          id: "cat-x-1",
          supplier_id: "sup-1",
          supplier_name: "Sup",
          product_id: "prod-x",
          unit_price: 10.0,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
    };

    const result = calculateRecipeCost(
      "recipe-zero",
      recipes,
      {},
      catalog,
      DEFAULT_PRICING,
    );

    // cost_per_serving falls back to total_cost when servings = 0
    expect(result.cost_per_serving).toBe(result.total_cost);
  });
});

// ─── calculateSuggestedPvp ─────────────────────────────────

describe("calculateSuggestedPvp", () => {
  it("calculates standard PVP with 30% food cost and 0.50 rounding", () => {
    // 3.10 / 0.30 = 10.333... → ceil(10.333.../0.50)*0.50 = ceil(20.666...)*0.50 = 21*0.50 = 10.50
    expect(calculateSuggestedPvp(3.10, 0.30, 0.50)).toBe(10.5);
  });

  it("rounds up to next commercial increment", () => {
    // 3.00 / 0.30 = 10.00 → ceil(10.00/0.50)*0.50 = 20*0.50 = 10.00
    expect(calculateSuggestedPvp(3.0, 0.30, 0.50)).toBe(10.0);

    // 3.01 / 0.30 = 10.0333... → ceil(10.0333.../0.50)*0.50 = ceil(20.0666...)*0.50 = 21*0.50 = 10.50
    expect(calculateSuggestedPvp(3.01, 0.30, 0.50)).toBe(10.5);
  });

  it("returns 0 for zero cost per serving", () => {
    expect(calculateSuggestedPvp(0, 0.30, 0.50)).toBe(0);
  });

  it("returns 0 when target_food_cost_pct is 0 or negative", () => {
    expect(calculateSuggestedPvp(5.0, 0, 0.50)).toBe(0);
    expect(calculateSuggestedPvp(5.0, -0.1, 0.50)).toBe(0);
  });

  it("returns 0 when target_food_cost_pct is > 1", () => {
    expect(calculateSuggestedPvp(5.0, 1.5, 0.50)).toBe(0);
  });

  it("works with target_food_cost_pct exactly 1.0", () => {
    // pvp = 5.0 / 1.0 = 5.0 → ceil(5.0/0.50)*0.50 = 5.0
    expect(calculateSuggestedPvp(5.0, 1.0, 0.50)).toBe(5.0);
  });

  it("skips commercial rounding when rounding is 0", () => {
    // 3.10 / 0.30 = 10.3333... → round2 = 10.33
    expect(calculateSuggestedPvp(3.10, 0.30, 0)).toBe(10.33);
  });

  it("skips commercial rounding when rounding is negative", () => {
    expect(calculateSuggestedPvp(3.10, 0.30, -1)).toBe(10.33);
  });

  it("handles very high cost per serving", () => {
    // 150 / 0.30 = 500 → ceil(500/0.50)*0.50 = 500
    expect(calculateSuggestedPvp(150, 0.30, 0.50)).toBe(500.0);
  });

  it("handles fine-grained rounding (0.10 increment)", () => {
    // 2.85 / 0.30 = 9.50 → ceil(9.50/0.10)*0.10 = 95*0.10 = 9.50
    expect(calculateSuggestedPvp(2.85, 0.30, 0.10)).toBe(9.5);

    // 2.86 / 0.30 = 9.5333... → ceil(9.5333.../0.10)*0.10 = ceil(95.333...)*0.10 = 96*0.10 = 9.60
    expect(calculateSuggestedPvp(2.86, 0.30, 0.10)).toBe(9.6);
  });
});

// ─── collectAllergens ──────────────────────────────────────

describe("collectAllergens", () => {
  it("returns sorted unique allergens from cost result", () => {
    const result: RecipeCostResult = {
      recipe_id: "r1",
      recipe_name: "Test",
      total_cost: 10,
      servings: 2,
      cost_per_serving: 5,
      food_cost_pct: 0.3,
      suggested_pvp: 16.5,
      margin_gross: 11.5,
      allergens: ["lacteos", "gluten", "huevos", "gluten"], // duplicates
      lines: [],
    };

    const allergens = collectAllergens(result);
    expect(allergens).toEqual(["gluten", "huevos", "lacteos"]);
  });

  it("returns empty array when no allergens", () => {
    const result: RecipeCostResult = {
      recipe_id: "r2",
      recipe_name: "Water",
      total_cost: 0,
      servings: 1,
      cost_per_serving: 0,
      food_cost_pct: 0,
      suggested_pvp: 0,
      margin_gross: 0,
      allergens: [],
      lines: [],
    };

    expect(collectAllergens(result)).toEqual([]);
  });

  it("handles single allergen", () => {
    const result: RecipeCostResult = {
      recipe_id: "r3",
      recipe_name: "Simple",
      total_cost: 5,
      servings: 1,
      cost_per_serving: 5,
      food_cost_pct: 0.3,
      suggested_pvp: 17,
      margin_gross: 12,
      allergens: ["sulfitos"],
      lines: [],
    };

    expect(collectAllergens(result)).toEqual(["sulfitos"]);
  });

  it("allergens flow through full calculateRecipeCost pipeline", () => {
    const products: ProductMap = {
      "prod-milk": {
        id: "prod-milk",
        name: "Leche",
        yield_percent: 100,
        allergens: ["lacteos"],
      },
      "prod-bread": {
        id: "prod-bread",
        name: "Pan",
        yield_percent: 100,
        allergens: ["gluten", "sesamo"],
      },
    };
    const catalog: CatalogMap = {
      "prod-milk": [
        {
          id: "cat-m1",
          supplier_id: "s1",
          supplier_name: "S1",
          product_id: "prod-milk",
          unit_price: 1.0,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
      "prod-bread": [
        {
          id: "cat-b1",
          supplier_id: "s1",
          supplier_name: "S1",
          product_id: "prod-bread",
          unit_price: 2.0,
          min_order_qty: 1,
          pack_size: 1,
          is_preferred: true,
          volume_discounts: [],
        },
      ],
    };
    const recipes: RecipeMap = {
      "recipe-toast": {
        id: "recipe-toast",
        name: "Tostada con leche",
        servings: 1,
        ingredients: [
          ingredient({
            id: "ing-t1",
            product_id: "prod-milk",
            product_name: "Leche",
            quantity: 0.25,
            unit: L,
            unit_id: L.id,
          }),
          ingredient({
            id: "ing-t2",
            product_id: "prod-bread",
            product_name: "Pan",
            quantity: 0.1,
          }),
        ],
      },
    };

    const result = calculateRecipeCost(
      "recipe-toast",
      recipes,
      products,
      catalog,
      DEFAULT_PRICING,
    );

    const allergens = collectAllergens(result);
    expect(allergens).toEqual(["gluten", "lacteos", "sesamo"]);
  });
});
