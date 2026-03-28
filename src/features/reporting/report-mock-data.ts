// =============================================================================
// src/features/reporting/report-mock-data.ts — Mock data for reports
// =============================================================================
// TODO: Replace with real Supabase queries

export interface FoodCostRow {
  period: string // "2026-03" or "2026-W12"
  revenue: number
  food_cost: number
  food_cost_pct: number
  events: number
}

export interface PurchaseRow {
  supplier: string
  category: string
  product: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  date: string
  status: string
}

export interface ProfitabilityRow {
  event_name: string
  event_date: string
  event_type: string
  guests: number
  revenue: number
  theoretical_cost: number
  real_cost: number
  margin: number
  margin_pct: number
}

export interface WasteRow {
  date: string
  product: string
  quantity: number
  unit: string
  reason: string
  cost_per_unit: number
  total_cost: number
  recorded_by: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_FOOD_COST_REPORT: FoodCostRow[] = [
  {
    period: "Ene 2026",
    revenue: 48200,
    food_cost: 15424,
    food_cost_pct: 32.0,
    events: 8,
  },
  {
    period: "Feb 2026",
    revenue: 52100,
    food_cost: 15630,
    food_cost_pct: 30.0,
    events: 11,
  },
  {
    period: "Mar 2026",
    revenue: 61800,
    food_cost: 18540,
    food_cost_pct: 30.0,
    events: 14,
  },
  {
    period: "Abr 2026 (est)",
    revenue: 58000,
    food_cost: 17400,
    food_cost_pct: 30.0,
    events: 12,
  },
]

export const MOCK_PURCHASE_REPORT: PurchaseRow[] = [
  {
    supplier: "Carnes Premium García",
    category: "Carnes",
    product: "Lomo de ternera",
    quantity: 25,
    unit: "kg",
    unit_price: 18.5,
    total: 462.5,
    date: "2026-03-10",
    status: "Recibida",
  },
  {
    supplier: "Mariscos del Norte",
    category: "Pescados",
    product: "Salmón fresco",
    quantity: 15,
    unit: "kg",
    unit_price: 22.0,
    total: 330.0,
    date: "2026-03-11",
    status: "Recibida",
  },
  {
    supplier: "Verduras Ecológicas",
    category: "Verduras",
    product: "Tomates cherry",
    quantity: 20,
    unit: "kg",
    unit_price: 3.2,
    total: 64.0,
    date: "2026-03-12",
    status: "Recibida",
  },
  {
    supplier: "Lácteos Artesanos",
    category: "Lácteos",
    product: "Queso parmesano",
    quantity: 8,
    unit: "kg",
    unit_price: 24.5,
    total: 196.0,
    date: "2026-03-13",
    status: "Recibida",
  },
  {
    supplier: "Aceites del Sur",
    category: "Aceites",
    product: "AOVE virgen extra",
    quantity: 30,
    unit: "L",
    unit_price: 4.5,
    total: 135.0,
    date: "2026-03-14",
    status: "Enviada",
  },
  {
    supplier: "Carnes Premium García",
    category: "Carnes",
    product: "Entrecot de buey",
    quantity: 12,
    unit: "kg",
    unit_price: 32.0,
    total: 384.0,
    date: "2026-03-15",
    status: "Recibida",
  },
  {
    supplier: "Panadería Artesana",
    category: "Panadería",
    product: "Pan artesano",
    quantity: 50,
    unit: "ud",
    unit_price: 1.2,
    total: 60.0,
    date: "2026-03-16",
    status: "Recibida",
  },
]

export const MOCK_PROFITABILITY_REPORT: ProfitabilityRow[] = [
  {
    event_name: "Boda García-López",
    event_date: "2026-03-22",
    event_type: "Boda",
    guests: 180,
    revenue: 18000,
    theoretical_cost: 5400,
    real_cost: 5832,
    margin: 12168,
    margin_pct: 67.6,
  },
  {
    event_name: "Congreso Tech Summit",
    event_date: "2026-03-25",
    event_type: "Congreso",
    guests: 120,
    revenue: 8400,
    theoretical_cost: 2520,
    real_cost: 2604,
    margin: 5796,
    margin_pct: 69.0,
  },
  {
    event_name: "Cena Gala Premios",
    event_date: "2026-04-05",
    event_type: "Cena gala",
    guests: 90,
    revenue: 13500,
    theoretical_cost: 3645,
    real_cost: 3510,
    margin: 9990,
    margin_pct: 74.0,
  },
  {
    event_name: "Cóctel Empresa XYZ",
    event_date: "2026-04-12",
    event_type: "Cóctel",
    guests: 60,
    revenue: 3600,
    theoretical_cost: 1080,
    real_cost: 1134,
    margin: 2466,
    margin_pct: 68.5,
  },
]

export const MOCK_WASTE_REPORT: WasteRow[] = [
  {
    date: "2026-03-10",
    product: "Lomo de ternera",
    quantity: 1.2,
    unit: "kg",
    reason: "Deterioro",
    cost_per_unit: 18.5,
    total_cost: 22.2,
    recorded_by: "Chef García",
  },
  {
    date: "2026-03-11",
    product: "Salmón fresco",
    quantity: 0.8,
    unit: "kg",
    reason: "Caducidad",
    cost_per_unit: 22.0,
    total_cost: 17.6,
    recorded_by: "Chef García",
  },
  {
    date: "2026-03-13",
    product: "Nata para montar",
    quantity: 1.0,
    unit: "L",
    reason: "Accidente",
    cost_per_unit: 2.4,
    total_cost: 2.4,
    recorded_by: "Chef Martínez",
  },
  {
    date: "2026-03-14",
    product: "Tomates cherry",
    quantity: 2.5,
    unit: "kg",
    reason: "Caducidad",
    cost_per_unit: 3.2,
    total_cost: 8.0,
    recorded_by: "Chef García",
  },
  {
    date: "2026-03-15",
    product: "Queso parmesano",
    quantity: 0.3,
    unit: "kg",
    reason: "Exceso cocción",
    cost_per_unit: 24.5,
    total_cost: 7.35,
    recorded_by: "Chef Martínez",
  },
]
