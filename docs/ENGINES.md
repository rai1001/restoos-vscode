# Calculation Engines — API Reference

6 pure-function engines in `src/lib/calculations/`. No side effects, no DB, no AI.

---

## costEngine

### `calculateRecipeCost(recipeId, recipes, products, catalog, pricingConfig, visited?)`

Calculates the full cost of a recipe, including recursive sub-recipes, yield-based waste, and allergen aggregation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `recipeId` | `string` | ID of the recipe to calculate |
| `recipes` | `RecipeMap` | Map of all recipes (for sub-recipe resolution) |
| `products` | `ProductMap` | Map of products with yield_percent and allergens |
| `catalog` | `CatalogMap` | Supplier offers by product_id |
| `pricingConfig` | `PricingConfig` | target_food_cost_pct, commercial_rounding |
| `visited` | `Set<string>` | (internal) Circular dependency detection |

**Returns:** `RecipeCostResult`

```typescript
{
  recipe_id: string;
  recipe_name: string;
  total_cost: number;          // Total recipe cost
  servings: number;
  cost_per_serving: number;    // total_cost / servings
  food_cost_pct: number;       // cost_per_serving / suggested_pvp
  suggested_pvp: number;       // Recommended selling price
  margin_gross: number;        // pvp - cost_per_serving
  allergens: AllergenCode[];   // Detected allergens
  lines: IngredientCostLine[]; // Per-ingredient breakdown
}
```

**Exceptions:**
- Throws if a circular sub-recipe dependency is detected.
- Throws if `recipeId` is not found in the recipe map.

**Example:**
```typescript
const result = calculateRecipeCost(
  "recipe-gazpacho",
  recipeMap,
  productMap,
  catalogMap,
  { target_food_cost_pct: 0.30, target_margin_pct: 0.65, commercial_rounding: 0.50, channel_commissions: { sala: 0 } }
);
console.log(result.cost_per_serving); // 0.66
console.log(result.suggested_pvp);   // 2.50
```

---

### `calculateSuggestedPvp(costPerServing, targetFoodCostPct, commercialRounding)`

Recommended selling price based on food cost target with commercial rounding.

| Parameter | Type | Description |
|-----------|------|-------------|
| `costPerServing` | `number` | Cost per serving |
| `targetFoodCostPct` | `number` | Food cost target (0-1, e.g. 0.30) |
| `commercialRounding` | `number` | Rounding increment (e.g. 0.50) |

**Returns:** `number` — PVP rounded up to increment. Returns 0 if target is invalid.

**Example:** `calculateSuggestedPvp(3.10, 0.30, 0.50)` → `10.50`

---

### `collectAllergens(costResult)`

Extracts unique allergens from a recipe cost result. Useful for allergen declarations on menus and PDFs.

| Parameter | Type | Description |
|-----------|------|-------------|
| `costResult` | `RecipeCostResult` | Calculated recipe cost with aggregated allergen data |

**Returns:** `AllergenCode[]` — Deduplicated sorted array.

---

## demandEngine

### `calculateDemand(events, forecasts, recipes, products)`

Explodes event menus into ingredient-level demand lines.

| Parameter | Type | Description |
|-----------|------|-------------|
| `events` | `EventWithMenu[]` | Events with assigned menus |
| `forecasts` | `ForecastDay[]` | Forecast days (optional) |
| `recipes` | `RecipeMap` | Recipe map with ingredients |
| `products` | `ProductMap` | Product map with yield |

**Returns:** `DemandLine[]`

```typescript
{
  product_id: string;
  product_name: string;
  unit: MeasurementUnit;
  total_qty_needed: number;    // Total quantity needed
  breakdown: {                 // Breakdown by source
    source: string;            // "Boda Rodriguez (150 pax)"
    qty: number;
  }[];
}
```

---

## procurementEngine

### `generatePurchaseSuggestions(demand, stock, catalog)`

Generates purchase suggestions by comparing demand against stock, adjusting to MOQ and pack sizes.

| Parameter | Type | Description |
|-----------|------|-------------|
| `demand` | `DemandLine[]` | Ingredient demand |
| `stock` | `StockSnapshot[]` | Current stock per product |
| `catalog` | `CatalogMap` | Offers with MOQ, packs, discounts |

**Returns:** `PurchaseSuggestion[]`

```typescript
{
  product_id: string;
  qty_needed: number;              // Shortfall
  qty_to_order: number;            // Adjusted to MOQ/packs
  suggested_supplier_id: string;
  suggested_supplier_name: string;
  estimated_cost: number;
  urgency: "normal" | "urgent" | "critical";
}
```

**Urgency logic:**
- `critical`: available stock <= committed, or free stock = 0
- `urgent`: free stock < safety stock
- `normal`: everything else

---

### `adjustToMoqAndPacks(rawQty, moq, packSize)`

Adjusts quantity to MOQ and pack size.

**Example:** `adjustToMoqAndPacks(7, 0, 5)` → `10` (2 packs of 5)

---

## marginEngine

### `calculatePricingByChannel(costPerServing, config)`

Recommended PVP per sales channel, adjusted for platform commissions.

| Parameter | Type | Description |
|-----------|------|-------------|
| `costPerServing` | `number` | Cost per serving |
| `config` | `PricingConfig` | Targets + commissions per channel |

**Returns:** `PricingRecommendation[]`

```typescript
{
  channel: string;               // "sala", "delivery_glovo", etc
  pvp_by_food_cost: number;      // PVP by food cost target
  pvp_by_margin: number;         // PVP by margin target
  pvp_recommended: number;       // max(both), rounded
  effective_margin_pct: number;  // Effective margin after commission
}
```

---

### `classifyDish(unitsSold, avgUnits, marginPerUnit, avgMargin)`

Classifies a dish in the Boston matrix.

**Returns:** `"star" | "workhorse" | "puzzle" | "dog"`

---

### `analyzeMenu(dishes)`

Full menu engineering analysis over a dish array.

**Returns:** `MenuEngineeringItem[]` with category, food_cost_pct, recommendation.

---

### `calculatePriceImpact(recipes, ingredientId, oldPrice, newPrice, target)`

Calculates margin impact when an ingredient price changes.

**Returns:** `{ ingredient_id, price_change_pct, affected_recipes[] }`

---

## scalingEngine

### `scaleRecipe(originalServings, targetServings, ingredients, catalog)`

Scales a recipe from N to M servings.

| Parameter | Type | Description |
|-----------|------|-------------|
| `originalServings` | `number` | Original servings |
| `targetServings` | `number` | Target servings |
| `ingredients` | `RecipeIngredient[]` | Ingredients with original quantities |
| `catalog` | `CatalogMap` | For price lookup |

**Returns:** `ScaledRecipe`

```typescript
{
  scale_factor: number;             // targetServings / originalServings
  lines: ScaledIngredientLine[];    // Scaled quantities + cost
  total_cost: number;
  cost_per_serving: number;
}
```

**Exceptions:** Throws if `originalServings <= 0`.

---

### `generateShoppingList(scaled, catalog, ingredients)`

Shopping list from a scaled recipe, adjusted to MOQ and packs.

**Returns:** `ShoppingListItem[]` with qty_needed, qty_to_order, packs, supplier, estimated_cost.

---

## forecastEngine

### `generateForecast(history, futureEvents, stock, days?, startDate?)`

Demand forecast for N days combining historical data, seasonality, and events.

| Parameter | Type | Description |
|-----------|------|-------------|
| `history` | `HistoricalConsumption[]` | Historical consumption (90 days recommended) |
| `futureEvents` | `FutureEventDemand[]` | Confirmed events with demand |
| `stock` | `StockLevel[]` | Current stock + safety stock |
| `days` | `number` | Days to forecast (default 14) |
| `startDate` | `Date` | Start date (default today) |

**Returns:** `{ daily: DailyForecast[], summary: ForecastSummary[] }`

**Seasonal factors** (by month):
- Jan: 0.80, Feb: 0.85, Mar: 0.95, Apr: 1.00, May: 1.05
- Jun: 1.15, Jul: 1.20, Aug: 1.20, Sep: 1.10, Oct: 1.05
- Nov: 0.95, Dec: 1.10

**Logic:**
- `base_demand` = historical average for that day of week
- `total_demand` = base_demand * seasonal_factor + event_demand
- `deficit` = total_demand - current_stock (if > 0)
- `urgency`: critical (deficit > 50% demand), warning (deficit > 0), ok
