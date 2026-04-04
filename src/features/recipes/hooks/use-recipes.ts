"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveHotel } from "@/lib/auth/hooks";
import { recipeService } from "../services/recipe.service";
import type { CreateRecipeInput, CreateIngredientInput, CreateStepInput } from "../schemas/recipe.schema";
import { toast } from "sonner";
import { MOCK_RECIPES } from "@/lib/mock-data";

export function useRecipes() {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  return useQuery({
    queryKey: ["recipes", hotelId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(MOCK_RECIPES);
      return recipeService.list(hotelId!);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 30 * 60_000,
  });
}

export function useRecipe(recipeId: string) {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  return useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        const mock = MOCK_RECIPES.find((r) => r.id === recipeId);
        if (mock) return Promise.resolve(mock);
      }
      return recipeService.getById(recipeId);
    },
    enabled: isDev ? !!recipeId : !!recipeId,
    staleTime: 30 * 60_000,
  });
}

export function useCreateRecipe() {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRecipeInput) => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        // Mock: simulate recipe creation
        await new Promise((r) => setTimeout(r, 300));
        const mockId = crypto.randomUUID();
        const newRecipe = {
          id: mockId,
          hotel_id: "00000000-0000-0000-0000-000000000001",
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? null,
          servings: input.servings,
          prep_time_min: input.prep_time_min ?? null,
          cook_time_min: input.cook_time_min ?? null,
          status: "draft" as const,
          version: 1,
          total_cost: null,
          cost_per_serving: null,
          notes: input.notes ?? null,
          is_sub_recipe: input.is_sub_recipe ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
        };
        // Add to mock data in memory
        MOCK_RECIPES.push(newRecipe);
        return { success: true, recipe_id: mockId, status: "draft" };
      }
      return recipeService.create(hotelId!, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Receta creada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateQuickSubRecipe() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; servings: number; category?: string }) =>
      recipeService.createQuickSubRecipe(hotelId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Sub-receta creada y aprobada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSubmitForReview() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => recipeService.submitForReview(hotelId!, recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Receta enviada a revisión");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useApproveRecipe() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => recipeService.approve(hotelId!, recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Receta aprobada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeprecateRecipe() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => recipeService.deprecate(hotelId!, recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Receta deprecada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCalculateRecipeCost() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => recipeService.calculateCost(hotelId!, recipeId),
    onSuccess: (_data, recipeId) => {
      queryClient.invalidateQueries({ queryKey: ["recipe", recipeId] });
      queryClient.invalidateQueries({ queryKey: ["tech-sheet", recipeId] });
      toast.success("Coste calculado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useTechSheet(recipeId: string) {
  const { hotelId } = useActiveHotel();
  return useQuery({
    queryKey: ["tech-sheet", recipeId, hotelId],
    queryFn: () => recipeService.getTechSheet(hotelId!, recipeId),
    enabled: !!hotelId && !!recipeId,
    staleTime: 30 * 60_000,
  });
}

// --- In-memory mock stores for dev mode ---
const mockIngredientStore = new Map<string, Array<{ id: string; recipe_id: string; hotel_id: string; product_id: string | null; sub_recipe_id?: string | null; unit_id: string | null; quantity: number; notes: string | null; sort_order: number; created_at: string }>>();
const mockStepStore = new Map<string, Array<{ id: string; recipe_id: string; hotel_id: string; step_number: number; instruction: string; duration_min: number | null; notes: string | null; created_at: string }>>();

// --- Ingredients ---
export function useRecipeIngredients(recipeId: string) {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  return useQuery({
    queryKey: ["recipe-ingredients", recipeId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(mockIngredientStore.get(recipeId) ?? []);
      return recipeService.listIngredients(recipeId);
    },
    enabled: !!recipeId,
    staleTime: 30 * 60_000,
  });
}

export function useAddIngredient(recipeId: string) {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateIngredientInput) => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        await new Promise((r) => setTimeout(r, 100));
        const existing = mockIngredientStore.get(recipeId) ?? [];
        const newIng = {
          id: crypto.randomUUID(),
          recipe_id: recipeId,
          hotel_id: "00000000-0000-0000-0000-000000000001",
          product_id: input.product_id ?? null,
          sub_recipe_id: input.sub_recipe_id ?? null,
          unit_id: input.unit_id ?? null,
          quantity: input.quantity,
          notes: input.notes ?? null,
          sort_order: existing.length + 1,
          created_at: new Date().toISOString(),
        };
        existing.push(newIng);
        mockIngredientStore.set(recipeId, existing);
        return newIng;
      }
      return recipeService.addIngredient(hotelId!, recipeId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-ingredients", recipeId] });
      toast.success("Ingrediente añadido");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveIngredient(recipeId: string) {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ingredientId: string) => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        const existing = mockIngredientStore.get(recipeId) ?? [];
        mockIngredientStore.set(recipeId, existing.filter((i) => i.id !== ingredientId));
        return;
      }
      return recipeService.removeIngredient(ingredientId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-ingredients", recipeId] });
      toast.success("Ingrediente eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// --- Steps ---
export function useRecipeSteps(recipeId: string) {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  return useQuery({
    queryKey: ["recipe-steps", recipeId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(mockStepStore.get(recipeId) ?? []);
      return recipeService.listSteps(recipeId);
    },
    enabled: !!recipeId,
    staleTime: 30 * 60_000,
  });
}

export function useAddStep(recipeId: string) {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStepInput) => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        await new Promise((r) => setTimeout(r, 100));
        const existing = mockStepStore.get(recipeId) ?? [];
        const newStep = {
          id: crypto.randomUUID(),
          recipe_id: recipeId,
          hotel_id: "00000000-0000-0000-0000-000000000001",
          step_number: input.step_number,
          instruction: input.instruction,
          duration_min: input.duration_min ?? null,
          notes: input.notes ?? null,
          created_at: new Date().toISOString(),
        };
        existing.push(newStep);
        mockStepStore.set(recipeId, existing);
        return newStep;
      }
      return recipeService.addStep(hotelId!, recipeId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-steps", recipeId] });
      toast.success("Paso añadido");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveStep(recipeId: string) {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stepId: string) => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        const entries = [...mockStepStore.entries()];
        for (const [rid, steps] of entries) {
          mockStepStore.set(rid, steps.filter((s) => s.id !== stepId));
        }
        return;
      }
      return recipeService.removeStep(stepId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-steps", recipeId] });
      toast.success("Paso eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
