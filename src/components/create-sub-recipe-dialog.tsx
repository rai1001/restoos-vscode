"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * Simple link to /recipes/new — sub-recipes are full recipes.
 * The user creates them like any recipe (ingredients, steps, escandallo).
 */
export function CreateSubRecipeLink() {
  return (
    <Link
      href="/recipes/new"
      target="_blank"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors mt-1.5"
    >
      <Plus className="h-3 w-3" />
      Crear nueva receta
    </Link>
  );
}
