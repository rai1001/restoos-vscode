"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useRecipes } from "@/features/recipes/hooks/use-recipes";
import { cn } from "@/lib/utils";
import { X, ChefHat } from "lucide-react";

interface RecipeComboboxProps {
  value: string | null;
  excludeRecipeId?: string; // prevent self-reference
  onSelect: (recipe: { id: string; name: string } | null) => void;
  placeholder?: string;
  className?: string;
}

export function RecipeCombobox({
  value,
  excludeRecipeId,
  onSelect,
  placeholder = "Buscar sub-receta...",
  className,
}: RecipeComboboxProps) {
  const { data: recipes } = useRecipes();

  const available = useMemo(() => {
    return (recipes ?? []).filter(
      (r) => r.id !== excludeRecipeId && r.status === "approved"
    );
  }, [recipes, excludeRecipeId]);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedRecipe = useMemo(() => {
    if (!value) return null;
    return available.find((r) => r.id === value) ?? null;
  }, [value, available]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q
      ? available.filter((r) => r.name.toLowerCase().includes(q))
      : available;
    return list.slice(0, 10);
  }, [query, available]);

  const handleSelect = useCallback(
    (recipe: { id: string; name: string }) => {
      setQuery("");
      setOpen(false);
      onSelect({ id: recipe.id, name: recipe.name });
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    onSelect(null);
    inputRef.current?.focus();
  }, [onSelect]);

  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => setOpen(false), 200);
  }, []);

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (!selectedRecipe) setOpen(true);
  }, [selectedRecipe]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      {selectedRecipe ? (
        <div className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
          <span className="flex items-center gap-1.5 truncate font-semibold">
            <ChefHat className="h-3.5 w-3.5 text-muted-foreground" />
            {selectedRecipe.name}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Borrar seleccion"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
        />
      )}

      {open && !selectedRecipe && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover text-popover-foreground shadow-md">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Sin recetas aprobadas
            </li>
          ) : (
            filtered.map((recipe) => (
              <li
                key={recipe.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(recipe);
                }}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
              >
                <ChefHat className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex flex-col truncate">
                  <span className="truncate font-medium">{recipe.name}</span>
                  {recipe.category && (
                    <span className="truncate text-xs text-muted-foreground">
                      {recipe.category} | {recipe.servings} raciones
                    </span>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
