"use client"

import { useQuery } from "@tanstack/react-query"
import { useActiveHotel } from "@/lib/auth/hooks"
import { multiLocalService } from "../services/multi-local.service"
import type { HotelOverview, PriceComparison } from "../services/multi-local.service"

const isDev = process.env.NODE_ENV === "development"
const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true"

// ── Mock data for demo mode ─────────────────────────────────────────────────

const MOCK_HOTELS: HotelOverview[] = [
  {
    hotel_id: "bb000000-0000-0000-0000-000000000001",
    name: "Culuca Cociña-Bar",
    slug: "culuca-cocina-bar",
    products_count: 34,
    recipes_count: 9,
    recipes_approved: 7,
    suppliers_count: 5,
    stock_value: 4850,
    stock_lots_count: 22,
    stock_expiring_3d: 3,
    waste_30d_cost: 320,
    po_pending: 1,
    appcc_today_pct: 100,
    appcc_today_status: "completed",
    appcc_incidents_open: 0,
    alerts_active: 1,
  },
  {
    hotel_id: "bb000000-0000-0000-0000-000000000002",
    name: "Taberna da Galera",
    slug: "taberna-galera",
    products_count: 18,
    recipes_count: 5,
    recipes_approved: 4,
    suppliers_count: 3,
    stock_value: 3200,
    stock_lots_count: 12,
    stock_expiring_3d: 1,
    waste_30d_cost: 580,
    po_pending: 2,
    appcc_today_pct: 87.5,
    appcc_today_status: "in_progress",
    appcc_incidents_open: 1,
    alerts_active: 2,
  },
  {
    hotel_id: "bb000000-0000-0000-0000-000000000003",
    name: "Taberna da Tabacalera",
    slug: "taberna-tabacalera",
    products_count: 15,
    recipes_count: 4,
    recipes_approved: 3,
    suppliers_count: 3,
    stock_value: 5600,
    stock_lots_count: 10,
    stock_expiring_3d: 2,
    waste_30d_cost: 450,
    po_pending: 0,
    appcc_today_pct: 75,
    appcc_today_status: "in_progress",
    appcc_incidents_open: 2,
    alerts_active: 3,
  },
  {
    hotel_id: "bb000000-0000-0000-0000-000000000004",
    name: "Culuca Obrador",
    slug: "culuca-obrador",
    products_count: 10,
    recipes_count: 4,
    recipes_approved: 4,
    suppliers_count: 3,
    stock_value: 2100,
    stock_lots_count: 7,
    stock_expiring_3d: 0,
    waste_30d_cost: 120,
    po_pending: 1,
    appcc_today_pct: 100,
    appcc_today_status: "completed",
    appcc_incidents_open: 0,
    alerts_active: 0,
  },
]

const MOCK_PRICES: PriceComparison[] = [
  { product_name: "Aceite oliva virgen extra", hotel_id: "bb1", hotel_name: "Culuca", price: 4.50, unit: "€/L", supplier_name: "Distribuciones Gallaecia" },
  { product_name: "Aceite oliva virgen extra", hotel_id: "bb2", hotel_name: "Galera", price: 4.80, unit: "€/L", supplier_name: "Distribuciones Gallaecia" },
  { product_name: "Aceite oliva virgen extra", hotel_id: "bb3", hotel_name: "Tabacalera", price: 5.20, unit: "€/L", supplier_name: "Distribuciones Gallaecia" },
  { product_name: "Aceite oliva virgen extra", hotel_id: "bb4", hotel_name: "Obrador", price: 4.50, unit: "€/L", supplier_name: "Distribuciones Gallaecia" },
  { product_name: "Patata gallega", hotel_id: "bb1", hotel_name: "Culuca", price: 1.10, unit: "€/kg", supplier_name: "Frutas García" },
  { product_name: "Patata gallega", hotel_id: "bb2", hotel_name: "Galera", price: 1.40, unit: "€/kg", supplier_name: "Frutas García" },
  { product_name: "Patata gallega", hotel_id: "bb3", hotel_name: "Tabacalera", price: 1.40, unit: "€/kg", supplier_name: "Frutas García" },
  { product_name: "Cebolla blanca", hotel_id: "bb1", hotel_name: "Culuca", price: 0.95, unit: "€/kg", supplier_name: "Frutas García" },
  { product_name: "Cebolla blanca", hotel_id: "bb2", hotel_name: "Galera", price: 1.10, unit: "€/kg", supplier_name: "Frutas García" },
  { product_name: "Cebolla blanca", hotel_id: "bb3", hotel_name: "Tabacalera", price: 1.15, unit: "€/kg", supplier_name: "Frutas García" },
  { product_name: "Cebolla blanca", hotel_id: "bb4", hotel_name: "Obrador", price: 0.95, unit: "€/kg", supplier_name: "Frutas García" },
  { product_name: "Huevo fresco", hotel_id: "bb1", hotel_name: "Culuca", price: 0.18, unit: "€/ud", supplier_name: "Lácteos do Campo" },
  { product_name: "Huevo fresco", hotel_id: "bb2", hotel_name: "Galera", price: 0.22, unit: "€/ud", supplier_name: "Lácteos do Campo" },
  { product_name: "Huevo fresco", hotel_id: "bb3", hotel_name: "Tabacalera", price: 0.20, unit: "€/ud", supplier_name: "Lácteos do Campo" },
  { product_name: "Huevo fresco", hotel_id: "bb4", hotel_name: "Obrador", price: 0.18, unit: "€/ud", supplier_name: "Lácteos do Campo" },
  { product_name: "Solomillo ternera", hotel_id: "bb1", hotel_name: "Culuca", price: 18.50, unit: "€/kg", supplier_name: "Carnicería Rial" },
  { product_name: "Solomillo ternera", hotel_id: "bb3", hotel_name: "Tabacalera", price: 19.80, unit: "€/kg", supplier_name: "Carnicería Rial" },
]

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useTenantOverview() {
  const { tenantId } = useActiveHotel()

  return useQuery({
    queryKey: ["tenant-overview", tenantId],
    queryFn: () => {
      if (isDev && skipAuth) return Promise.resolve(MOCK_HOTELS)
      if (!tenantId && isDev) return Promise.resolve(MOCK_HOTELS)
      return multiLocalService.getTenantOverview(tenantId!)
    },
    enabled: isDev ? true : !!tenantId,
    staleTime: 2 * 60_000,
  })
}

export function usePriceComparisons() {
  const { tenantId } = useActiveHotel()

  return useQuery({
    queryKey: ["price-comparisons", tenantId],
    queryFn: () => {
      if (isDev && skipAuth) return Promise.resolve(MOCK_PRICES)
      if (!tenantId && isDev) return Promise.resolve(MOCK_PRICES)
      return multiLocalService.getPriceComparisons(tenantId!)
    },
    enabled: isDev ? true : !!tenantId,
    staleTime: 5 * 60_000,
  })
}
