"use client"
import { useMemo } from "react"
import { MOCK_DISHES, analyzeMenu } from "./menu-engineering-mock-data"
import type { MenuCategory } from "./types"

export function useMenuEngineering(category?: MenuCategory) {
  const report = useMemo(() => {
    const filtered = category
      ? MOCK_DISHES.filter((d) => d.category === category)
      : MOCK_DISHES
    return analyzeMenu(filtered)
  }, [category])
  return { report, isLoading: false }
}
