"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/db/client"
import { useActiveRestaurant } from "@/lib/auth/hooks"

interface Subscription {
  plan: string
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string | null
}

export function useSubscription() {
  const { tenantId } = useActiveRestaurant()

  return useQuery<Subscription | null>({
    queryKey: ["subscription", tenantId],
    queryFn: async () => {
      if (!tenantId) return null

      const supabase = createClient()
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status, trial_ends_at, current_period_end, cancel_at_period_end, stripe_customer_id")
        .eq("tenant_id", tenantId)
        .single()

      return data
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 min
  })
}

export function useTrialDaysLeft(): number | null {
  const { data: subscription } = useSubscription()
  if (!subscription?.trial_ends_at) return null
  if (subscription.status !== "trialing") return null

  const now = new Date()
  const ends = new Date(subscription.trial_ends_at)
  const diff = Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(diff, 0)
}
