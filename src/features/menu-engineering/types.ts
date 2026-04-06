export type MenuCategory =
  | "entradas"
  | "principales"
  | "postres"
  | "bebidas"
  | "tapas"
  | "desayunos"

export type MatrixQuadrant = "estrella" | "vaca" | "enigma" | "perro"

export interface MenuDish {
  id: string
  hotel_id: string
  name: string
  category: MenuCategory
  selling_price: number       // precio de venta (€)
  cost_price: number          // coste de producción (€)
  units_sold: number          // unidades vendidas en el período
  is_active: boolean
  description: string | null
  created_at: string
  // Margin/hour fields
  prep_time_min?: number      // tiempo elaboración batch (minutos)
  batch_size?: number         // raciones por batch
  service_time_min?: number   // tiempo ejecución por comanda (minutos)
}

export interface MenuDishAnalysis extends MenuDish {
  contribution_margin: number         // selling_price - cost_price
  contribution_margin_pct: number     // (contribution_margin / selling_price) * 100
  total_contribution: number          // contribution_margin * units_sold
  quadrant: MatrixQuadrant
  popularity_index: number            // units_sold / avg_units_sold (>1 = popular)
  profitability_index: number         // contribution_margin / avg_contribution_margin (>1 = profitable)
  // Margin/hour
  time_per_serving_min?: number       // (prep_time / batch_size) + service_time
  margin_per_hour?: number            // contribution_margin * (60 / time_per_serving)
}

export interface Recommendation {
  dish: string
  type: "price_up" | "price_down" | "reduce_cost" | "move_position" | "batch_optimize" | "remove" | "promote"
  action: string
  impact: string
  severity: "high" | "medium" | "low"
}

export interface MenuEngineeringReport {
  period_label: string
  dishes: MenuDishAnalysis[]
  avg_units_sold: number
  avg_contribution_margin: number
  total_revenue: number
  total_cost: number
  total_contribution: number
  stars: MenuDishAnalysis[]
  plow_horses: MenuDishAnalysis[]
  puzzles: MenuDishAnalysis[]
  dogs: MenuDishAnalysis[]
}

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  entradas: "Entradas",
  principales: "Principales",
  postres: "Postres",
  bebidas: "Bebidas",
  tapas: "Tapas",
  desayunos: "Desayunos",
}

export const QUADRANT_CONFIG: Record<
  MatrixQuadrant,
  {
    label: string
    emoji: string
    description: string
    recommendation: string
    color: string
    bgColor: string
    borderColor: string
  }
> = {
  estrella: {
    label: "Estrella",
    emoji: "⭐",
    description: "Alta popularidad · Alta rentabilidad",
    recommendation: "Mantener calidad y posición destacada en menú",
    color: "text-[var(--alert-warning)] dark:text-[var(--alert-warning)]",
    bgColor: "bg-[var(--alert-warning)]/10 dark:bg-[var(--alert-warning)]/10",
    borderColor: "border-[var(--alert-warning)] dark:border-[var(--alert-warning)]",
  },
  vaca: {
    label: "Vaca Lechera",
    emoji: "🐄",
    description: "Alta popularidad · Baja rentabilidad",
    recommendation: "Reducir coste o ajustar precio ligeramente",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-300 dark:border-blue-700",
  },
  enigma: {
    label: "Enigma",
    emoji: "❓",
    description: "Baja popularidad · Alta rentabilidad",
    recommendation: "Mejorar visibilidad y posición en la carta",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-300 dark:border-purple-700",
  },
  perro: {
    label: "Perro",
    emoji: "🐕",
    description: "Baja popularidad · Baja rentabilidad",
    recommendation: "Rediseñar, relanzar o retirar del menú",
    color: "text-[var(--alert-critical)] dark:text-[var(--alert-critical)]",
    bgColor: "bg-[var(--alert-critical)]/10 dark:bg-[var(--alert-critical)]/10",
    borderColor: "border-[var(--alert-critical)] dark:border-[var(--alert-critical)]",
  },
}
