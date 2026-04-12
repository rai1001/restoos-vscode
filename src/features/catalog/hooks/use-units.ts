"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveRestaurant } from "@/lib/auth/hooks";
import { catalogService } from "../services/catalog.service";
import type { CreateUnitInput } from "../schemas/catalog.schema";
import { toast } from "sonner";

export function useUnits() {
  const { hotelId } = useActiveRestaurant();

  return useQuery({
    queryKey: ["units", hotelId],
    queryFn: () => catalogService.listUnits(hotelId!),
    enabled: !!hotelId,
    staleTime: 10 * 60_000, // Unidades de medida prácticamente no cambian
  });
}

export function useCreateUnit() {
  const { hotelId } = useActiveRestaurant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUnitInput) =>
      catalogService.createUnit(hotelId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", hotelId] });
      toast.success("Unidad creada");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
