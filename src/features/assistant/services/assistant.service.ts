/**
 * @module assistant.service
 * @description AI Assistant service that processes kitchen management questions
 * in Spanish using the 6 calculation engines with mock data.
 *
 * MOCK MODE — no real API calls. Detects user intent from keywords and
 * delegates to the appropriate engine, formatting results in natural Spanish.
 */

import type { ChatResponse } from "../schemas/assistant.schema";

import {
  calculateRecipeCost,
  calculateDemand,
  generatePurchaseSuggestions,
  analyzeMenu,
  scaleRecipe,
  generateForecast,
} from "@/lib/calculations";

import type {
  RecipeMap,
  ProductMap,
  CatalogMap,
  PricingConfig,
  RecipeIngredientCalc,
  EventWithMenu,
  StockSnapshot,
  RecipeIngredient,
} from "@/lib/calculations";

import type {
  HistoricalConsumption,
  StockLevel,
} from "@/lib/calculations/forecastEngine";

import {
  MOCK_RECIPES,
  MOCK_PRODUCTS,
  MOCK_RECIPE_INGREDIENTS,
  MOCK_SUPPLIER_OFFERS,
  MOCK_VOLUME_DISCOUNTS,
  PROD_TOMATE,
  PROD_CEBOLLA,
  PROD_ACEITE,
  PROD_TERNERA,
  PROD_PATATA,
  PROD_MANTEQUILLA,
  PROD_LECHE,
  PROD_VINO,
  PROD_QUESO,
  PROD_HARINA,
  PROD_POLLO,
  PROD_SALMON,
  PROD_MERLUZA,
  PROD_ARROZ,
} from "@/lib/mock-data";

// ─── Build engine-compatible data structures from mock data ──────────────────

function buildRecipeMap(): RecipeMap {
  const map: RecipeMap = {};
  for (const recipe of MOCK_RECIPES) {
    const ingredients =
      (MOCK_RECIPE_INGREDIENTS as unknown as Record<string, RecipeIngredientCalc[]>)[recipe.id] ?? [];
    map[recipe.id] = {
      id: recipe.id,
      name: recipe.name,
      servings: recipe.servings,
      category: recipe.category,
      ingredients,
    };
  }
  return map;
}

function buildProductMap(): ProductMap {
  const map: ProductMap = {};
  for (const p of MOCK_PRODUCTS) {
    map[p.id] = {
      id: p.id,
      name: p.name,
      yield_percent: p.yield_percent,
      allergens: (p.allergens ?? []) as ProductMap[string]["allergens"],
    };
  }
  return map;
}

function buildCatalogMap(): CatalogMap {
  const map: CatalogMap = {};
  for (const offer of MOCK_SUPPLIER_OFFERS) {
    if (!map[offer.product_id]) map[offer.product_id] = [];
    map[offer.product_id]!.push({
      id: offer.id,
      supplier_id: offer.supplier_id,
      supplier_name: offer.supplier_name,
      product_id: offer.product_id,
      unit_price: offer.price,
      min_order_qty: 1,
      pack_size: 1,
      is_preferred: offer.is_preferred,
      volume_discounts:
        (MOCK_VOLUME_DISCOUNTS as Record<string, { min_qty: number; unit_price: number }[]>)[
          offer.id
        ] ?? [],
    });
  }
  return map;
}

function buildStockMap(): Map<string, StockSnapshot> {
  const stock = new Map<string, StockSnapshot>();
  const defaults: Array<{ id: string; name: string; qty: number; unit: string }> = [
    { id: PROD_TOMATE, name: "Tomate pera", qty: 5, unit: "kg" },
    { id: PROD_CEBOLLA, name: "Cebolla blanca", qty: 3, unit: "kg" },
    { id: PROD_ACEITE, name: "Aceite de oliva", qty: 4, unit: "L" },
    { id: PROD_TERNERA, name: "Solomillo de ternera", qty: 2, unit: "kg" },
    { id: PROD_PATATA, name: "Patata Agria", qty: 8, unit: "kg" },
    { id: PROD_MANTEQUILLA, name: "Mantequilla", qty: 1, unit: "kg" },
    { id: PROD_LECHE, name: "Leche entera", qty: 3, unit: "L" },
    { id: PROD_VINO, name: "Vino tinto", qty: 2, unit: "L" },
    { id: PROD_QUESO, name: "Queso crema", qty: 1.5, unit: "kg" },
    { id: PROD_HARINA, name: "Harina T-55", qty: 5, unit: "kg" },
    { id: PROD_POLLO, name: "Pollo de corral", qty: 4, unit: "kg" },
    { id: PROD_SALMON, name: "Salmon noruego", qty: 2, unit: "kg" },
    { id: PROD_MERLUZA, name: "Merluza", qty: 3, unit: "kg" },
    { id: PROD_ARROZ, name: "Arroz bomba", qty: 5, unit: "kg" },
  ];

  for (const d of defaults) {
    stock.set(d.id, {
      product_id: d.id,
      product_name: d.name,
      unit: { id: "u", name: d.unit, abbreviation: d.unit },
      qty_available: d.qty,
      qty_committed: 0,
      safety_stock: d.qty * 0.2,
    });
  }
  return stock;
}

// Lazy singletons
let _recipeMap: RecipeMap | null = null;
let _productMap: ProductMap | null = null;
let _catalogMap: CatalogMap | null = null;
let _stockMap: Map<string, StockSnapshot> | null = null;

function getRecipeMap() {
  return (_recipeMap ??= buildRecipeMap());
}
function getProductMap() {
  return (_productMap ??= buildProductMap());
}
function getCatalogMap() {
  return (_catalogMap ??= buildCatalogMap());
}
function getStockMap() {
  return (_stockMap ??= buildStockMap());
}

const DEFAULT_PRICING_CONFIG: PricingConfig = {
  target_food_cost_pct: 0.30,
  target_margin_pct: 0.65,
  commercial_rounding: 0.50,
  channel_commissions: { sala: 0, glovo: 0.30, uber_eats: 0.35 },
};

// ─── Intent detection ────────────────────────────────────────────────────────

type Intent =
  | "cost"
  | "demand"
  | "procurement"
  | "margin"
  | "scaling"
  | "forecast"
  | "general";

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();

  if (/coste|escandallo|food\s*cost|precio\s*de\s*coste/.test(lower)) return "cost";
  if (/menu|rentabilidad|boston|estrella|ingenieria\s*de\s*menu|workhorse|puzzle/.test(lower))
    return "margin";
  if (/escalar|porciones|cantidad|personas|comensales|racion/.test(lower)) return "scaling";
  if (/comprar|pedido|proveedor|compra|orden|sugerencia/.test(lower)) return "procurement";
  if (/previsi[oó]n|forecast|tendencia|predicci[oó]n/.test(lower)) return "forecast";
  if (/demanda|evento|producci[oó]n|boda|banquete|catering/.test(lower)) return "demand";

  return "general";
}

// ─── Recipe name resolution ──────────────────────────────────────────────────

function findRecipeByName(message: string): { id: string; name: string } | null {
  const lower = message.toLowerCase();
  for (const r of MOCK_RECIPES) {
    // Match on recipe name keywords (at least the first significant word)
    const words = r.name.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length >= 4 && lower.includes(word)) {
        return { id: r.id, name: r.name };
      }
    }
  }
  return null;
}

function extractTargetServings(message: string): number | null {
  const match = message.match(/(\d+)\s*(personas|porciones|raciones|pax|comensales)/i);
  return match ? parseInt(match[1]!, 10) : null;
}

// ─── Intent handlers ─────────────────────────────────────────────────────────

function handleCost(message: string): ChatResponse {
  const recipe = findRecipeByName(message);
  const recipeMap = getRecipeMap();

  // Default to gazpacho if no recipe found
  const fallback = MOCK_RECIPES[0]!;
  const target = recipe ?? { id: fallback.id, name: fallback.name };

  if (!recipeMap[target.id]?.ingredients?.length) {
    return {
      reply: `No tengo ingredientes detallados para "${target.name}" en el sistema. Solo puedo calcular escandallos para: Gazpacho andaluz, Solomillo al Oporto y Tarta de queso La Vina.`,
      action: "cost_no_ingredients",
    };
  }

  try {
    const result = calculateRecipeCost(
      target.id,
      recipeMap,
      getProductMap(),
      getCatalogMap(),
      DEFAULT_PRICING_CONFIG,
    );

    const lines = result.lines
      .map(
        (l) =>
          `  - ${l.product_name}: ${l.quantity_recipe} ${l.unit.abbreviation} (con merma: ${l.quantity_with_waste.toFixed(2)}) → ${l.line_cost.toFixed(2)} EUR`,
      )
      .join("\n");

    const reply =
      `Escandallo de "${result.recipe_name}" (${result.servings} raciones):\n\n` +
      `${lines}\n\n` +
      `Coste total: ${result.total_cost.toFixed(2)} EUR\n` +
      `Coste por racion: ${result.cost_per_serving.toFixed(2)} EUR\n` +
      `Food cost objetivo: ${(DEFAULT_PRICING_CONFIG.target_food_cost_pct * 100).toFixed(0)}%\n` +
      `PVP sugerido (sala): ${result.suggested_pvp.toFixed(2)} EUR\n` +
      `Margen bruto: ${result.margin_gross.toFixed(2)} EUR` +
      (result.allergens.length
        ? `\nAlergenos: ${result.allergens.join(", ")}`
        : "");

    return { reply, data: result, action: "cost_calculated" };
  } catch (err) {
    return {
      reply: `Error al calcular el escandallo de "${target.name}": ${err instanceof Error ? err.message : "error desconocido"}.`,
    };
  }
}

function handleDemand(): ChatResponse {
  const recipeMap = getRecipeMap();
  const productMap = getProductMap();

  // Build a mock event — "boda" for 120 pax with gazpacho + solomillo + tarta
  const mockEvent: EventWithMenu = {
    event_id: "ev-mock-001",
    name: "Boda Garcia-Lopez",
    date: "2026-04-15",
    pax: 120,
    menu: {
      items: [
        { recipe_id: MOCK_RECIPES[0]!.id, servings_per_pax: 1 }, // Gazpacho
        { recipe_id: MOCK_RECIPES[2]!.id, servings_per_pax: 1 }, // Solomillo
        { recipe_id: MOCK_RECIPES[5]!.id, servings_per_pax: 1 }, // Tarta de queso
      ],
    },
  };

  try {
    const demand = calculateDemand([mockEvent], [], recipeMap, productMap);

    const lines = demand
      .map(
        (d) =>
          `  - ${d.product_name}: ${d.total_qty_needed.toFixed(2)} ${d.unit.abbreviation}`,
      )
      .join("\n");

    const reply =
      `Demanda para "${mockEvent.name}" (${mockEvent.pax} pax):\n\n` +
      `Menu: Gazpacho + Solomillo al Oporto + Tarta de queso\n\n` +
      `Ingredientes necesarios:\n${lines}\n\n` +
      `Total de productos distintos: ${demand.length}`;

    return { reply, data: demand, action: "demand_calculated" };
  } catch (err) {
    return {
      reply: `Error al calcular la demanda: ${err instanceof Error ? err.message : "error desconocido"}.`,
    };
  }
}

function handleProcurement(): ChatResponse {
  const recipeMap = getRecipeMap();
  const productMap = getProductMap();

  // First calculate demand for a mock event
  const mockEvent: EventWithMenu = {
    event_id: "ev-mock-001",
    name: "Boda Garcia-Lopez",
    date: "2026-04-15",
    pax: 120,
    menu: {
      items: [
        { recipe_id: MOCK_RECIPES[0]!.id, servings_per_pax: 1 },
        { recipe_id: MOCK_RECIPES[2]!.id, servings_per_pax: 1 },
        { recipe_id: MOCK_RECIPES[5]!.id, servings_per_pax: 1 },
      ],
    },
  };

  try {
    const demand = calculateDemand([mockEvent], [], recipeMap, productMap);
    const suggestions = generatePurchaseSuggestions(demand, getStockMap(), getCatalogMap());

    if (suggestions.length === 0) {
      return {
        reply: "Buenas noticias: con el stock actual no hace falta realizar ninguna compra adicional para este evento.",
        data: [],
        action: "procurement_ok",
      };
    }

    const lines = suggestions
      .map(
        (s) =>
          `  ${s.urgency === "critical" ? "🔴" : s.urgency === "urgent" ? "🟡" : "🟢"} ${s.product_name}: pedir ${s.qty_to_order.toFixed(1)} ${s.unit.abbreviation} a ${s.suggested_supplier_name} (~${s.estimated_cost.toFixed(2)} EUR)`,
      )
      .join("\n");

    const totalCost = suggestions.reduce((s, x) => s + x.estimated_cost, 0);

    const reply =
      `Sugerencias de compra para la Boda (120 pax):\n\n` +
      `${lines}\n\n` +
      `Coste estimado total: ${totalCost.toFixed(2)} EUR\n` +
      `Pedidos sugeridos: ${suggestions.length}`;

    return { reply, data: suggestions, action: "procurement_calculated" };
  } catch (err) {
    return {
      reply: `Error al generar sugerencias de compra: ${err instanceof Error ? err.message : "error desconocido"}.`,
    };
  }
}

function handleMargin(): ChatResponse {
  // Simulate menu engineering with realistic sales data
  const dishes = [
    { recipe_id: MOCK_RECIPES[0]!.id, recipe_name: "Gazpacho andaluz", units_sold: 180, revenue: 1440, cost_per_unit: 1.85, pvp: 8.00 },
    { recipe_id: MOCK_RECIPES[1]!.id, recipe_name: "Croquetas de jamon", units_sold: 220, revenue: 2420, cost_per_unit: 2.10, pvp: 11.00 },
    { recipe_id: MOCK_RECIPES[2]!.id, recipe_name: "Solomillo al Oporto", units_sold: 90, revenue: 2700, cost_per_unit: 16.00, pvp: 30.00 },
    { recipe_id: MOCK_RECIPES[4]!.id, recipe_name: "Merluza en salsa verde", units_sold: 110, revenue: 2090, cost_per_unit: 9.00, pvp: 19.00 },
    { recipe_id: MOCK_RECIPES[5]!.id, recipe_name: "Tarta de queso La Vina", units_sold: 200, revenue: 1800, cost_per_unit: 2.20, pvp: 9.00 },
    { recipe_id: MOCK_RECIPES[7]!.id, recipe_name: "Coulant de chocolate", units_sold: 75, revenue: 825, cost_per_unit: 3.10, pvp: 11.00 },
  ];

  try {
    const results = analyzeMenu(dishes);

    const categoryEmoji: Record<string, string> = {
      star: "⭐ Estrella",
      workhorse: "🐴 Caballo de batalla",
      puzzle: "🧩 Puzzle",
      dog: "🐕 Perro",
    };

    const lines = results
      .map(
        (r) =>
          `  ${categoryEmoji[r.category] ?? r.category} | ${r.recipe_name}\n` +
          `    Ventas: ${r.units_sold} uds | Food cost: ${(r.food_cost_pct * 100).toFixed(1)}% | Margen: ${r.margin_per_unit.toFixed(2)} EUR/ud\n` +
          `    → ${r.recommendation}`,
      )
      .join("\n\n");

    const stars = results.filter((r) => r.category === "star").length;
    const dogs = results.filter((r) => r.category === "dog").length;

    const reply =
      `Analisis de ingenieria de menu (Matriz Boston):\n\n` +
      `${lines}\n\n` +
      `Resumen: ${stars} estrellas, ${results.filter((r) => r.category === "workhorse").length} caballos de batalla, ` +
      `${results.filter((r) => r.category === "puzzle").length} puzzles, ${dogs} perros.\n` +
      (dogs > 0
        ? `Atencion: hay ${dogs} plato(s) clasificado(s) como "perro". Considera retirarlos o reformularlos.`
        : "Todos los platos tienen buen rendimiento.");

    return { reply, data: results, action: "menu_analyzed" };
  } catch (err) {
    return {
      reply: `Error al analizar el menu: ${err instanceof Error ? err.message : "error desconocido"}.`,
    };
  }
}

function handleScaling(message: string): ChatResponse {
  const recipe = findRecipeByName(message);
  const targetServings = extractTargetServings(message) ?? 100;

  // Default to solomillo if no recipe found
  const recipeData = recipe
    ? MOCK_RECIPES.find((r) => r.id === recipe.id)
    : MOCK_RECIPES[2]!; // Solomillo

  if (!recipeData) {
    return { reply: "No he encontrado esa receta en el sistema." };
  }

  const ingredients =
    (MOCK_RECIPE_INGREDIENTS as unknown as Record<string, RecipeIngredient[]>)[recipeData.id];

  if (!ingredients) {
    return {
      reply: `No tengo ingredientes detallados para "${recipeData.name}". Solo puedo escalar: Gazpacho andaluz, Solomillo al Oporto y Tarta de queso La Vina.`,
    };
  }

  try {
    const result = scaleRecipe(
      recipeData.servings,
      targetServings,
      ingredients,
      getCatalogMap(),
    );

    const lines = result.lines
      .map(
        (l) =>
          `  - ${l.product_name}: ${l.original_qty} → ${l.scaled_qty.toFixed(2)} ${l.unit.abbreviation} (con merma: ${l.scaled_qty_with_waste.toFixed(2)}) → ${l.line_cost.toFixed(2)} EUR`,
      )
      .join("\n");

    const reply =
      `Receta escalada: "${recipeData.name}"\n` +
      `De ${result.original_servings} a ${result.target_servings} raciones (factor x${result.scale_factor.toFixed(2)}):\n\n` +
      `${lines}\n\n` +
      `Coste total escalado: ${result.total_cost.toFixed(2)} EUR\n` +
      `Coste por racion: ${result.cost_per_serving.toFixed(2)} EUR`;

    return { reply, data: result, action: "recipe_scaled" };
  } catch (err) {
    return {
      reply: `Error al escalar la receta: ${err instanceof Error ? err.message : "error desconocido"}.`,
    };
  }
}

function handleForecast(): ChatResponse {
  // Build mock historical consumption (last 4 weeks)
  const history: HistoricalConsumption[] = [];
  const products = [
    { id: PROD_TOMATE, name: "Tomate pera", unit: "kg", base: 8 },
    { id: PROD_POLLO, name: "Pollo de corral", unit: "kg", base: 5 },
    { id: PROD_LECHE, name: "Leche entera", unit: "L", base: 6 },
    { id: PROD_ACEITE, name: "Aceite de oliva", unit: "L", base: 3 },
    { id: PROD_ARROZ, name: "Arroz bomba", unit: "kg", base: 4 },
  ];

  const now = new Date();
  for (let d = 28; d >= 1; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split("T")[0]!;
    const dow = date.getDay();
    // Weekend = higher demand
    const weekendFactor = dow === 0 || dow === 6 ? 1.4 : 1.0;

    for (const p of products) {
      const variation = 0.8 + Math.random() * 0.4; // 0.8–1.2 random variation
      history.push({
        product_id: p.id,
        product_name: p.name,
        date: dateStr,
        quantity: Math.round(p.base * weekendFactor * variation * 10) / 10,
        unit: p.unit,
      });
    }
  }

  // Mock stock levels
  const stock: StockLevel[] = products.map((p) => ({
    product_id: p.id,
    product_name: p.name,
    current_stock: p.base * 2,
    unit: p.unit,
    safety_stock: p.base * 0.5,
  }));

  try {
    const { summary } = generateForecast(history, [], stock, 7);

    const lines = summary
      .map(
        (s) =>
          `  ${s.urgency === "critical" ? "🔴" : s.urgency === "warning" ? "🟡" : "🟢"} ${s.product_name}: demanda prevista ${s.total_forecast_demand.toFixed(1)} ${s.unit} | stock: ${s.current_stock.toFixed(1)} | ` +
          (s.deficit > 0
            ? `deficit: ${s.deficit.toFixed(1)} → pedir ${s.suggested_order_qty.toFixed(1)} ${s.unit}`
            : "stock suficiente"),
      )
      .join("\n");

    const criticals = summary.filter((s) => s.urgency === "critical").length;
    const warnings = summary.filter((s) => s.urgency === "warning").length;

    const reply =
      `Prevision de demanda para los proximos 7 dias:\n\n` +
      `${lines}\n\n` +
      `Resumen: ${criticals} productos criticos, ${warnings} en alerta, ${summary.length - criticals - warnings} OK.` +
      (criticals > 0
        ? `\nAccion recomendada: realizar pedido urgente de los productos criticos.`
        : "");

    return { reply, data: summary, action: "forecast_generated" };
  } catch (err) {
    return {
      reply: `Error al generar la prevision: ${err instanceof Error ? err.message : "error desconocido"}.`,
    };
  }
}

function handleGeneral(message: string): ChatResponse {
  const lower = message.toLowerCase();

  // Try to provide helpful guidance
  if (/hola|buenos|buenas|hey/.test(lower)) {
    return {
      reply:
        "Hola! Soy el asistente de cocina de RestoOS. Puedo ayudarte con:\n\n" +
        "  - **Escandallos**: \"Cual es el coste del gazpacho?\"\n" +
        "  - **Demanda**: \"Que necesito para la boda de 120 personas?\"\n" +
        "  - **Compras**: \"Que tengo que comprar para el evento?\"\n" +
        "  - **Menu engineering**: \"Analiza la rentabilidad del menu\"\n" +
        "  - **Escalado**: \"Escala el solomillo para 50 personas\"\n" +
        "  - **Previsiones**: \"Dame la prevision de demanda semanal\"\n\n" +
        "Preguntame lo que necesites!",
      action: "greeting",
    };
  }

  if (/ayuda|help|que puedes|que sabes/.test(lower)) {
    return {
      reply:
        "Estas son mis capacidades:\n\n" +
        "1. **Escandallos** — calculo el coste de cualquier receta con desglose por ingrediente, merma y PVP sugerido.\n" +
        "2. **Demanda** — exploto el menu de un evento en ingredientes y cantidades necesarias.\n" +
        "3. **Compras** — comparo demanda vs stock y sugiero pedidos a proveedores con MOQ y precios.\n" +
        "4. **Ingenieria de menu** — clasifico tus platos en la Matriz Boston (estrellas, puzzles, etc.).\n" +
        "5. **Escalado** — escalo recetas a cualquier numero de raciones con costes actualizados.\n" +
        "6. **Previsiones** — predigo demanda para los proximos dias basandome en historico y estacionalidad.\n\n" +
        "Escribe tu pregunta en espanol y la resolvere con datos reales del sistema.",
      action: "help",
    };
  }

  if (/receta|plato/.test(lower)) {
    const recipeList = MOCK_RECIPES.map(
      (r) => `  - ${r.name} (${r.category}, ${r.servings} raciones)`,
    ).join("\n");
    return {
      reply: `Recetas disponibles en el sistema:\n\n${recipeList}\n\nPreguntame sobre el coste, escalado o demanda de cualquiera de ellas.`,
      action: "recipe_list",
    };
  }

  return {
    reply:
      "No he entendido bien tu pregunta. Prueba con algo como:\n" +
      "  - \"Cual es el coste del gazpacho?\"\n" +
      "  - \"Escala el solomillo para 80 personas\"\n" +
      "  - \"Analiza el menu\"\n" +
      "  - \"Que necesito comprar para el evento?\"\n" +
      "  - \"Dame la prevision semanal\"",
    action: "unknown_intent",
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Processes a user message in Spanish, detects intent, and delegates to
 * the appropriate calculation engine. Returns a formatted response.
 *
 * @param message - The user's question in natural language (Spanish)
 * @returns ChatResponse with reply text, optional structured data, and action tag
 */
export async function processMessage(message: string): Promise<ChatResponse> {
  // Simulate processing delay for realism (500–1000ms)
  await new Promise((resolve) =>
    setTimeout(resolve, 500 + Math.random() * 500),
  );

  const intent = detectIntent(message);

  switch (intent) {
    case "cost":
      return handleCost(message);
    case "demand":
      return handleDemand();
    case "procurement":
      return handleProcurement();
    case "margin":
      return handleMargin();
    case "scaling":
      return handleScaling(message);
    case "forecast":
      return handleForecast();
    default:
      return handleGeneral(message);
  }
}
