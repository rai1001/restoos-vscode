"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/db/client";
import type { User } from "@supabase/supabase-js";

const EMPTY_ACTIVE_HOTEL = {
  hotelId: null,
  hotelName: null,
  role: null,
  tenantId: null,
} as const;

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let active = true;

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setUser(user);
      setLoading(false);
    };

    void getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, loading };
}

interface ActiveHotel {
  hotelId: string | null;
  hotelName: string | null;
  role: string | null;
  tenantId: string | null;
}

export function useActiveHotel() {
  const [hotel, setHotel] = useState<ActiveHotel>(EMPTY_ACTIVE_HOTEL);
  const [hotelLoading, setHotelLoading] = useState(false);
  const { user, loading: sessionLoading } = useSession();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let active = true;

    const fetchActiveHotel = async () => {
      if (!user) {
        if (active) {
          setHotel(EMPTY_ACTIVE_HOTEL);
          setHotelLoading(false);
        }
        return;
      }

      setHotelLoading(true);
      const { data, error } = await supabase.rpc("get_active_hotel", {
        p_user_id: user.id,
      });

      if (!active) return;

      if (!error && data) {
        setHotel({
          hotelId: data.hotel_id,
          hotelName: data.hotel_name,
          role: data.role,
          tenantId: data.tenant_id,
        });
      } else {
        setHotel(EMPTY_ACTIVE_HOTEL);
      }
      setHotelLoading(false);
    };

    void fetchActiveHotel();

    return () => {
      active = false;
    };
  }, [user, supabase]);

  return { ...hotel, loading: sessionLoading || hotelLoading };
}
