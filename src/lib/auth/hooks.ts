"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/db/client";
import type { User } from "@supabase/supabase-js";

const EMPTY_ACTIVE_RESTAURANT = {
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

interface ActiveRestaurant {
  hotelId: string | null;
  hotelName: string | null;
  role: string | null;
  tenantId: string | null;
}

export function useActiveRestaurant() {
  const [restaurant, setRestaurant] = useState<ActiveRestaurant>(
    EMPTY_ACTIVE_RESTAURANT
  );
  const [restaurantLoading, setRestaurantLoading] = useState(true);
  const { user, loading: sessionLoading } = useSession();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let active = true;

    const fetchActiveRestaurant = async () => {
      if (!user) {
        if (active) {
          setRestaurant(EMPTY_ACTIVE_RESTAURANT);
          setRestaurantLoading(false);
        }
        return;
      }

      setRestaurantLoading(true);
      const { data, error } = await supabase.rpc("get_active_hotel", {
        p_user_id: user.id,
      });

      if (!active) return;

      if (!error && data) {
        setRestaurant({
          hotelId: data.hotel_id,
          hotelName: data.hotel_name,
          role: data.role,
          tenantId: data.tenant_id,
        });
      } else {
        setRestaurant(EMPTY_ACTIVE_RESTAURANT);
      }
      setRestaurantLoading(false);
    };

    void fetchActiveRestaurant();

    return () => {
      active = false;
    };
  }, [user, supabase]);

  return { ...restaurant, loading: sessionLoading || restaurantLoading };
}
