"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/db/client";
import type { User } from "@supabase/supabase-js";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
  const [hotel, setHotel] = useState<ActiveHotel>({
    hotelId: null,
    hotelName: null,
    role: null,
    tenantId: null,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useSession();
  const supabase = createClient();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchActiveHotel = async () => {
      const { data, error } = await supabase.rpc("get_active_hotel", {
        p_user_id: user.id,
      });

      if (!error && data) {
        setHotel({
          hotelId: data.hotel_id,
          hotelName: data.hotel_name,
          role: data.role,
          tenantId: data.tenant_id,
        });
      }
      setLoading(false);
    };

    fetchActiveHotel();
  }, [user, supabase]);

  return { ...hotel, loading };
}
