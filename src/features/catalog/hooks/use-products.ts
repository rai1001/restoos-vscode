"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveHotel } from "@/lib/auth/hooks";
import { catalogService } from "../services/catalog.service";
import type { CreateProductInput } from "../schemas/catalog.schema";
import { toast } from "sonner";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

export function useProducts() {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  return useQuery({
    queryKey: ["products", hotelId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(MOCK_PRODUCTS);
      return catalogService.listProducts(hotelId!);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000, // Catálogo cambia poco: válido 5 min, evita refetch en cada foco
  });
}

export function useCreateProduct() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      catalogService.createProduct(hotelId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", hotelId] });
      toast.success("Producto creado");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useSearchProducts(query: string, categoryId?: string) {
  const { hotelId } = useActiveHotel();

  return useQuery({
    queryKey: ["products", "search", hotelId, query, categoryId],
    queryFn: () => catalogService.searchProducts(hotelId!, query, categoryId),
    enabled: !!hotelId && query.length >= 2,
  });
}
