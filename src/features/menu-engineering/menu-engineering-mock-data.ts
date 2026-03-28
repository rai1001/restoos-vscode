// TODO: Replace with Supabase queries once menu_dishes table is migrated
import type { MenuDish, MenuDishAnalysis, MenuEngineeringReport } from "./types"

export const MOCK_DISHES: MenuDish[] = [
  // Principales
  { id: "d1", hotel_id: "h1", name: "Solomillo de ternera con salsa de trufas", category: "principales", selling_price: 38, cost_price: 14, units_sold: 87, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d2", hotel_id: "h1", name: "Lubina a la sal con verduras de temporada", category: "principales", selling_price: 34, cost_price: 16, units_sold: 62, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d3", hotel_id: "h1", name: "Paella valenciana (2 personas)", category: "principales", selling_price: 52, cost_price: 18, units_sold: 134, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d4", hotel_id: "h1", name: "Cochinillo asado al horno de leña", category: "principales", selling_price: 42, cost_price: 22, units_sold: 45, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d5", hotel_id: "h1", name: "Risotto de boletus y parmesano", category: "principales", selling_price: 28, cost_price: 9, units_sold: 38, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d6", hotel_id: "h1", name: "Hamburguesa gourmet con patatas", category: "principales", selling_price: 22, cost_price: 8, units_sold: 156, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d7", hotel_id: "h1", name: "Carrillera de cerdo ibérico al vino tinto", category: "principales", selling_price: 29, cost_price: 13, units_sold: 71, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d8", hotel_id: "h1", name: "Bacalao al pil-pil con pimientos del piquillo", category: "principales", selling_price: 31, cost_price: 17, units_sold: 29, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },

  // Entradas
  { id: "d9", hotel_id: "h1", name: "Croquetas caseras de jamón ibérico (6 uds)", category: "entradas", selling_price: 12, cost_price: 3.5, units_sold: 203, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d10", hotel_id: "h1", name: "Foie micuit con manzana caramelizada", category: "entradas", selling_price: 18, cost_price: 9, units_sold: 41, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d11", hotel_id: "h1", name: "Gazpacho andaluz con guarnición", category: "entradas", selling_price: 9, cost_price: 2, units_sold: 88, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d12", hotel_id: "h1", name: "Tabla de quesos seleccionados", category: "entradas", selling_price: 16, cost_price: 8, units_sold: 22, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },

  // Postres
  { id: "d13", hotel_id: "h1", name: "Tarta de queso al horno estilo La Viña", category: "postres", selling_price: 9, cost_price: 2.5, units_sold: 118, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d14", hotel_id: "h1", name: "Crema catalana con frutos rojos", category: "postres", selling_price: 8, cost_price: 2, units_sold: 76, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d15", hotel_id: "h1", name: "Mousse de chocolate 70% cacao", category: "postres", selling_price: 8, cost_price: 2.2, units_sold: 55, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d16", hotel_id: "h1", name: "Soufflé de Grand Marnier", category: "postres", selling_price: 12, cost_price: 4, units_sold: 18, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },

  // Bebidas
  { id: "d17", hotel_id: "h1", name: "Copa de vino Ribera del Duero Reserva", category: "bebidas", selling_price: 9, cost_price: 2.8, units_sold: 167, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d18", hotel_id: "h1", name: "Gin Tonic Premium con guarnición", category: "bebidas", selling_price: 14, cost_price: 4.5, units_sold: 89, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d19", hotel_id: "h1", name: "Agua mineral (50cl)", category: "bebidas", selling_price: 3.5, cost_price: 0.4, units_sold: 312, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
  { id: "d20", hotel_id: "h1", name: "Cóctel de la casa (sin alcohol)", category: "bebidas", selling_price: 8, cost_price: 1.8, units_sold: 24, is_active: true, description: null, created_at: "2024-01-01T00:00:00" },
]

export function analyzeMenu(
  dishes: MenuDish[],
  periodLabel = "Último mes",
): MenuEngineeringReport {
  const totalUnits = dishes.reduce((a, d) => a + d.units_sold, 0)
  const avgUnits = totalUnits / dishes.length

  const withMargins = dishes.map((d) => ({
    ...d,
    contribution_margin: d.selling_price - d.cost_price,
    contribution_margin_pct:
      ((d.selling_price - d.cost_price) / d.selling_price) * 100,
    total_contribution: (d.selling_price - d.cost_price) * d.units_sold,
    popularity_index: 0,
    profitability_index: 0,
    quadrant: "perro" as const,
  }))

  const avgMargin =
    withMargins.reduce((a, d) => a + d.contribution_margin, 0) /
    withMargins.length

  const analysed: MenuDishAnalysis[] = withMargins.map((d) => {
    const pop = d.units_sold / avgUnits
    const prof = d.contribution_margin / avgMargin
    let quadrant: MenuDishAnalysis["quadrant"]
    if (pop >= 1 && prof >= 1) quadrant = "estrella"
    else if (pop >= 1 && prof < 1) quadrant = "vaca"
    else if (pop < 1 && prof >= 1) quadrant = "enigma"
    else quadrant = "perro"
    return { ...d, popularity_index: pop, profitability_index: prof, quadrant }
  })

  const totalRevenue = dishes.reduce(
    (a, d) => a + d.selling_price * d.units_sold,
    0,
  )
  const totalCost = dishes.reduce(
    (a, d) => a + d.cost_price * d.units_sold,
    0,
  )

  return {
    period_label: periodLabel,
    dishes: analysed,
    avg_units_sold: avgUnits,
    avg_contribution_margin: avgMargin,
    total_revenue: totalRevenue,
    total_cost: totalCost,
    total_contribution: totalRevenue - totalCost,
    stars: analysed.filter((d) => d.quadrant === "estrella"),
    plow_horses: analysed.filter((d) => d.quadrant === "vaca"),
    puzzles: analysed.filter((d) => d.quadrant === "enigma"),
    dogs: analysed.filter((d) => d.quadrant === "perro"),
  }
}
