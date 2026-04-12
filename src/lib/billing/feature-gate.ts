/**
 * Feature gating by subscription plan.
 * Trial gets operaciones-level access to maximize conversion.
 */

type Plan = "trial" | "control" | "operaciones" | "grupo"

const PLAN_FEATURES: Record<Plan, Set<string>> = {
  trial: new Set([
    "recipes", "escandallo", "catalog", "suppliers", "inventory",
    "menus", "menu-engineering", "forecasting", "procurement",
    "invoice-ocr", "dashboard", "reports", "settings",
  ]),
  control: new Set([
    "recipes", "escandallo", "catalog", "suppliers", "inventory",
    "menus", "procurement", "dashboard", "reports", "settings",
  ]),
  operaciones: new Set([
    "recipes", "escandallo", "catalog", "suppliers", "inventory",
    "menus", "menu-engineering", "forecasting", "procurement",
    "invoice-ocr", "dashboard", "reports", "settings",
  ]),
  grupo: new Set([
    "recipes", "escandallo", "catalog", "suppliers", "inventory",
    "menus", "menu-engineering", "forecasting", "procurement",
    "invoice-ocr", "multi-local", "appcc", "compliance", "documents",
    "staffing", "dashboard", "reports", "settings", "api",
  ]),
}

export function canAccessFeature(plan: string, feature: string): boolean {
  const features = PLAN_FEATURES[plan as Plan]
  if (!features) return false
  return features.has(feature)
}

export function getRequiredPlan(feature: string): Plan | null {
  const plans: Plan[] = ["control", "operaciones", "grupo"]
  for (const plan of plans) {
    if (PLAN_FEATURES[plan].has(feature)) return plan
  }
  return null
}

export function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    trial: "Prueba gratuita",
    control: "Control",
    operaciones: "Operaciones",
    grupo: "Grupo",
  }
  return labels[plan] ?? plan
}
