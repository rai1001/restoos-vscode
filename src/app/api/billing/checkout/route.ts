import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { getStripe } from "@/lib/stripe"
import { createServerSupabaseClient } from "@/lib/db/server"

const PRICE_MAP: Record<string, string | undefined> = {
  control: process.env.STRIPE_PRICE_CONTROL,
  operaciones: process.env.STRIPE_PRICE_OPERACIONES,
  grupo: process.env.STRIPE_PRICE_GRUPO,
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { plan } = (await request.json()) as { plan: string }
  const priceId = PRICE_MAP[plan]
  if (!priceId) {
    return NextResponse.json({ error: "Plan no válido" }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Get user's tenant
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

  // Check for existing Stripe customer
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("tenant_id", membership.tenant_id)
    .single()

  const stripe = getStripe()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://restoos.app"

  // Count active hotels for quantity
  const { count: hotelCount } = await supabase
    .from("hotels")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", membership.tenant_id)
    .eq("is_active", true)

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: subscription?.stripe_customer_id || undefined,
    customer_email: !subscription?.stripe_customer_id ? auth.user.email ?? undefined : undefined,
    line_items: [
      {
        price: priceId,
        quantity: Math.max(hotelCount ?? 1, 1),
      },
    ],
    success_url: `${baseUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/settings/billing`,
    metadata: {
      tenant_id: membership.tenant_id,
    },
    subscription_data: {
      metadata: {
        tenant_id: membership.tenant_id,
      },
    },
  })

  return NextResponse.json({ url: session.url })
}
