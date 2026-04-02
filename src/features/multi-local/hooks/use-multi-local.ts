"use client"

import { useQuery } from "@tanstack/react-query"
import { useActiveHotel } from "@/lib/auth/hooks"
import { multiLocalService } from "../services/multi-local.service"

export function useTenantOverview() {
  const { tenantId } = useActiveHotel()

  return useQuery({
    queryKey: ["tenant-overview", tenantId],
    queryFn: () => multiLocalService.getTenantOverview(tenantId!),
    enabled: !!tenantId,
    staleTime: 2 * 60_000,
  })
}

export function usePriceComparisons() {
  const { tenantId } = useActiveHotel()

  return useQuery({
    queryKey: ["price-comparisons", tenantId],
    queryFn: () => multiLocalService.getPriceComparisons(tenantId!),
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  })
}
