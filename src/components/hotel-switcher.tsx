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

interface HotelOption {
  hotel_id: string;
  hotel_name: string;
  role: string;
  is_default: boolean;
}

export function HotelSwitcher() {
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [activeHotelId, setActiveHotelId] = useState<string | null>(null);
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
        const options = memberships.map((m) => ({
          hotel_id: m.hotel_id as string,
          hotel_name: ((m as Record<string, unknown>).hotels as { name: string } | null)?.name ?? "Restaurante",
          role: m.role as string,
          is_default: m.is_default as boolean,
        }));
        setHotels(options);

        const defaultHotel = options.find((h) => h.is_default);
        setActiveHotelId(defaultHotel?.hotel_id ?? options[0]?.hotel_id ?? null);
      }
    }
    load();
  }, [supabase]);

  async function switchHotel(hotelId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.rpc("switch_active_hotel", {
      p_user_id: user.id,
      p_hotel_id: hotelId,
    });

    if (error) {
      toast.error("Error al cambiar de restaurante");
      return;
    }

    setActiveHotelId(hotelId);
    window.location.reload();
  }

  const activeHotel = hotels.find((h) => h.hotel_id === activeHotelId);

  if (hotels.length === 0) {
    return (
      <div className="text-muted-foreground px-3 py-2 text-sm">Sin restaurante</div>
    );
  }

  if (hotels.length === 1) {
    return (
      <div className="px-3 py-2 text-sm font-medium">
        {activeHotel?.hotel_name}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="w-full justify-between" />}
      >
        <span className="truncate">{activeHotel?.hotel_name}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {hotels.map((hotel) => (
          <DropdownMenuItem
            key={hotel.hotel_id}
            onClick={() => switchHotel(hotel.hotel_id)}
          >
            <Check
              className={`mr-2 h-4 w-4 ${
                hotel.hotel_id === activeHotelId ? "opacity-100" : "opacity-0"
              }`}
            />
            <span>{hotel.hotel_name}</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {hotel.role}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
