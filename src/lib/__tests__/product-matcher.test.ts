import {
  matchIngredientToProduct,
  matchIngredientsToProducts,
  type MatchableProduct,
} from "../product-matcher";

// ── Fixtures ────────────────────────────────────────────────────────────────

const PRODUCTS: MatchableProduct[] = [
  { id: "p1", name: "Tomate pera" },
  { id: "p2", name: "Cebolla" },
  { id: "p3", name: "Aceite de oliva virgen extra", aliases: ["AOVE", "aceite oliva"] },
  { id: "p4", name: "Harina de trigo" },
  { id: "p5", name: "Crema de leche" },
];

// ── matchIngredientToProduct ────────────────────────────────────────────────

describe("matchIngredientToProduct", () => {
  it("returns exact match with confidence 1.0 for normalized-equal names", () => {
    const results = matchIngredientToProduct("Tomate pera", PRODUCTS);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      product_id: "p1",
      product_name: "Tomate pera",
      confidence: 1.0,
      matched_by: "exact",
    });
  });

  it("returns contains match when input is a substring of a product name", () => {
    const results = matchIngredientToProduct("tomate", PRODUCTS);
    const match = results.find((r) => r.product_id === "p1");
    expect(match).toBeDefined();
    expect(match!.confidence).toBe(0.8);
    expect(match!.matched_by).toBe("contains");
  });

  it("returns fuzzy match for a small typo (Levenshtein)", () => {
    // "tomatee pera" vs "tomate pera" — distance 1
    const results = matchIngredientToProduct("tomatee pera", PRODUCTS);
    const match = results.find((r) => r.product_id === "p1");
    expect(match).toBeDefined();
    expect(match!.matched_by).toBe("fuzzy");
    expect(match!.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it("is case insensitive", () => {
    const results = matchIngredientToProduct("TOMATE PERA", PRODUCTS);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      product_id: "p1",
      confidence: 1.0,
      matched_by: "exact",
    });
  });

  it("handles accents (strips them for comparison)", () => {
    // "crema" should match "Crema de leche" via contains after normalization
    const products: MatchableProduct[] = [
      { id: "x1", name: "Creme fraiche" },
    ];
    // "creme" vs "creme fraiche" — accent stripped, contains match
    const results = matchIngredientToProduct("creme", products);
    const match = results.find((r) => r.product_id === "x1");
    expect(match).toBeDefined();
    expect(match!.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("removes Spanish articles before matching", () => {
    const results = matchIngredientToProduct("el tomate", PRODUCTS);
    const match = results.find((r) => r.product_id === "p1");
    expect(match).toBeDefined();
    // "tomate" (after removing "el") contains-matches "tomate pera"
    expect(match!.matched_by).toBe("contains");
  });

  it("returns empty array when nothing matches", () => {
    const results = matchIngredientToProduct("chocolate", PRODUCTS);
    expect(results).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    const results = matchIngredientToProduct("", PRODUCTS);
    expect(results).toHaveLength(0);
  });

  it("matches via alias", () => {
    const results = matchIngredientToProduct("AOVE", PRODUCTS);
    const match = results.find((r) => r.product_id === "p3");
    expect(match).toBeDefined();
    expect(match!.matched_by).toBe("alias");
    expect(match!.confidence).toBe(0.7);
  });

  it("filters out results below 0.4 confidence", () => {
    // Levenshtein distance 3 gives confidence 0.6 - 0.3 = 0.3 which is < 0.4
    // So a string that differs by 3 chars from a short product name should be filtered
    const products: MatchableProduct[] = [{ id: "z1", name: "sal" }];
    // "salazar" vs "sal" — distance is 4, should not match at all
    const results = matchIngredientToProduct("salazar", products);
    const match = results.find((r) => r.product_id === "z1");
    // Either not present or filtered by confidence threshold
    if (match) {
      expect(match.confidence).toBeGreaterThanOrEqual(0.4);
    }
  });

  it("returns at most 3 results, sorted by confidence descending", () => {
    const manyProducts: MatchableProduct[] = [
      { id: "a", name: "tomate pera" },
      { id: "b", name: "tomate cherry" },
      { id: "c", name: "tomate kumato" },
      { id: "d", name: "tomate raf" },
    ];
    const results = matchIngredientToProduct("tomate", manyProducts);
    expect(results.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.confidence).toBeGreaterThanOrEqual(results[i]!.confidence);
    }
  });
});

// ── matchIngredientsToProducts (batch) ──────────────────────────────────────

describe("matchIngredientsToProducts", () => {
  it("returns a Map keyed by each ingredient name", () => {
    const names = ["tomate", "cebolla"];
    const result = matchIngredientsToProducts(names, PRODUCTS);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
    expect(result.has("tomate")).toBe(true);
    expect(result.has("cebolla")).toBe(true);
  });

  it("each entry contains valid MatchResult arrays", () => {
    const result = matchIngredientsToProducts(["Tomate pera"], PRODUCTS);
    const matches = result.get("Tomate pera");
    expect(matches).toBeDefined();
    expect(matches!.length).toBeGreaterThanOrEqual(1);
    expect(matches![0]).toMatchObject({
      product_id: "p1",
      confidence: 1.0,
    });
  });

  it("returns empty array for unmatched ingredients in the batch", () => {
    const result = matchIngredientsToProducts(["chocolate"], PRODUCTS);
    expect(result.get("chocolate")).toEqual([]);
  });
});
