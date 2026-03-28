"use client";

import { useActiveHotel } from "@/lib/auth/hooks";
import { ROLE } from "@/contracts/enums";
import type { AppRole } from "@/lib/rbac";

/**
 * Returns the current user's role for the active hotel.
 * Defaults to ROLE.RECEPTION (read-only) if no role is found.
 * In development without Supabase, returns ROLE.ADMIN so all features are visible.
 */
export function useRole(): AppRole {
  const { role } = useActiveHotel();

  if (!role) {
    // In dev without Supabase, grant admin so all features are visible
    if (process.env.NODE_ENV === "development") {
      return ROLE.ADMIN;
    }
    // Safe default in production: lowest-privilege role
    return ROLE.RECEPTION;
  }

  // Validate that the role string is a known Role value
  const knownRoles = Object.values(ROLE) as string[];
  if (knownRoles.includes(role)) {
    return role as AppRole;
  }

  return ROLE.RECEPTION;
}
