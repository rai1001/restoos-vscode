"use client"

import { useProducts } from "./use-products"
import { useUnits } from "./use-units"
import { MOCK_SUPPLIER_OFFERS, getPreferredPrice } from "@/lib/mock-data"

export function useCatalogForRecipes() {
  const products = useProducts()
  const units = useUnits()
  const productList = products.data ?? []

  return {
    products: productList,
    units: units.data ?? [],
    offers: MOCK_SUPPLIER_OFFERS,
    isLoading: products.isLoading || units.isLoading,
    getProductPrice: (productId: string) => getPreferredPrice(productId),
    getProductById: (id: string) => productList.find((product) => product.id === id) ?? null,
    getProductName: (id: string) => productList.find((product) => product.id === id)?.name ?? "Desconocido",
  }
}
