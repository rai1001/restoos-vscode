import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { createServiceClient } from "@/lib/db/service"
import { createServerSupabaseClient } from "@/lib/db/server"
import { getCuisineTemplate } from "@/lib/onboarding/cuisine-templates"

/**
 * GET — Return current onboarding state for the user's tenant.
 * If user has no tenant yet, returns step 0 with empty data.
 */
export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = await createServerSupabaseClient()

  // Find the user's membership to get tenant_id
  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .limit(1)
    .single()

  if (!membership) {
    // New user — no tenant yet
    return NextResponse.json({
      step: 0,
      data: {},
      completed: false,
    })
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("onboarding_step, onboarding_data, onboarding_completed")
    .eq("id", membership.tenant_id)
    .single()

  return NextResponse.json({
    step: tenant?.onboarding_step ?? 0,
    data: tenant?.onboarding_data ?? {},
    completed: tenant?.onboarding_completed ?? false,
  })
}

/**
 * POST — Save step progress. Creates tenant if it doesn't exist yet (step 1).
 * Body: { step: number, data: Record<string, unknown> }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await request.json()
  const { step, data } = body as { step: number; data: Record<string, unknown> }

  if (typeof step !== "number" || step < 1 || step > 4) {
    return NextResponse.json({ error: "Step inválido" }, { status: 400 })
  }

  const service = createServiceClient()

  // Check if user already has a tenant
  const { data: membership } = await service
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .limit(1)
    .single()

  let tenantId: string

  if (!membership) {
    // First time — step 1 must provide restaurantName
    const restaurantName = data.restaurantName as string
    if (!restaurantName?.trim()) {
      return NextResponse.json({ error: "Nombre del restaurante obligatorio" }, { status: 400 })
    }

    // Create tenant
    const slug = restaurantName
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50)
      + "-" + Date.now().toString(36)

    const { data: newTenant, error: tenantErr } = await service
      .from("tenants")
      .insert({
        name: restaurantName.trim(),
        slug,
        onboarding_step: step,
        onboarding_data: data,
      })
      .select("id")
      .single()

    if (tenantErr || !newTenant) {
      return NextResponse.json({ error: "Error creando organización" }, { status: 500 })
    }

    tenantId = newTenant.id

    // Create hotel
    const hotelSlug = slug + "-local-1"
    const { data: newHotel, error: hotelErr } = await service
      .from("hotels")
      .insert({
        tenant_id: tenantId,
        name: restaurantName.trim(),
        slug: hotelSlug,
      })
      .select("id")
      .single()

    if (hotelErr || !newHotel) {
      return NextResponse.json({ error: "Error creando restaurante" }, { status: 500 })
    }

    // Create membership (admin)
    await service.from("memberships").insert({
      user_id: auth.user.id,
      hotel_id: newHotel.id,
      tenant_id: tenantId,
      role: "admin",
      is_active: true,
      is_default: true,
    })

    // Pre-load cuisine template categories if cuisine type provided
    const cuisineType = data.cuisineType as string
    if (cuisineType) {
      const template = getCuisineTemplate(cuisineType)
      if (template) {
        // Insert categories
        const categoryInserts = template.categories.map((name, idx) => ({
          hotel_id: newHotel.id,
          name,
          sort_order: idx,
        }))
        await service.from("categories").insert(categoryInserts)

        // Insert suppliers
        const supplierInserts = template.suppliers.map(s => ({
          hotel_id: newHotel.id,
          name: s.name,
          notes: s.type,
        }))
        await service.from("suppliers").insert(supplierInserts)
      }
    }
  } else {
    tenantId = membership.tenant_id

    // Update onboarding progress
    await service
      .from("tenants")
      .update({
        onboarding_step: step,
        onboarding_data: data,
      })
      .eq("id", tenantId)
  }

  return NextResponse.json({ ok: true, tenantId })
}

/**
 * PUT — Complete onboarding. Creates trial subscription.
 */
export async function PUT() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const service = createServiceClient()

  const { data: membership } = await service
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .limit(1)
    .single()

  if (!membership) {
    return NextResponse.json({ error: "No se encontró el restaurante" }, { status: 404 })
  }

  const tenantId = membership.tenant_id

  // Mark onboarding complete
  await service
    .from("tenants")
    .update({
      onboarding_completed: true,
      onboarding_step: 4,
    })
    .eq("id", tenantId)

  // Create trial subscription (7 days)
  const trialEnds = new Date()
  trialEnds.setDate(trialEnds.getDate() + 7)

  await service.from("subscriptions").upsert(
    {
      tenant_id: tenantId,
      plan: "trial",
      status: "trialing",
      trial_ends_at: trialEnds.toISOString(),
    },
    { onConflict: "tenant_id" }
  )

  return NextResponse.json({ ok: true })
}
