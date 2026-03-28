import { parseRecipeVoice, parseIngredientVoice } from "../voice-parser";

// ── parseRecipeVoice ────────────────────────────────────────────────────────

describe("parseRecipeVoice", () => {
  it("parses name, category, and servings from a full transcript", () => {
    const result = parseRecipeVoice("Risotto de setas, principal, 4 raciones");
    expect(result.name).toBe("Risotto de setas");
    expect(result.category).toBe("principal");
    expect(result.servings).toBe(4);
  });

  it("parses prep_time_min when present", () => {
    const result = parseRecipeVoice(
      "Tarta de queso, postre, 10 raciones, 30 minutos preparacion"
    );
    expect(result.name).toBe("Tarta de queso");
    expect(result.category).toBe("postre");
    expect(result.servings).toBe(10);
    expect(result.prep_time_min).toBe(30);
  });

  it("parses cook_time_min when present", () => {
    const result = parseRecipeVoice(
      "Pollo al horno, principal, 4 personas, 45 minutos cocción"
    );
    expect(result.cook_time_min).toBe(45);
  });

  it("returns only detected fields for partial input", () => {
    const result = parseRecipeVoice("Ensalada verde");
    expect(result.name).toBeDefined();
    expect(result.category).toBeUndefined();
    expect(result.servings).toBeUndefined();
    expect(result.prep_time_min).toBeUndefined();
    expect(result.cook_time_min).toBeUndefined();
  });

  it("maps category aliases correctly", () => {
    const entrante = parseRecipeVoice("Gazpacho, aperitivo, 6 raciones");
    expect(entrante.category).toBe("entrante");

    const dulce = parseRecipeVoice("Flan, dulce, 8 raciones");
    expect(dulce.category).toBe("postre");
  });

  it("handles servings with 'personas' keyword", () => {
    const result = parseRecipeVoice("Paella, principal, 8 personas");
    expect(result.servings).toBe(8);
  });

  it("returns an object (never undefined) even for empty input", () => {
    const result = parseRecipeVoice("");
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });
});

// ── parseIngredientVoice ────────────────────────────────────────────────────

describe("parseIngredientVoice", () => {
  it("parses '300 gramos de harina' correctly", () => {
    const result = parseIngredientVoice("300 gramos de harina");
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      name: "harina",
      quantity: 300,
      unit: "g",
    });
  });

  it("parses 'medio kilo de tomate' as 0.5 kg", () => {
    const result = parseIngredientVoice("medio kilo de tomate");
    expect(result).not.toBeNull();
    expect(result!.quantity).toBe(0.5);
    expect(result!.unit).toBe("kg");
    expect(result!.name).toBe("tomate");
  });

  it("parses '2 litros de leche' correctly", () => {
    const result = parseIngredientVoice("2 litros de leche");
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      name: "leche",
      quantity: 2,
      unit: "L",
    });
  });

  it("parses written numbers (e.g., 'tres' -> 3)", () => {
    const result = parseIngredientVoice("tres kilos de patatas");
    expect(result).not.toBeNull();
    expect(result!.quantity).toBe(3);
    expect(result!.unit).toBe("kg");
    expect(result!.name).toBe("patatas");
  });

  it("parses decimal quantities with comma separator", () => {
    const result = parseIngredientVoice("1,5 litros de caldo");
    expect(result).not.toBeNull();
    expect(result!.quantity).toBe(1.5);
    expect(result!.unit).toBe("L");
  });

  it("normalizes unit aliases (cucharadas -> cda)", () => {
    const result = parseIngredientVoice("2 cucharadas de azucar");
    expect(result).not.toBeNull();
    expect(result!.unit).toBe("cda");
  });

  it("returns null for unrecognized input without quantity/unit pattern", () => {
    const result = parseIngredientVoice("agrega un poco de sal al gusto");
    expect(result).toBeNull();
  });

  it("returns null for empty input", () => {
    const result = parseIngredientVoice("");
    expect(result).toBeNull();
  });
});
