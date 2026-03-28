"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveHotel } from "@/lib/auth/hooks";
import { catalogService } from "../services/catalog.service";
import type { CreateSupplierInput } from "../schemas/catalog.schema";
import { toast } from "sonner";
import { MOCK_SUPPLIERS } from "@/lib/mock-data";

export function useSuppliers() {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  return useQuery({
    queryKey: ["suppliers", hotelId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(MOCK_SUPPLIERS);
      return catalogService.listSuppliers(hotelId!);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });
}

export function useCreateSupplier() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSupplierInput) =>
      catalogService.createSupplier(hotelId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", hotelId] });
      toast.success("Proveedor creado");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
