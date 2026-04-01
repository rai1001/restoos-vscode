"use client";

import { useState, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MOCK_RECIPES } from "@/lib/mock-data";
import {
  LabelFormSchema,
  type LabelFormData,
  type PrepBatch,
  UNITS,
  LOCATIONS,
  STATIONS,
  EU_ALLERGENS,
} from "../schemas/labeling.schema";

// ── Recipe lookup data for auto-fill ──────────────────────────────────────────

interface RecipeSuggestion {
  id: string;
  name: string;
  shelf_life_days: number;
  allergens: string[];
  unit: string;
}

// Map MOCK_RECIPES to suggestion entries with sensible defaults
const RECIPE_SUGGESTIONS: RecipeSuggestion[] = MOCK_RECIPES.map((r) => ({
  id: r.id,
  name: r.name,
  shelf_life_days:
    r.category === "postre" ? 3 : r.category === "entrante" ? 2 : 5,
  allergens:
    r.category === "postre"
      ? ["gluten", "lacteos", "huevos"]
      : r.category === "entrante"
        ? ["apio"]
        : [],
  unit: r.category === "postre" ? "uds" : "kg",
}));

// ── Component ─────────────────────────────────────────────────────────────────

interface LabelFormProps {
  onBatchCreated: (batch: PrepBatch) => void;
  createBatch: (data: LabelFormData) => Promise<PrepBatch>;
}

export function LabelForm({ onBatchCreated, createBatch }: LabelFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LabelFormData>({
    resolver: zodResolver(LabelFormSchema) as Resolver<LabelFormData>,
    defaultValues: {
      prep_name: "",
      quantity: undefined,
      unit: "kg",
      location: "",
      station: "",
      shelf_life_days: undefined,
      elaboration_date: format(new Date(), "yyyy-MM-dd"),
      allergens: [],
      notes: "",
    },
  });

  const elaborationDate = watch("elaboration_date");
  const shelfLifeDays = watch("shelf_life_days");
  const selectedAllergens = watch("allergens");

  // Computed expiry date
  const expiryDate = useMemo(() => {
    if (!elaborationDate || !shelfLifeDays) return null;
    try {
      return format(
        addDays(new Date(elaborationDate), shelfLifeDays),
        "dd/MM/yyyy"
      );
    } catch {
      return null;
    }
  }, [elaborationDate, shelfLifeDays]);

  // Recipe suggestions filtered by search
  const filteredRecipes = useMemo(() => {
    if (!recipeSearch || recipeSearch.length < 2) return [];
    const q = recipeSearch.toLowerCase();
    return RECIPE_SUGGESTIONS.filter((r) =>
      r.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [recipeSearch]);

  // Handle recipe selection auto-fill
  function handleRecipeSelect(recipe: RecipeSuggestion) {
    setValue("prep_name", recipe.name);
    setValue("prep_id", recipe.id);
    setValue("shelf_life_days", recipe.shelf_life_days);
    setValue("allergens", recipe.allergens);
    setValue("unit", recipe.unit);
    setRecipeSearch(recipe.name);
    setShowSuggestions(false);
  }

  // Handle allergen toggle
  function toggleAllergen(allergenId: string) {
    const current = selectedAllergens ?? [];
    const next = current.includes(allergenId)
      ? current.filter((a) => a !== allergenId)
      : [...current, allergenId];
    setValue("allergens", next);
  }

  async function onSubmit(data: LabelFormData) {
    setSubmitting(true);
    try {
      const batch = await createBatch(data);
      onBatchCreated(batch);
      reset();
      setRecipeSearch("");
    } catch {
      // Error toast handled by the hook
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nueva etiqueta de prep</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Prep name with recipe search */}
          <div className="space-y-1.5">
            <Label>Nombre de preparacion *</Label>
            <div className="relative">
              <Input
                value={recipeSearch}
                onChange={(e) => {
                  setRecipeSearch(e.target.value);
                  setValue("prep_name", e.target.value);
                  setValue("prep_id", undefined);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Buscar receta o escribir nombre..."
              />
              <input type="hidden" {...register("prep_name")} />
              {showSuggestions && filteredRecipes.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                  {filteredRecipes.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleRecipeSelect(r)}
                      >
                        <span className="font-medium">{r.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {r.shelf_life_days}d &middot; {r.unit}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {errors.prep_name && (
              <p className="text-xs text-destructive">
                {errors.prep_name.message}
              </p>
            )}
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cantidad *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                {...register("quantity", { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">
                  {errors.quantity.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Unidad *</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("unit")}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              {errors.unit && (
                <p className="text-xs text-destructive">
                  {errors.unit.message}
                </p>
              )}
            </div>
          </div>

          {/* Location + Station */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ubicacion *</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("location")}
                defaultValue=""
              >
                <option value="" disabled>
                  Seleccionar...
                </option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              {errors.location && (
                <p className="text-xs text-destructive">
                  {errors.location.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Partida *</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("station")}
                defaultValue=""
              >
                <option value="" disabled>
                  Seleccionar...
                </option>
                {STATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.station && (
                <p className="text-xs text-destructive">
                  {errors.station.message}
                </p>
              )}
            </div>
          </div>

          {/* Elaboration date + Shelf life */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha elaboracion *</Label>
              <Input type="date" {...register("elaboration_date")} />
              {errors.elaboration_date && (
                <p className="text-xs text-destructive">
                  {errors.elaboration_date.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Vida util (dias) *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="3"
                {...register("shelf_life_days", { valueAsNumber: true })}
              />
              {errors.shelf_life_days && (
                <p className="text-xs text-destructive">
                  {errors.shelf_life_days.message}
                </p>
              )}
            </div>
          </div>

          {/* Computed expiry date (read-only) */}
          {expiryDate && (
            <div className="rounded-md border border-dashed px-3 py-2">
              <p className="text-sm">
                <span className="text-muted-foreground">
                  Fecha de caducidad:{" "}
                </span>
                <span className="font-semibold">{expiryDate}</span>
              </p>
            </div>
          )}

          {/* Allergens */}
          <div className="space-y-1.5">
            <Label>Alergenos</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {EU_ALLERGENS.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs cursor-pointer hover:bg-accent transition-colors has-[:checked]:bg-accent has-[:checked]:border-primary/50"
                >
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={(selectedAllergens ?? []).includes(a.id)}
                    onChange={() => toggleAllergen(a.id)}
                  />
                  <span>
                    {a.emoji} {a.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <textarea
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
              placeholder="Observaciones adicionales..."
              rows={2}
              {...register("notes")}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setRecipeSearch("");
              }}
            >
              Limpiar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creando..." : "Crear etiqueta"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
