/**
 * @module calculations
 * @description Barrel export for all deterministic calculation engines.
 *
 * Import from here instead of individual files:
 * ```ts
 * import { calculateRecipeCost, calculateDemand, generatePurchaseSuggestions } from "@/lib/calculations";
 * ```
 */

export {
  calculateRecipeCost,
  calculateSuggestedPvp,
  collectAllergens,
} from "./costEngine";

export {
  calculateDemand,
} from "./demandEngine";

export {
  generatePurchaseSuggestions,
  adjustToMoqAndPacks,
} from "./procurementEngine";

export {
  calculatePricingByChannel,
  classifyDish,
  analyzeMenu,
  calculatePriceImpact,
} from "./marginEngine";

export {
  scaleRecipe,
  generateShoppingList,
} from "./scalingEngine";

export {
  generateForecast,
} from "./forecastEngine";

export type {
  MeasurementUnit,
  AllergenCode,
  RecipeIngredientCalc,
  RecipeCalc,
  RecipeMap,
  ProductCalc,
  ProductMap,
  VolumeDiscount,
  CatalogEntry,
  CatalogMap,
  PricingConfig,
  PricingRecommendation,
  PricingChannel,
  MenuCategory,
  MenuEngineeringItem,
  RecipeIngredient,
  ScaledIngredientLine,
  ScaledRecipe,
  IngredientCostLine,
  RecipeCostResult,
  EventWithMenu,
  ForecastDay,
  DemandLine,
  StockSnapshot,
  PurchaseSuggestion,
} from "./types";

export type {
  ShoppingListItem,
} from "./scalingEngine";

export type {
  HistoricalConsumption,
  FutureEventDemand,
  StockLevel,
  DailyForecast,
  ProductForecast,
  ForecastSummary,
} from "./forecastEngine";
