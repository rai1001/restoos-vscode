"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveRestaurant } from "@/lib/auth/hooks";
import { catalogService } from "../services/catalog.service";
import type { CreateCategoryInput } from "../schemas/catalog.schema";
import { toast } from "sonner";
import { MOCK_CATEGORIES } from "@/lib/mock-data";

export function useCategories() {
  const { hotelId } = useActiveRestaurant();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  return useQuery({
    queryKey: ["categories", hotelId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(MOCK_CATEGORIES);
      return catalogService.listCategories(hotelId!);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 10 * 60_000, // Categorías cambian muy poco: válido 10 min
  });
}

export function useCreateCategory() {
  const { hotelId } = useActiveRestaurant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      catalogService.createCategory(hotelId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", hotelId] });
      toast.success("Categoría creada");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
