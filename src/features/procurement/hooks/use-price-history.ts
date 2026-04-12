"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveRestaurant } from "@/lib/auth/hooks";
import { priceHistoryService } from "../services/price-history.service";

export function usePriceHistory(
  productId: string | undefined,
  filters: { supplierId?: string; dateFrom?: string; dateTo?: string } = {}
) {
  const { hotelId } = useActiveRestaurant();
  return useQuery({
    queryKey: ["price-history", hotelId, productId, filters],
    queryFn: () => priceHistoryService.getPriceHistory(hotelId!, productId!, filters),
    enabled: !!hotelId && !!productId,
    staleTime: 5 * 60_000,
  });
}

export function useLatestPrices(productIds: string[]) {
  const { hotelId } = useActiveRestaurant();
  return useQuery({
    queryKey: ["latest-prices", hotelId, productIds],
    queryFn: () => priceHistoryService.getLatestPrices(hotelId!, productIds),
    enabled: !!hotelId && productIds.length > 0,
    staleTime: 5 * 60_000,
  });
}

export function usePriceStats(productId: string | undefined) {
  const { hotelId } = useActiveRestaurant();
  return useQuery({
    queryKey: ["price-stats", hotelId, productId],
    queryFn: () => priceHistoryService.getPriceStats(hotelId!, productId!),
    enabled: !!hotelId && !!productId,
    staleTime: 5 * 60_000,
  });
}

export function usePriceAlerts(threshold: number = 15) {
  const { hotelId } = useActiveRestaurant();
  return useQuery({
    queryKey: ["price-alerts", hotelId, threshold],
    queryFn: () => priceHistoryService.getPriceAlerts(hotelId!, threshold),
    enabled: !!hotelId,
    staleTime: 10 * 60_000,
  });
}
