"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveHotel } from "@/lib/auth/hooks";
import { recipeService } from "../services/recipe.service";
import type { CreateMenuInput, CreateMenuSectionInput } from "../schemas/recipe.schema";
import { toast } from "sonner";

export function useMenus() {
  const { hotelId } = useActiveHotel();
  return useQuery({
    queryKey: ["menus", hotelId],
    queryFn: () => recipeService.listMenus(hotelId!),
    enabled: !!hotelId,
  });
}

export function useMenu(menuId: string) {
  return useQuery({
    queryKey: ["menu", menuId],
    queryFn: () => recipeService.getMenuById(menuId),
    enabled: !!menuId,
  });
}

export function useCreateMenu() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMenuInput) => recipeService.createMenu(hotelId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus", hotelId] });
      toast.success("Menú creado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCalculateMenuCost() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (menuId: string) => recipeService.calculateMenuCost(hotelId!, menuId),
    onSuccess: (_data, menuId) => {
      queryClient.invalidateQueries({ queryKey: ["menu", menuId] });
      toast.success("Coste del menú calculado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// --- Sections ---
export function useMenuSections(menuId: string) {
  return useQuery({
    queryKey: ["menu-sections", menuId],
    queryFn: () => recipeService.listSections(menuId),
    enabled: !!menuId,
  });
}

export function useAddSection(menuId: string) {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMenuSectionInput) =>
      recipeService.addSection(hotelId!, menuId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-sections", menuId] });
      toast.success("Sección añadida");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveSection(menuId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: string) => recipeService.removeSection(sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-sections", menuId] });
      toast.success("Sección eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// --- Section Recipes ---
export function useAddRecipeToSection(menuId: string) {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, recipeId, price }: { sectionId: string; recipeId: string; price?: number }) =>
      recipeService.addRecipeToSection(hotelId!, sectionId, recipeId, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-sections", menuId] });
      toast.success("Receta añadida al menú");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveRecipeFromSection(menuId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recipeService.removeRecipeFromSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-sections", menuId] });
      toast.success("Receta eliminada del menú");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
