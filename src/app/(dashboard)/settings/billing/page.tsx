"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useSubscription, useTrialDaysLeft } from "@/lib/billing/use-subscription"
import { getPlanLabel } from "@/lib/billing/feature-gate"
import { CreditCard, ExternalLink, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const PLANS = [
  {
    id: "control",
    name: "Control",
    price: "99",
    features: ["Recetas y escandallo", "Catálogo y proveedores", "Inventario FIFO", "Dashboard básico"],
  },
  {
    id: "operaciones",
    name: "Operaciones",
    price: "149",
    recommended: true,
    features: [
      "Todo de Control",
      "Menu engineering (Boston)",
      "Forecasting demanda",
      "OCR facturas (50/mes)",
      "Motor de compras",
    ],
  },
  {
    id: "grupo",
    name: "Grupo",
    price: "249",
    features: [
      "Todo de Operaciones",
      "Multi-local + benchmarking",
      "APPCC completo",
      "OCR facturas (300/mes)",
      "API abierta + SSO",
    ],
  },
]

export default function BillingPage() {
  const { data: subscription, isLoading } = useSubscription()
  const trialDays = useTrialDaysLeft()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  async function handleCheckout(plan: string) {
    setLoadingPlan(plan)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setLoadingPlan(null)
    }
  }

  async function handlePortal() {
    const res = await fetch("/api/billing/portal", { method: "POST" })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Cargando...</div>
  }

  const currentPlan = subscription?.plan ?? "trial"
  const status = subscription?.status ?? "trialing"

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          FACTURACIÓN
        </p>
        <h1 className="text-2xl font-bold text-foreground">Plan y suscripción</h1>
      </div>

      {/* Current plan card */}
      <div className="rounded-xl border border-border-subtle bg-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Plan {getPlanLabel(currentPlan)}
              </p>
              <p className="text-xs text-muted-foreground">
                {status === "trialing" && trialDays !== null && (
                  <span className="text-primary">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {trialDays} días restantes de prueba
                  </span>
                )}
                {status === "active" && "Suscripción activa"}
                {status === "past_due" && (
                  <span className="text-[var(--alert-warning)]">Pago pendiente</span>
                )}
                {status === "canceled" && (
                  <span className="text-muted-foreground">Cancelada</span>
                )}
              </p>
            </div>
          </div>
          {subscription?.stripe_customer_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              className="border-border-subtle"
            >
              Gestionar suscripción
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan
          const isUpgrade = !isCurrent && currentPlan !== "grupo"

          return (
            <div
              key={plan.id}
              className={cn(
                "rounded-xl border p-5 space-y-4",
                plan.recommended
                  ? "border-primary/40 bg-primary/5"
                  : "border-border-subtle bg-card",
                isCurrent && "ring-1 ring-primary"
              )}
            >
              <div>
                {plan.recommended && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">
                    RECOMENDADO
                  </p>
                )}
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="text-2xl font-bold text-foreground">
                  {plan.price}€
                  <span className="text-sm font-normal text-muted-foreground">/mes</span>
                </p>
              </div>

              <ul className="space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button
                  variant="outline"
                  className="w-full border-primary/30 text-primary"
                  disabled
                >
                  Plan actual
                </Button>
              ) : isUpgrade ? (
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  disabled={loadingPlan === plan.id}
                  onClick={() => handleCheckout(plan.id)}
                >
                  {loadingPlan === plan.id ? "Redirigiendo..." : "Elegir plan"}
                </Button>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
