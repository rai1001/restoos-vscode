"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveRestaurant } from "@/lib/auth/hooks";
import { inventoryService } from "../services/inventory.service";
import { toast } from "sonner";
import { MOCK_STOCK_LOTS, MOCK_STOCK_MOVEMENTS } from "@/lib/mock-data";

export function useStockLevels() {
  const { hotelId } = useActiveRestaurant();
  return useQuery({
    queryKey: ["stock-levels", hotelId],
    queryFn: () => inventoryService.getStockLevels(hotelId!),
    enabled: !!hotelId,
    staleTime: 5 * 60_000,
  });
}

export function useStockLots(productId?: string) {
  const { hotelId } = useActiveRestaurant();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  return useQuery({
    queryKey: ["stock-lots", hotelId, productId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        const lots = productId
          ? MOCK_STOCK_LOTS.filter((l) => l.product_id === productId)
          : MOCK_STOCK_LOTS;
        return Promise.resolve(lots);
      }
      return inventoryService.listLots(hotelId!, productId);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });
}

export function useStockMovements(productId?: string) {
  const { hotelId } = useActiveRestaurant();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  return useQuery({
    queryKey: ["stock-movements", hotelId, productId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        const movements = productId
          ? MOCK_STOCK_MOVEMENTS.filter((m) => m.product_id === productId)
          : MOCK_STOCK_MOVEMENTS;
        return Promise.resolve(movements);
      }
      return inventoryService.listMovements(hotelId!, productId);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });
}

export function useRecordWaste() {
  const { hotelId } = useActiveRestaurant();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, lotId, quantity, notes }: {
      productId: string; lotId: string; quantity: number; notes?: string;
    }) => inventoryService.recordWaste(hotelId!, productId, lotId, quantity, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      queryClient.invalidateQueries({ queryKey: ["stock-lots"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success("Merma registrada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useStockAlerts() {
  const { hotelId } = useActiveRestaurant();
  return useQuery({
    queryKey: ["stock-alerts", hotelId],
    queryFn: () => inventoryService.checkAlerts(hotelId!),
    enabled: !!hotelId,
    staleTime: 5 * 60_000,
  });
}
