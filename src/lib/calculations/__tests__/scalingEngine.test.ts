import { describe, it, expect } from "vitest";
import { scaleRecipe, generateShoppingList } from "../scalingEngine";
import type {
  RecipeIngredient,
  CatalogMap,
  MeasurementUnit,
} from "../types";

// ─── Shared fixtures ───────────────────────────────────────

const kg: MeasurementUnit = { id: "u-kg", name: "Kilogramo", abbreviation: "kg" };
const lt: MeasurementUnit = { id: "u-lt", name: "Litro", abbreviation: "lt" };

function makeIngredient(overrides: Partial<RecipeIngredient> & Pick<RecipeIngredient, "product_id" | "quantity">): RecipeIngredient {
  return {
    product_name: "Ingrediente",
    unit_id: "u-kg",
    unit: kg,
    waste_percent: 0,
    ...overrides,
  };
}

const baseCatalog: CatalogMap = {
  "prod-chicken": [
    {
      id: "ce-1",
      supplier_id: "sup-1",
      supplier_name: "Avicola Sur",
      product_id: "prod-chicken",
      unit_price: 5.0,
      min_order_qty: 0,
      pack_size: 1,
      is_preferred: true,
      volume_discounts: [],
    },
  ],
  "prod-oil": [
    {
      id: "ce-2",
      supplier_id: "sup-2",
      supplier_name: "Aceites Norte",
      product_id: "prod-oil",
      unit_price: 3.0,
      min_order_qty: 0,
      pack_size: 1,
      is_preferred: true,
      volume_discounts: [],
    },
  ],
  "prod-rice": [
    {
      id: "ce-3",
      supplier_id: "sup-3",
      supplier_name: "Arrocera Central",
      product_id: "prod-rice",
      unit_price: 2.0,
      min_order_qty: 0,
      pack_size: 1,
      is_preferred: false,
      volume_discounts: [],
    },
  ],
};

const baseIngredients: RecipeIngredient[] = [
  makeIngredient({ product_id: "prod-chicken", product_name: "Pollo", quantity: 2, unit: kg }),
  makeIngredient({ product_id: "prod-oil", product_name: "Aceite", quantity: 0.5, unit: lt, unit_id: "u-lt" }),
  makeIngredient({ product_id: "prod-rice", product_name: "Arroz", quantity: 1, unit: kg }),
];

// ─── scaleRecipe ───────────────────────────────────────────

describe("scaleRecipe", () => {
  it("1. Scale 4->40 (x10): all quantities multiplied by 10", () => {
    const result = scaleRecipe(4, 40, baseIngredients, baseCatalog);

    expect(result.scale_factor).toBe(10);
    expect(result.target_servings).toBe(40);
    expect(result.original_servings).toBe(4);

    // Pollo: 2 * 10 = 20
    expect(result.lines[0]!.scaled_qty).toBe(20);
    // Aceite: 0.5 * 10 = 5
    expect(result.lines[1]!.scaled_qty).toBe(5);
    // Arroz: 1 * 10 = 10
    expect(result.lines[2]!.scaled_qty).toBe(10);
  });

  it("2. Waste percent applied: qty * scaleFactor * (1 + waste_percent)", () => {
    const ingredientsWithWaste: RecipeIngredient[] = [
      makeIngredient({
        product_id: "prod-chicken",
        product_name: "Pollo",
        quantity: 2,
        waste_percent: 0.10, // 10% waste
      }),
      makeIngredient({
        product_id: "prod-oil",
        product_name: "Aceite",
        quantity: 0.5,
        waste_percent: 0.05, // 5% waste
        unit: lt,
        unit_id: "u-lt",
      }),
    ];

    const result = scaleRecipe(4, 40, ingredientsWithWaste, baseCatalog);

    // Pollo: 2 * 10 * 1.10 = 22
    expect(result.lines[0]!.scaled_qty_with_waste).toBe(22);
    // Aceite: 0.5 * 10 * 1.05 = 5.25
    expect(result.lines[1]!.scaled_qty_with_waste).toBe(5.25);
  });

  it("3. Cost calculated from catalog prices x scaled qty with waste", () => {
    const ingredientsWithWaste: RecipeIngredient[] = [
      makeIngredient({
        product_id: "prod-chicken",
        product_name: "Pollo",
        quantity: 2,
        waste_percent: 0.10,
      }),
    ];

    const result = scaleRecipe(4, 40, ingredientsWithWaste, baseCatalog);

    // unit_price=5, scaled_qty_with_waste=22, line_cost=110
    expect(result.lines[0]!.unit_cost).toBe(5);
    expect(result.lines[0]!.line_cost).toBe(110);
    expect(result.total_cost).toBe(110);
  });

  it("4. Cost per serving = total / target_servings", () => {
    const result = scaleRecipe(4, 40, baseIngredients, baseCatalog);

    // Pollo: 20*5=100, Aceite: 5*3=15, Arroz: 10*2=20 => total=135
    // cost_per_serving = 135 / 40 = 3.375 => round2 = 3.38
    expect(result.total_cost).toBe(135);
    expect(result.cost_per_serving).toBe(3.38);
  });

  it("5. Scale to 1 serving (divide down)", () => {
    const result = scaleRecipe(4, 1, baseIngredients, baseCatalog);

    expect(result.scale_factor).toBe(0.25);
    // Pollo: 2 * 0.25 = 0.5
    expect(result.lines[0]!.scaled_qty).toBe(0.5);
    // Aceite: 0.5 * 0.25 = 0.125 => round2 = 0.13
    expect(result.lines[1]!.scaled_qty).toBe(0.13);
    // Arroz: 1 * 0.25 = 0.25
    expect(result.lines[2]!.scaled_qty).toBe(0.25);
  });

  it("6. originalServings = 0 throws error", () => {
    expect(() => scaleRecipe(0, 10, baseIngredients, baseCatalog)).toThrow(
      "originalServings must be positive",
    );
  });

  it("negative originalServings also throws", () => {
    expect(() => scaleRecipe(-1, 10, baseIngredients, baseCatalog)).toThrow(
      "originalServings must be positive",
    );
  });

  it("missing product_id yields unit_cost = 0", () => {
    const ingredients: RecipeIngredient[] = [
      makeIngredient({ product_id: null, product_name: "Sal", quantity: 1 }),
    ];

    const result = scaleRecipe(1, 10, ingredients, baseCatalog);

    expect(result.lines[0]!.unit_cost).toBe(0);
    expect(result.lines[0]!.line_cost).toBe(0);
  });

  it("missing product_name defaults to 'Desconocido'", () => {
    const ingredients: RecipeIngredient[] = [
      { product_id: "prod-chicken", unit_id: "u-kg", quantity: 1 },
    ];

    const result = scaleRecipe(1, 1, ingredients, baseCatalog);

    expect(result.lines[0]!.product_name).toBe("Desconocido");
  });

  it("product not found in catalog yields unit_cost = 0", () => {
    const ingredients: RecipeIngredient[] = [
      makeIngredient({ product_id: "prod-missing", product_name: "Trufa", quantity: 1 }),
    ];

    const result = scaleRecipe(1, 10, ingredients, {});

    expect(result.lines[0]!.unit_cost).toBe(0);
    expect(result.lines[0]!.line_cost).toBe(0);
  });

  it("picks cheapest catalog entry when multiple suppliers exist", () => {
    const multiCatalog: CatalogMap = {
      "prod-chicken": [
        { id: "ce-x", supplier_id: "sup-x", supplier_name: "Caro", product_id: "prod-chicken", unit_price: 8.0, min_order_qty: 0, pack_size: 1, is_preferred: false, volume_discounts: [] },
        { id: "ce-y", supplier_id: "sup-y", supplier_name: "Barato", product_id: "prod-chicken", unit_price: 4.0, min_order_qty: 0, pack_size: 1, is_preferred: true, volume_discounts: [] },
      ],
    };

    const ingredients: RecipeIngredient[] = [
      makeIngredient({ product_id: "prod-chicken", product_name: "Pollo", quantity: 1 }),
    ];

    const result = scaleRecipe(1, 1, ingredients, multiCatalog);

    expect(result.lines[0]!.unit_cost).toBe(4);
  });
});

// ─── generateShoppingList ──────────────────────────────────

describe("generateShoppingList", () => {
  it("7. Aggregates same product from multiple ingredients", () => {
    const ingredients: RecipeIngredient[] = [
      makeIngredient({ product_id: "prod-chicken", product_name: "Pechuga", quantity: 2 }),
      makeIngredient({ product_id: "prod-chicken", product_name: "Muslo", quantity: 1 }),
      makeIngredient({ product_id: "prod-rice", product_name: "Arroz", quantity: 3 }),
    ];

    const scaled = scaleRecipe(1, 10, ingredients, baseCatalog);
    const list = generateShoppingList(scaled, baseCatalog, ingredients);

    // Two unique products: chicken and rice
    expect(list).toHaveLength(2);

    const chickenItem = list.find((i) => i.product_id === "prod-chicken");
    // Chicken total: (20 + 10) = 30 (no waste)
    expect(chickenItem?.qty_needed).toBe(30);

    const riceItem = list.find((i) => i.product_id === "prod-rice");
    expect(riceItem?.qty_needed).toBe(30);
  });

  it("8. Adjusts to MOQ and pack sizes", () => {
    const moqCatalog: CatalogMap = {
      "prod-chicken": [
        {
          id: "ce-moq",
          supplier_id: "sup-1",
          supplier_name: "Avicola Sur",
          product_id: "prod-chicken",
          unit_price: 5.0,
          min_order_qty: 50,  // MOQ = 50
          pack_size: 5,       // pack of 5
          is_preferred: true,
          volume_discounts: [],
        },
      ],
    };

    const ingredients: RecipeIngredient[] = [
      makeIngredient({ product_id: "prod-chicken", product_name: "Pollo", quantity: 1 }),
    ];

    // Scale 1->7 => qty_needed = 7
    const scaled = scaleRecipe(1, 7, ingredients, moqCatalog);
    const list = generateShoppingList(scaled, moqCatalog, ingredients);

    expect(list).toHaveLength(1);
    const item = list[0]!;

    // qty_needed = 7, pack_size = 5 => ceil(7/5) = 2 packs => 10
    // but MOQ = 50 => qty_to_order = max(10, 50) = 50
    expect(item.packs).toBe(2);
    expect(item.qty_to_order).toBe(50);
    // estimated_cost = 50 * 5 = 250
    expect(item.estimated_cost).toBe(250);
  });

  it("skips ingredients with no product_id", () => {
    const ingredients: RecipeIngredient[] = [
      makeIngredient({ product_id: null, product_name: "Sal", quantity: 1 }),
      makeIngredient({ product_id: "prod-rice", product_name: "Arroz", quantity: 2 }),
    ];

    const scaled = scaleRecipe(1, 1, ingredients, baseCatalog);
    const list = generateShoppingList(scaled, baseCatalog, ingredients);

    expect(list).toHaveLength(1);
    expect(list[0]!.product_id).toBe("prod-rice");
  });

  it("product not in catalog gives default supplier and zero cost", () => {
    const ingredients: RecipeIngredient[] = [
      makeIngredient({ product_id: "prod-unknown", product_name: "Trufa", quantity: 1 }),
    ];

    const scaled = scaleRecipe(1, 1, ingredients, {});
    const list = generateShoppingList(scaled, {}, ingredients);

    expect(list).toHaveLength(1);
    expect(list[0]!.supplier_name).toBe("Sin proveedor");
    expect(list[0]!.estimated_cost).toBe(0);
  });

  it("picks cheapest entry for shopping list cost", () => {
    const multiCatalog: CatalogMap = {
      "prod-chicken": [
        { id: "ce-a", supplier_id: "sup-a", supplier_name: "Caro", product_id: "prod-chicken", unit_price: 10, min_order_qty: 0, pack_size: 1, is_preferred: false, volume_discounts: [] },
        { id: "ce-b", supplier_id: "sup-b", supplier_name: "Barato", product_id: "prod-chicken", unit_price: 3, min_order_qty: 0, pack_size: 1, is_preferred: true, volume_discounts: [] },
      ],
    };

    const ingredients: RecipeIngredient[] = [
      makeIngredient({ product_id: "prod-chicken", product_name: "Pollo", quantity: 5 }),
    ];

    const scaled = scaleRecipe(1, 1, ingredients, multiCatalog);
    const list = generateShoppingList(scaled, multiCatalog, ingredients);

    expect(list[0]!.supplier_name).toBe("Barato");
    expect(list[0]!.estimated_cost).toBe(15); // 5 * 3
  });
});
