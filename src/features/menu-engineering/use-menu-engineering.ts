"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveRestaurant } from "@/lib/auth/hooks";
import { menuEngineeringService } from "./services/menu-engineering.service";
import { MOCK_DISHES, analyzeMenu } from "./menu-engineering-mock-data";
import type { MenuCategory } from "./types";

const isDev = process.env.NODE_ENV === "development";
const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
const useMock = isDev && skipAuth;

export function useMenuEngineering(category?: MenuCategory) {
  const { hotelId } = useActiveRestaurant();

  const { data: dishes, isLoading: dishesLoading } = useQuery({
    queryKey: ["menu-engineering-dishes", hotelId],
    queryFn: async () => {
      if (useMock || (!hotelId && isDev)) {
        return MOCK_DISHES;
      }
      return menuEngineeringService.getDishes(hotelId!);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 10 * 60_000,
  });

  const report = useMemo(() => {
    const allDishes = dishes ?? MOCK_DISHES;
    const filtered = category
      ? allDishes.filter((d) => d.category === category)
      : allDishes;
    return analyzeMenu(filtered);
  }, [dishes, category]);

  return { report, isLoading: dishesLoading };
}
