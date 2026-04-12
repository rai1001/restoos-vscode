import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createServiceClient } from "@/lib/db/service"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const stripe = getStripe()

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = event.data.object as any

  switch (event.type) {
    case "checkout.session.completed": {
      const tenantId = obj.metadata?.tenant_id as string | undefined
      const subId = obj.subscription as string | undefined
      if (!tenantId || !subId) break

      const sub = await stripe.subscriptions.retrieve(subId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subAny = sub as any

      await supabase.from("subscriptions").upsert(
        {
          tenant_id: tenantId,
          stripe_customer_id: String(obj.customer),
          stripe_subscription_id: sub.id,
          plan: mapPriceToPlan(sub.items.data[0]?.price.id),
          status: sub.status === "trialing" ? "trialing" : "active",
          current_period_start: toISO(subAny.current_period_start),
          current_period_end: toISO(subAny.current_period_end),
          trial_ends_at: subAny.trial_end ? toISO(subAny.trial_end) : null,
        },
        { onConflict: "tenant_id" }
      )
      break
    }

    case "customer.subscription.updated": {
      const tenantId = obj.metadata?.tenant_id as string | undefined
      if (!tenantId) break

      await supabase
        .from("subscriptions")
        .update({
          plan: mapPriceToPlan(obj.items?.data?.[0]?.price?.id),
          status: mapStatus(obj.status),
          current_period_start: toISO(obj.current_period_start),
          current_period_end: toISO(obj.current_period_end),
          cancel_at_period_end: obj.cancel_at_period_end ?? false,
        })
        .eq("tenant_id", tenantId)
      break
    }

    case "customer.subscription.deleted": {
      const tenantId = obj.metadata?.tenant_id as string | undefined
      if (!tenantId) break

      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("tenant_id", tenantId)
      break
    }

    case "invoice.payment_succeeded": {
      const subId = obj.subscription as string | undefined
      if (!subId) break

      await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("stripe_subscription_id", subId)
      break
    }

    case "invoice.payment_failed": {
      const subId = obj.subscription as string | undefined
      if (!subId) break

      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_subscription_id", subId)
      break
    }
  }

  return NextResponse.json({ received: true })
}

function toISO(ts: number | undefined): string | null {
  if (!ts) return null
  return new Date(ts * 1000).toISOString()
}

function mapPriceToPlan(priceId: string | undefined): string {
  if (!priceId) return "trial"
  if (priceId === process.env.STRIPE_PRICE_CONTROL) return "control"
  if (priceId === process.env.STRIPE_PRICE_OPERACIONES) return "operaciones"
  if (priceId === process.env.STRIPE_PRICE_GRUPO) return "grupo"
  return "control"
}

function mapStatus(status: string): string {
  const MAP: Record<string, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "unpaid",
    incomplete: "unpaid",
    incomplete_expired: "canceled",
    paused: "unpaid",
  }
  return MAP[status] ?? "active"
}
