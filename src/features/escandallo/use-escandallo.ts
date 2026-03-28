"use client"
import { useMemo } from "react"
import { MOCK_ESCANDALLOS, getCostEvolution } from "./escandallo-mock-data"
import { MOCK_RECIPES, MOCK_SUPPLIER_OFFERS, getPreferredPrice } from "@/lib/mock-data"
import type { EscandalloRecipe } from "./types"

/**
 * Build dynamic escandallos from mock recipes + supplier offers.
 * Combines hardcoded MOCK_ESCANDALLOS with any new recipes that have total_cost.
 */
function buildDynamicEscandallos(): EscandalloRecipe[] {
  // Start with existing mock escandallos
  const existingIds = new Set(MOCK_ESCANDALLOS.map(e => e.id))
  const dynamic: EscandalloRecipe[] = [...MOCK_ESCANDALLOS]

  // Add recipes that aren't in MOCK_ESCANDALLOS but have cost data
  for (const recipe of MOCK_RECIPES) {
    if (existingIds.has(recipe.id)) continue
    if (!recipe.total_cost || recipe.status === "archived") continue

    const sellingPrice = recipe.cost_per_serving
      ? recipe.cost_per_serving * 3.3 // ~30% food cost markup
      : 15.00

    const costPerPortion = recipe.cost_per_serving ?? 0
    const foodCostPct = sellingPrice > 0 ? (costPerPortion / sellingPrice) * 100 : 0
    const targetFoodCost = 30
    const suggestedPrice = costPerPortion > 0 ? costPerPortion / (targetFoodCost / 100) : 0

    dynamic.push({
      id: recipe.id,
      hotel_id: recipe.hotel_id,
      name: recipe.name,
      category: recipe.category ?? "otro",
      portions: recipe.servings,
      selling_price: Math.round(sellingPrice * 100) / 100,
      target_food_cost_pct: targetFoodCost,
      ingredients: [], // Will be populated when detail is opened
      last_calculated: recipe.updated_at,
      total_cost: recipe.total_cost ?? 0,
      cost_per_portion: costPerPortion,
      food_cost_pct: Math.round(foodCostPct * 10) / 10,
      suggested_price: Math.round(suggestedPrice * 100) / 100,
      has_price_alert: false,
    })
  }

  return dynamic
}

export function useEscandallos() {
  const escandallos = useMemo(() => buildDynamicEscandallos(), [])
  return { escandallos, isLoading: false }
}

export function useEscandallo(id: string) {
  const escandallo = useMemo(
    () => {
      // First try existing mock escandallos (which have full ingredients)
      const existing = MOCK_ESCANDALLOS.find(r => r.id === id)
      if (existing) return existing

      // Fall back to dynamic from recipes
      const all = buildDynamicEscandallos()
      return all.find(r => r.id === id) ?? null
    },
    [id]
  )
  const evolution = useMemo(() => getCostEvolution(id), [id])
  return { escandallo, evolution, isLoading: false }
}
