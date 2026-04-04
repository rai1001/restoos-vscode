export interface IngredientPriceHistory {
  date: string          // ISO date "2025-03-01"
  unit_price: number    // €/unit
  supplier: string
  invoice_ref: string | null
}

export interface EscandalloIngredient {
  id: string
  ingredient_id: string
  ingredient_name: string
  sub_recipe_id?: string | null
  unit: string                    // "kg", "L", "ud", "g"
  quantity: number                // cantidad necesaria
  yield_pct: number               // rendimiento 0-100 (100 = no merma)
  current_unit_price: number      // precio actual €/unidad
  previous_unit_price: number     // precio anterior
  price_history: IngredientPriceHistory[]
  // computed
  net_quantity: number            // quantity / (yield_pct/100)
  line_cost: number               // net_quantity * current_unit_price
  price_change_pct: number        // % change vs previous
}

export interface EscandalloRecipe {
  id: string
  hotel_id: string
  name: string
  category: string
  portions: number                // número de raciones
  selling_price: number           // precio venta actual €
  target_food_cost_pct: number    // objetivo coste alimentos % (e.g. 30)
  ingredients: EscandalloIngredient[]
  last_calculated: string         // ISO datetime
  // computed
  total_cost: number              // sum of line_costs
  cost_per_portion: number        // total_cost / portions
  food_cost_pct: number           // (cost_per_portion / selling_price) * 100
  suggested_price: number         // cost_per_portion / (target_food_cost_pct / 100)
  has_price_alert: boolean        // any ingredient changed >5%
}

export interface CostEvolutionPoint {
  date: string
  total_cost: number
  cost_per_portion: number
  food_cost_pct: number
}
