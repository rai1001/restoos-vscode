"use client";

import { useQuery } from "@tanstack/react-query";
import { recipeService } from "../services/recipe.service";
import type { MenuSectionWithRecipes, EngineeringRecipe } from "../schemas/recipe.schema";

// ─── Quadrant classification ───────────────────────────────────────────────

export type Quadrant = "estrella" | "caballo" | "puzzle" | "perro";

export interface EngineeringItem {
  /** row id from menu_section_recipes */
  id: string;
  recipeId: string;
  name: string;
  sectionName: string;
  category: string | null;
  cost: number | null;
  price: number | null;
  /** Derived: selling_price - cost  (null when missing data) */
  contributionMargin: number | null;
  /** Relative margin rank within this menu (0–1) */
  marginScore: number;
  /** Relative popularity rank within this menu (0–1, based on sort_order proxy) */
  popularityScore: number;
  quadrant: Quadrant;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function classifyQuadrant(
  popularityScore: number,
  marginScore: number
): Quadrant {
  const highPop = popularityScore >= 0.5;
  const highMargin = marginScore >= 0.5;
  if (highPop && highMargin) return "estrella";
  if (highPop && !highMargin) return "caballo";
  if (!highPop && highMargin) return "puzzle";
  return "perro";
}

// ─── Data transformation ───────────────────────────────────────────────────

export function buildEngineeringItems(
  sections: MenuSectionWithRecipes[]
): EngineeringItem[] {
  // Flatten all section recipes into a single list
  const flat: Array<{
    row: EngineeringRecipe;
    sectionName: string;
    globalIndex: number;
  }> = [];

  let globalIndex = 0;
  for (const section of sections) {
    for (const row of section.menu_section_recipes) {
      flat.push({ row, sectionName: section.name, globalIndex });
      globalIndex++;
    }
  }

  if (flat.length === 0) return [];

  // ── Margin scoring ────────────────────────────────────────────────────────
  // For each item: margin = price - cost (when available)
  // If price is missing, back-calculate from target food cost pct or skip
  const margins: number[] = flat.map(({ row }) => {
    const cost = row.recipes?.total_cost ?? row.recipes?.cost_per_serving ?? null;
    if (cost == null) return 0;
    if (row.price != null) return row.price - cost;
    // No selling price — margin proxy is just inverse of cost (lower cost = higher relative margin)
    return -cost;
  });

  // Normalise margin scores between 0 and 1 using min/max
  const minM = Math.min(...margins);
  const maxM = Math.max(...margins);
  const marginRange = maxM - minM;

  // ── Popularity scoring ────────────────────────────────────────────────────
  // Proxy: items that appear earlier in menu sections (lower sort_order & earlier section)
  // are assumed more "featured" and therefore more popular.
  // We invert so that lower index = higher popularity score.
  const totalItems = flat.length;

  return flat.map(({ row, sectionName, globalIndex: idx }) => {
    const recipe = row.recipes;
    const cost = recipe?.total_cost ?? recipe?.cost_per_serving ?? null;
    const margin = margins[idx] ?? 0;

    const marginScore =
      marginRange === 0
        ? 0.5
        : (margin - minM) / marginRange;

    // Earlier items (lower global index) get higher popularity
    const popularityScore =
      totalItems === 1 ? 0.5 : 1 - idx / (totalItems - 1);

    const contributionMargin =
      cost != null && row.price != null ? row.price - cost : null;

    return {
      id: row.id,
      recipeId: row.recipe_id,
      name: recipe?.name ?? "Receta desconocida",
      sectionName,
      category: recipe?.category ?? null,
      cost,
      price: row.price,
      contributionMargin,
      marginScore,
      popularityScore,
      quadrant: classifyQuadrant(popularityScore, marginScore),
    };
  });
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useMenuEngineering(menuId: string | null) {
  const query = useQuery({
    queryKey: ["menu-engineering", menuId],
    queryFn: () => recipeService.getMenuSectionsWithRecipes(menuId!),
    enabled: !!menuId,
  });

  const items: EngineeringItem[] = query.data
    ? buildEngineeringItems(query.data)
    : [];

  return {
    ...query,
    items,
  };
}
