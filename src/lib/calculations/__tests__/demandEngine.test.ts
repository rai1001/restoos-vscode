import { calculateDemand } from "../demandEngine";
import type {
  EventWithMenu,
  RecipeMap,
  ProductMap,
  MeasurementUnit,
} from "../types";

// ─── Shared fixtures ────────────────────────────────────────

const unitKg: MeasurementUnit = { id: "u-kg", name: "Kilogramo", abbreviation: "kg" };
const unitL: MeasurementUnit = { id: "u-l", name: "Litro", abbreviation: "L" };
const unitUd: MeasurementUnit = { id: "u-ud", name: "Unidad", abbreviation: "ud" };

const products: ProductMap = {
  "p-arroz": { id: "p-arroz", name: "Arroz", yield_percent: 100, allergens: [] },
  "p-caldo": { id: "p-caldo", name: "Caldo", yield_percent: 100, allergens: [] },
  "p-pollo": { id: "p-pollo", name: "Pollo", yield_percent: 85, allergens: [] },
  "p-aceite": { id: "p-aceite", name: "Aceite", yield_percent: 100, allergens: [] },
  "p-cebolla": { id: "p-cebolla", name: "Cebolla", yield_percent: 90, allergens: [] },
  "p-gambas": { id: "p-gambas", name: "Gambas", yield_percent: 80, allergens: ["crustaceos"] },
  "p-sal": { id: "p-sal", name: "Sal", yield_percent: 100, allergens: [] },
};

function makeRecipes(): RecipeMap {
  return {
    "r-paella": {
      id: "r-paella",
      name: "Paella",
      servings: 4,
      category: "principales",
      ingredients: [
        {
          id: "ri-1", product_id: "p-arroz", product_name: "Arroz",
          sub_recipe_id: null, quantity: 0.4, unit: unitKg, unit_id: "u-kg",
          waste_percent: 0,
        },
        {
          id: "ri-2", product_id: "p-caldo", product_name: "Caldo",
          sub_recipe_id: null, quantity: 1.2, unit: unitL, unit_id: "u-l",
          waste_percent: 0,
        },
      ],
    },
    "r-pollo-asado": {
      id: "r-pollo-asado",
      name: "Pollo Asado",
      servings: 2,
      category: "principales",
      ingredients: [
        {
          id: "ri-3", product_id: "p-pollo", product_name: "Pollo",
          sub_recipe_id: null, quantity: 0.5, unit: unitKg, unit_id: "u-kg",
          waste_percent: 0.15,
        },
        {
          id: "ri-4", product_id: "p-aceite", product_name: "Aceite",
          sub_recipe_id: null, quantity: 0.05, unit: unitL, unit_id: "u-l",
          waste_percent: 0,
        },
      ],
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────

describe("calculateDemand", () => {
  it("single event with 1 menu, 2 recipes produces correct demand lines", () => {
    const recipes = makeRecipes();
    const events: EventWithMenu[] = [
      {
        event_id: "ev1",
        name: "Boda Garcia",
        date: "2026-04-01",
        pax: 4,
        menu: {
          items: [
            { recipe_id: "r-paella" },
            { recipe_id: "r-pollo-asado" },
          ],
        },
      },
    ];

    const result = calculateDemand(events, [], recipes, products);

    // Paella: 4 servings needed / 4 servings recipe = scale 1
    //   arroz: 0.4 * 1 * (1+0) = 0.4 kg
    //   caldo: 1.2 * 1 * (1+0) = 1.2 L
    // Pollo Asado: 4 servings / 2 servings recipe = scale 2
    //   pollo: 0.5 * 2 * (1+0.15) = 1.15 kg
    //   aceite: 0.05 * 2 * (1+0) = 0.1 L
    const arroz = result.find((d) => d.product_id === "p-arroz");
    expect(arroz).toBeDefined();
    expect(arroz!.total_qty_needed).toBeCloseTo(0.4, 2);

    const caldo = result.find((d) => d.product_id === "p-caldo");
    expect(caldo!.total_qty_needed).toBeCloseTo(1.2, 2);

    const pollo = result.find((d) => d.product_id === "p-pollo");
    expect(pollo!.total_qty_needed).toBeCloseTo(1.15, 2);

    const aceite = result.find((d) => d.product_id === "p-aceite");
    expect(aceite!.total_qty_needed).toBeCloseTo(0.1, 2);
  });

  it("multiple events aggregate demand for shared products", () => {
    const recipes = makeRecipes();
    const events: EventWithMenu[] = [
      {
        event_id: "ev1", name: "Evento A", date: "2026-04-01", pax: 4,
        menu: { items: [{ recipe_id: "r-paella" }] },
      },
      {
        event_id: "ev2", name: "Evento B", date: "2026-04-02", pax: 8,
        menu: { items: [{ recipe_id: "r-paella" }] },
      },
    ];

    const result = calculateDemand(events, [], recipes, products);

    // Event A: scale 4/4=1 -> arroz 0.4
    // Event B: scale 8/4=2 -> arroz 0.8
    // Total: 1.2
    const arroz = result.find((d) => d.product_id === "p-arroz");
    expect(arroz!.total_qty_needed).toBeCloseTo(1.2, 2);
    expect(arroz!.breakdown).toHaveLength(2);
  });

  it("scales correctly with pax (100 guests, recipe for 4)", () => {
    const recipes = makeRecipes();
    const events: EventWithMenu[] = [
      {
        event_id: "ev-big", name: "Gran Evento", date: "2026-05-01", pax: 100,
        menu: { items: [{ recipe_id: "r-paella" }] },
      },
    ];

    const result = calculateDemand(events, [], recipes, products);

    // scale = 100/4 = 25
    // arroz: 0.4 * 25 = 10 kg
    // caldo: 1.2 * 25 = 30 L
    const arroz = result.find((d) => d.product_id === "p-arroz");
    expect(arroz!.total_qty_needed).toBeCloseTo(10, 2);

    const caldo = result.find((d) => d.product_id === "p-caldo");
    expect(caldo!.total_qty_needed).toBeCloseTo(30, 2);
  });

  it("recursively explodes sub-recipes into raw products", () => {
    const recipes: RecipeMap = {
      "r-main": {
        id: "r-main",
        name: "Plato Principal",
        servings: 2,
        ingredients: [
          {
            id: "ri-sub", product_id: null, product_name: "Sofrito",
            sub_recipe_id: "r-sofrito", quantity: 2, unit: unitUd, unit_id: "u-ud",
            waste_percent: 0,
          },
          {
            id: "ri-arroz", product_id: "p-arroz", product_name: "Arroz",
            sub_recipe_id: null, quantity: 0.3, unit: unitKg, unit_id: "u-kg",
            waste_percent: 0,
          },
        ],
      },
      "r-sofrito": {
        id: "r-sofrito",
        name: "Sofrito",
        servings: 1,
        ingredients: [
          {
            id: "ri-ceb", product_id: "p-cebolla", product_name: "Cebolla",
            sub_recipe_id: null, quantity: 0.2, unit: unitKg, unit_id: "u-kg",
            waste_percent: 0.1,
          },
          {
            id: "ri-ace", product_id: "p-aceite", product_name: "Aceite",
            sub_recipe_id: null, quantity: 0.05, unit: unitL, unit_id: "u-l",
            waste_percent: 0,
          },
        ],
      },
    };

    const events: EventWithMenu[] = [
      {
        event_id: "ev1", name: "Test", date: "2026-04-01", pax: 2,
        menu: { items: [{ recipe_id: "r-main" }] },
      },
    ];

    const result = calculateDemand(events, [], recipes, products);

    // r-main scale = 2/2 = 1
    // sub-recipe ref: quantity=2, scaled=2*1=2 -> that's totalServingsNeeded for sofrito
    // r-sofrito scale = 2/1 = 2
    //   cebolla: 0.2 * 2 * (1+0.1) = 0.44
    //   aceite:  0.05 * 2 * (1+0) = 0.1
    // arroz direct: 0.3 * 1 * (1+0) = 0.3

    const cebolla = result.find((d) => d.product_id === "p-cebolla");
    expect(cebolla).toBeDefined();
    expect(cebolla!.total_qty_needed).toBeCloseTo(0.44, 2);

    const aceite = result.find((d) => d.product_id === "p-aceite");
    expect(aceite!.total_qty_needed).toBeCloseTo(0.1, 2);

    const arroz = result.find((d) => d.product_id === "p-arroz");
    expect(arroz!.total_qty_needed).toBeCloseTo(0.3, 2);

    // No sub-recipe should appear as a raw demand product
    const sofrito = result.find((d) => d.product_name === "Sofrito");
    expect(sofrito).toBeUndefined();
  });

  it("returns empty demand when no events and no forecasts", () => {
    const result = calculateDemand([], [], makeRecipes(), products);
    expect(result).toEqual([]);
  });

  it("returns empty demand when event has no menu", () => {
    const events: EventWithMenu[] = [
      { event_id: "ev-empty", name: "Sin Menu", date: "2026-04-01", pax: 50 },
    ];

    const result = calculateDemand(events, [], makeRecipes(), products);
    expect(result).toEqual([]);
  });

  it("returns empty demand when event menu has no items", () => {
    const events: EventWithMenu[] = [
      {
        event_id: "ev-empty-menu", name: "Menu Vacio", date: "2026-04-01", pax: 50,
        menu: { items: [] },
      },
    ];

    const result = calculateDemand(events, [], makeRecipes(), products);
    expect(result).toEqual([]);
  });

  it("skips recipes not found in the recipe map", () => {
    const events: EventWithMenu[] = [
      {
        event_id: "ev1", name: "Test", date: "2026-04-01", pax: 10,
        menu: { items: [{ recipe_id: "r-nonexistent" }] },
      },
    ];

    const result = calculateDemand(events, [], makeRecipes(), products);
    expect(result).toEqual([]);
  });

  it("applies waste_percent from ingredient definition", () => {
    const recipes: RecipeMap = {
      "r-gambas": {
        id: "r-gambas",
        name: "Gambas",
        servings: 1,
        ingredients: [
          {
            id: "ri-g", product_id: "p-gambas", product_name: "Gambas",
            sub_recipe_id: null, quantity: 1, unit: unitKg, unit_id: "u-kg",
            waste_percent: 0.2,
          },
        ],
      },
    };

    const events: EventWithMenu[] = [
      {
        event_id: "ev1", name: "Test", date: "2026-04-01", pax: 1,
        menu: { items: [{ recipe_id: "r-gambas" }] },
      },
    ];

    const result = calculateDemand(events, [], recipes, products);

    // 1 * 1 * (1 + 0.2) = 1.2
    const gambas = result.find((d) => d.product_id === "p-gambas");
    expect(gambas!.total_qty_needed).toBeCloseTo(1.2, 2);
  });

  it("includes breakdown source labels per event", () => {
    const recipes = makeRecipes();
    const events: EventWithMenu[] = [
      {
        event_id: "ev1", name: "Fiesta", date: "2026-04-01", pax: 4,
        menu: { items: [{ recipe_id: "r-paella" }] },
      },
    ];

    const result = calculateDemand(events, [], recipes, products);
    const arroz = result.find((d) => d.product_id === "p-arroz");
    expect(arroz!.breakdown[0]!.source).toContain("Fiesta");
    expect(arroz!.breakdown[0]!.source).toContain("4 pax");
  });

  it("handles circular sub-recipe references without infinite loop", () => {
    const recipes: RecipeMap = {
      "r-a": {
        id: "r-a", name: "Recipe A", servings: 1,
        ingredients: [
          {
            id: "ri-1", product_id: null, product_name: "Sub B",
            sub_recipe_id: "r-b", quantity: 1, unit: unitUd, unit_id: "u-ud",
            waste_percent: 0,
          },
        ],
      },
      "r-b": {
        id: "r-b", name: "Recipe B", servings: 1,
        ingredients: [
          {
            id: "ri-2", product_id: null, product_name: "Sub A",
            sub_recipe_id: "r-a", quantity: 1, unit: unitUd, unit_id: "u-ud",
            waste_percent: 0,
          },
          {
            id: "ri-3", product_id: "p-sal", product_name: "Sal",
            sub_recipe_id: null, quantity: 0.01, unit: unitKg, unit_id: "u-kg",
            waste_percent: 0,
          },
        ],
      },
    };

    const events: EventWithMenu[] = [
      {
        event_id: "ev1", name: "Test", date: "2026-04-01", pax: 1,
        menu: { items: [{ recipe_id: "r-a" }] },
      },
    ];

    // Should not throw or loop infinitely
    const result = calculateDemand(events, [], recipes, products);
    // Sal should appear once from r-b
    const sal = result.find((d) => d.product_id === "p-sal");
    expect(sal).toBeDefined();
    expect(sal!.total_qty_needed).toBeCloseTo(0.01, 2);
  });
});
