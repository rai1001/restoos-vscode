"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";

interface RestaurantOption {
  hotel_id: string;
  hotel_name: string;
  role: string;
  is_default: boolean;
}

export function RestaurantSwitcher() {
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("memberships")
        .select("hotel_id, role, is_default, hotels(name)")
        .eq("is_active", true);

      if (memberships) {
        const restaurantOptions = memberships.map((m) => ({
          hotel_id: m.hotel_id as string,
          hotel_name: ((m as Record<string, unknown>).hotels as { name: string } | null)?.name ?? "Restaurante",
          role: m.role as string,
          is_default: m.is_default as boolean,
        }));
        setRestaurants(restaurantOptions);

        const defaultRestaurant = restaurantOptions.find((option) => option.is_default);
        setActiveRestaurantId(
          defaultRestaurant?.hotel_id ?? restaurantOptions[0]?.hotel_id ?? null
        );
      }
    }
    load();
  }, [supabase]);

  async function switchRestaurant(restaurantId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.rpc("switch_active_hotel", {
      p_user_id: user.id,
      p_hotel_id: restaurantId,
    });

    if (error) {
      toast.error("Error al cambiar de restaurante");
      return;
    }

    setActiveRestaurantId(restaurantId);
    window.location.reload();
  }

  const activeRestaurant = restaurants.find(
    (restaurant) => restaurant.hotel_id === activeRestaurantId
  );

  if (restaurants.length === 0) {
    const isDemo = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
    return (
      <div className="px-3 py-2 text-sm font-medium flex items-center gap-2">
        <span className="text-foreground">{isDemo ? "Culuca Cociña-Bar" : "Sin restaurante"}</span>
        {isDemo && (
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded">
            Demo
          </span>
        )}
      </div>
    );
  }

  if (restaurants.length === 1) {
    return (
      <div className="px-3 py-2 text-sm font-medium">
        {activeRestaurant?.hotel_name}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="w-full justify-between" />}
      >
        <span className="truncate">{activeRestaurant?.hotel_name}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {restaurants.map((restaurant) => (
          <DropdownMenuItem
            key={restaurant.hotel_id}
            onClick={() => switchRestaurant(restaurant.hotel_id)}
          >
            <Check
              className={`mr-2 h-4 w-4 ${
                restaurant.hotel_id === activeRestaurantId ? "opacity-100" : "opacity-0"
              }`}
            />
            <span>{restaurant.hotel_name}</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {restaurant.role}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
