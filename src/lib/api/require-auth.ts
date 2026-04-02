import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/db/server"

/**
 * Validates that the request comes from an authenticated user.
 * Returns the user if authenticated, or a 401 NextResponse if not.
 */
export async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }

  return { user, error: null }
}
