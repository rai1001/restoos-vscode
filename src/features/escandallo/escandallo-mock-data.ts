// TODO: Replace with Supabase queries once escandallo tables are migrated
import type { EscandalloRecipe, EscandalloIngredient, CostEvolutionPoint } from "./types"

function makeHistory(basePrice: number, months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (months - 1 - i))
    const variation = basePrice * (0.85 + Math.random() * 0.30)
    return {
      date: d.toISOString().slice(0, 10),
      unit_price: Math.round(variation * 100) / 100,
      supplier: (["Makro", "Sysco España", "Campofrío Distribución", "Frutas García"][i % 4]) as string,
      invoice_ref: `ALB-2025-${1000 + i * 37}`,
    }
  })
}

function buildIngredient(
  id: string,
  name: string,
  unit: string,
  quantity: number,
  yieldPct: number,
  currentPrice: number,
  previousPrice: number,
): EscandalloIngredient {
  const net = quantity / (yieldPct / 100)
  const lineCost = net * currentPrice
  const changePct = previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0
  return {
    id,
    ingredient_id: id,
    ingredient_name: name,
    unit,
    quantity,
    yield_pct: yieldPct,
    current_unit_price: currentPrice,
    previous_unit_price: previousPrice,
    price_history: makeHistory(currentPrice),
    net_quantity: Math.round(net * 1000) / 1000,
    line_cost: Math.round(lineCost * 100) / 100,
    price_change_pct: Math.round(changePct * 10) / 10,
  }
}

function buildRecipe(
  id: string,
  name: string,
  category: string,
  portions: number,
  sellingPrice: number,
  targetFoodCostPct: number,
  ingredients: EscandalloIngredient[],
): EscandalloRecipe {
  const totalCost = ingredients.reduce((a, i) => a + i.line_cost, 0)
  const costPerPortion = totalCost / portions
  const foodCostPct = (costPerPortion / sellingPrice) * 100
  const suggestedPrice = costPerPortion / (targetFoodCostPct / 100)
  const hasAlert = ingredients.some(i => Math.abs(i.price_change_pct) > 5)
  return {
    id,
    hotel_id: "h1",
    name,
    category,
    portions,
    selling_price: sellingPrice,
    target_food_cost_pct: targetFoodCostPct,
    ingredients,
    last_calculated: new Date().toISOString(),
    total_cost: Math.round(totalCost * 100) / 100,
    cost_per_portion: Math.round(costPerPortion * 100) / 100,
    food_cost_pct: Math.round(foodCostPct * 10) / 10,
    suggested_price: Math.round(suggestedPrice * 100) / 100,
    has_price_alert: hasAlert,
  }
}

export const MOCK_ESCANDALLOS: EscandalloRecipe[] = [
  buildRecipe("r1", "Solomillo de ternera con salsa de trufas", "Principales", 4, 38, 30, [
    buildIngredient("i1", "Solomillo de ternera", "kg", 0.8, 85, 28.50, 24.00),
    buildIngredient("i2", "Trufa negra rallada", "g", 15, 100, 0.45, 0.42),
    buildIngredient("i3", "Nata para cocinar", "L", 0.2, 100, 1.80, 1.80),
    buildIngredient("i4", "Chalota", "kg", 0.1, 90, 3.20, 3.00),
    buildIngredient("i5", "Vino tinto Rioja", "L", 0.15, 100, 4.50, 4.50),
    buildIngredient("i6", "Mantequilla", "kg", 0.05, 100, 8.20, 7.90),
    buildIngredient("i7", "Patata para guarnición", "kg", 0.6, 88, 1.20, 1.10),
  ]),

  buildRecipe("r2", "Paella valenciana (2 personas)", "Principales", 2, 52, 28, [
    buildIngredient("i8", "Arroz bomba", "kg", 0.3, 100, 3.80, 3.60),
    buildIngredient("i9", "Pollo troceado", "kg", 0.4, 80, 5.20, 5.20),
    buildIngredient("i10", "Conejo troceado", "kg", 0.3, 78, 6.80, 6.50),
    buildIngredient("i11", "Judía verde plana", "kg", 0.15, 92, 2.40, 2.40),
    buildIngredient("i12", "Garrofón", "kg", 0.08, 100, 4.20, 4.00),
    buildIngredient("i13", "Azafrán", "g", 0.5, 100, 0.80, 0.78),
    buildIngredient("i14", "Tomate triturado", "kg", 0.1, 100, 1.60, 1.60),
    buildIngredient("i15", "Aceite de oliva virgen extra", "L", 0.08, 100, 5.90, 5.20),
  ]),

  buildRecipe("r3", "Tarta de queso al horno", "Postres", 8, 9, 25, [
    buildIngredient("i16", "Queso crema Philadelphia", "kg", 0.8, 100, 7.20, 6.80),
    buildIngredient("i17", "Nata 35% MG", "L", 0.4, 100, 2.10, 2.10),
    buildIngredient("i18", "Huevo L", "ud", 4, 100, 0.28, 0.25),
    buildIngredient("i19", "Azúcar blanco", "kg", 0.18, 100, 1.10, 1.10),
    buildIngredient("i20", "Harina de trigo", "kg", 0.04, 100, 0.85, 0.85),
  ]),

  buildRecipe("r4", "Croquetas de jamón ibérico (6 uds)", "Entradas", 6, 12, 22, [
    buildIngredient("i21", "Jamón ibérico picado", "kg", 0.12, 100, 42.00, 39.50),
    buildIngredient("i22", "Leche entera", "L", 0.5, 100, 0.98, 0.95),
    buildIngredient("i23", "Mantequilla", "kg", 0.06, 100, 8.20, 7.90),
    buildIngredient("i24", "Harina de trigo", "kg", 0.06, 100, 0.85, 0.85),
    buildIngredient("i25", "Pan rallado", "kg", 0.15, 100, 1.40, 1.40),
    buildIngredient("i26", "Huevo para rebozar", "ud", 2, 100, 0.28, 0.25),
    buildIngredient("i27", "Aceite de girasol (fritura)", "L", 0.3, 100, 1.85, 1.70),
  ]),

  buildRecipe("r5", "Lubina a la sal", "Principales", 2, 34, 32, [
    buildIngredient("i28", "Lubina entera", "kg", 0.6, 55, 14.80, 13.50),
    buildIngredient("i29", "Sal gruesa marina", "kg", 1.5, 100, 0.45, 0.45),
    buildIngredient("i30", "Aceite de oliva virgen extra", "L", 0.05, 100, 5.90, 5.20),
    buildIngredient("i31", "Limón", "ud", 1, 100, 0.35, 0.32),
    buildIngredient("i32", "Patata", "kg", 0.4, 88, 1.20, 1.10),
    buildIngredient("i33", "Pimiento rojo", "kg", 0.15, 85, 2.80, 2.80),
  ]),
]

export function getCostEvolution(recipeId: string): CostEvolutionPoint[] {
  const recipe = MOCK_ESCANDALLOS.find(r => r.id === recipeId)
  if (!recipe) return []
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const variation = 0.88 + Math.random() * 0.24
    const cost = recipe.total_cost * variation
    const cpp = cost / recipe.portions
    return {
      date: d.toISOString().slice(0, 10),
      total_cost: Math.round(cost * 100) / 100,
      cost_per_portion: Math.round(cpp * 100) / 100,
      food_cost_pct: Math.round((cpp / recipe.selling_price) * 1000) / 10,
    }
  })
}
