"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveRestaurant } from "@/lib/auth/hooks";
import { recipeService } from "@/features/recipes/services/recipe.service";
import { MOCK_ESCANDALLOS, getCostEvolution } from "./escandallo-mock-data";
import { MOCK_RECIPES } from "@/lib/mock-data";
import type { EscandalloRecipe } from "./types";
import { useMemo } from "react";

const isDev = process.env.NODE_ENV === "development";
const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

/**
 * Convert a recipe from Supabase into an EscandalloRecipe shape.
 */
function recipeToEscandallo(recipe: {
  id: string;
  hotel_id: string;
  name: string;
  category?: string | null;
  servings: number;
  total_cost?: number | null;
  cost_per_serving?: number | null;
  updated_at: string;
  status?: string;
}): EscandalloRecipe {
  const sellingPrice = recipe.cost_per_serving
    ? recipe.cost_per_serving * 3.3
    : 15.0;
  const costPerPortion = recipe.cost_per_serving ?? 0;
  const foodCostPct =
    sellingPrice > 0 ? (costPerPortion / sellingPrice) * 100 : 0;
  const targetFoodCost = 30;
  const suggestedPrice =
    costPerPortion > 0 ? costPerPortion / (targetFoodCost / 100) : 0;

  return {
    id: recipe.id,
    hotel_id: recipe.hotel_id,
    name: recipe.name,
    category: recipe.category ?? "otro",
    portions: recipe.servings,
    selling_price: Math.round(sellingPrice * 100) / 100,
    target_food_cost_pct: targetFoodCost,
    ingredients: [],
    last_calculated: recipe.updated_at,
    total_cost: recipe.total_cost ?? 0,
    cost_per_portion: costPerPortion,
    food_cost_pct: Math.round(foodCostPct * 10) / 10,
    suggested_price: Math.round(suggestedPrice * 100) / 100,
    has_price_alert: false,
  };
}

function buildMockEscandallos(): EscandalloRecipe[] {
  const existingIds = new Set(MOCK_ESCANDALLOS.map((e) => e.id));
  const dynamic: EscandalloRecipe[] = [...MOCK_ESCANDALLOS];
  for (const recipe of MOCK_RECIPES) {
    if (existingIds.has(recipe.id)) continue;
    if (!recipe.total_cost || recipe.status === "archived") continue;
    dynamic.push(recipeToEscandallo(recipe));
  }
  return dynamic;
}

export function useEscandallos() {
  const { hotelId } = useActiveRestaurant();

  const { data, isLoading } = useQuery({
    queryKey: ["escandallos", hotelId],
    queryFn: async (): Promise<EscandalloRecipe[]> => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        return buildMockEscandallos();
      }
      const recipes = await recipeService.list(hotelId!);
      return recipes
        .filter((r) => r.status !== "archived")
        .map(recipeToEscandallo);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });

  return { escandallos: data ?? [], isLoading };
}

export function useEscandallo(id: string) {
  const { hotelId } = useActiveRestaurant();

  const { data: escandallo, isLoading } = useQuery({
    queryKey: ["escandallo", id, hotelId],
    queryFn: async (): Promise<EscandalloRecipe | null> => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        const existing = MOCK_ESCANDALLOS.find((r) => r.id === id);
        if (existing) return existing;
        const all = buildMockEscandallos();
        return all.find((r) => r.id === id) ?? null;
      }
      const recipe = await recipeService.getById(id);
      if (!recipe) return null;
      // Get tech sheet for full ingredient breakdown
      const techSheet = await recipeService.getTechSheet(hotelId!, id);
      const base = recipeToEscandallo(recipe);
      if (techSheet?.ingredients) {
        base.ingredients = techSheet.ingredients.map((ing: {
          id: string;
          product_id: string;
          product_name: string;
          unit: string;
          quantity: number;
          yield_pct?: number;
          unit_cost: number;
          previous_unit_cost?: number;
          price_history?: Array<{ date: string; unit_price: number; supplier: string; invoice_ref: string | null }>;
        }) => ({
          id: ing.id,
          ingredient_id: ing.product_id,
          ingredient_name: ing.product_name,
          unit: ing.unit,
          quantity: ing.quantity,
          yield_pct: ing.yield_pct ?? 100,
          current_unit_price: ing.unit_cost,
          previous_unit_price: ing.previous_unit_cost ?? ing.unit_cost,
          price_history: ing.price_history ?? [],
          net_quantity: ing.quantity / ((ing.yield_pct ?? 100) / 100),
          line_cost: (ing.quantity / ((ing.yield_pct ?? 100) / 100)) * ing.unit_cost,
          price_change_pct: ing.previous_unit_cost
            ? ((ing.unit_cost - ing.previous_unit_cost) / ing.previous_unit_cost) * 100
            : 0,
        }));
        base.total_cost = base.ingredients.reduce((sum, i) => sum + i.line_cost, 0);
        base.cost_per_portion = base.portions > 0 ? base.total_cost / base.portions : 0;
        base.food_cost_pct = base.selling_price > 0
          ? (base.cost_per_portion / base.selling_price) * 100
          : 0;
        base.has_price_alert = base.ingredients.some((i) => Math.abs(i.price_change_pct) > 5);
      }
      return base;
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });

  const evolution = useMemo(
    () => getCostEvolution(id),
    [id]
  );

  return { escandallo: escandallo ?? null, evolution, isLoading };
}
