import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { getStripe } from "@/lib/stripe"
import { createServerSupabaseClient } from "@/lib/db/server"

export async function POST() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = await createServerSupabaseClient()

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .limit(1)
    .single()

  if (!membership) {
    return NextResponse.json({ error: "Sin restaurante activo" }, { status: 404 })
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("tenant_id", membership.tenant_id)
    .single()

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "Sin suscripción activa" }, { status: 404 })
  }

  const stripe = getStripe()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://restoos.app"

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${baseUrl}/settings/billing`,
  })

  return NextResponse.json({ url: session.url })
}
