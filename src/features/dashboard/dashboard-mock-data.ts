// TODO: Replace with Supabase aggregate queries once all modules are connected

export interface KpiMetric {
  label: string
  value: string
  subvalue?: string
  trend: number          // % change vs previous period (positive = good, negative = bad)
  trendInverted?: boolean // for cost metrics: lower is better
  icon: string           // lucide icon name as string (for display logic)
  color: "green" | "blue" | "muted" | "purple" | "red" | "yellow"
}

export interface AlertItem {
  id: string
  type: "critico" | "alerta" | "info"
  module: string
  message: string
  time: string
  href: string
}

export interface ChartPoint {
  label: string    // e.g. "Lun", "Mar", "Ene", "Feb"
  value: number
}

export interface ModuleStatus {
  name: string
  href: string
  icon: string
  status: "ok" | "warning" | "critical" | "inactive"
  statusLabel: string
  lastActivity: string
}

// ---- KPIs ----
export const DASHBOARD_KPIS: KpiMetric[] = [
  {
    label: "Ingresos del mes",
    value: "€124.380",
    subvalue: "vs €108.920 mes anterior",
    trend: 14.2,
    icon: "TrendingUp",
    color: "green",
  },
  {
    label: "Food Cost promedio",
    value: "28,4%",
    subvalue: "objetivo: ≤30%",
    trend: -1.8,
    trendInverted: true,
    icon: "ChefHat",
    color: "blue",
  },
  {
    label: "Reservas de grupo",
    value: "23",
    subvalue: "8 pendientes de confirmar",
    trend: 9.5,
    icon: "CalendarDays",
    color: "purple",
  },
  {
    label: "Pedidos en curso",
    value: "7",
    subvalue: "2 pendientes de recibir",
    trend: 0,
    icon: "ShoppingCart",
    color: "muted",
  },
  {
    label: "Controles APPCC hoy",
    value: "6 / 8",
    subvalue: "1 alerta activa",
    trend: 0,
    icon: "ShieldCheck",
    color: "yellow",
  },
  {
    label: "Alertas escandallo",
    value: "3",
    subvalue: "ingredientes con +5% precio",
    trend: 0,
    icon: "Calculator",
    color: "red",
  },
]

// ---- Revenue chart (last 7 days) ----
export const REVENUE_WEEK: ChartPoint[] = [
  { label: "L", value: 3820 },
  { label: "M", value: 4150 },
  { label: "X", value: 3600 },
  { label: "J", value: 5200 },
  { label: "V", value: 6800 },
  { label: "S", value: 7400 },
  { label: "D", value: 4100 },
]

// ---- Food cost trend (last 6 months) ----
export const FOOD_COST_TREND: ChartPoint[] = [
  { label: "Oct", value: 31.2 },
  { label: "Nov", value: 30.8 },
  { label: "Dic", value: 33.1 },
  { label: "Ene", value: 29.5 },
  { label: "Feb", value: 28.9 },
  { label: "Mar", value: 28.4 },
]

// ---- Alerts ----
export const DASHBOARD_ALERTS: AlertItem[] = [
  {
    id: "a1",
    type: "critico",
    module: "APPCC",
    message: "Cámara frigorífica #2 fuera de rango — 6,8°C (máx 5°C)",
    time: "Hace 2 horas",
    href: "/appcc",
  },
  {
    id: "a2",
    type: "alerta",
    module: "Escandallo",
    message: "Jamón ibérico +8,4% desde último albarán — revisar escandallo croquetas",
    time: "Hace 5 horas",
    href: "/escandallo",
  },
  {
    id: "a3",
    type: "alerta",
    module: "Personal",
    message: "3 turnos sin confirmar para 'Comida empresa — Grupo Inditex' (mañana)",
    time: "Hace 1 día",
    href: "/staffing",
  },
  {
    id: "a4",
    type: "alerta",
    module: "Aprovisionamiento",
    message: "Stock de aceite de oliva por debajo del mínimo (8L restantes)",
    time: "Hace 1 día",
    href: "/procurement/orders",
  },
  {
    id: "a5",
    type: "info",
    module: "Ingeniería de Menú",
    message: "'Soufflé de Grand Marnier' en zona Perro — considera revisarlo",
    time: "Hace 2 días",
    href: "/menu-engineering",
  },
  {
    id: "a6",
    type: "info",
    module: "Reservas",
    message: "Reserva VIP recibida: mesa para 8, viernes noche",
    time: "Hace 3 días",
    href: "/reservations",
  },
]

// ---- Module status ----
export const MODULE_STATUS: ModuleStatus[] = [
  { name: "APPCC", href: "/appcc", icon: "ShieldCheck", status: "critical", statusLabel: "1 crítico", lastActivity: "Hace 2h" },
  { name: "Escandallo", href: "/escandallo", icon: "Calculator", status: "warning", statusLabel: "3 alertas", lastActivity: "Hace 5h" },
  { name: "Personal", href: "/staffing", icon: "Users2", status: "warning", statusLabel: "Turnos pendientes", lastActivity: "Hace 1d" },
  { name: "Reservas", href: "/reservations", icon: "CalendarDays", status: "ok", statusLabel: "23 activas", lastActivity: "Hace 3h" },
  { name: "Aprovisionamiento", href: "/procurement/orders", icon: "ShoppingCart", status: "warning", statusLabel: "Stock bajo", lastActivity: "Hace 1d" },
  { name: "Recetas", href: "/recipes", icon: "ChefHat", status: "ok", statusLabel: "Al día", lastActivity: "Hace 2d" },
  { name: "Inventario", href: "/inventory/lots", icon: "Package", status: "ok", statusLabel: "Sin alertas", lastActivity: "Hace 4h" },
  { name: "Ingeniería Menú", href: "/menu-engineering", icon: "BarChart3", status: "ok", statusLabel: "Actualizado", lastActivity: "Hoy" },
]

// ---- Upcoming events ----
export interface UpcomingEvent {
  id: string
  name: string
  date: string
  guests: number
  status: "confirmado" | "pendiente" | "en_preparacion"
  staffConfirmed: number
  staffTotal: number
}

export const UPCOMING_EVENTS: UpcomingEvent[] = [
  { id: "e1", name: "Comida empresa — Grupo Inditex", date: "2026-03-29", guests: 25, status: "confirmado", staffConfirmed: 3, staffTotal: 3 },
  { id: "e2", name: "Cumpleaños — Reserva privada", date: "2026-04-02", guests: 18, status: "en_preparacion", staffConfirmed: 2, staffTotal: 3 },
  { id: "e3", name: "Cena maridaje — Bodega Zárate", date: "2026-04-05", guests: 30, status: "pendiente", staffConfirmed: 0, staffTotal: 2 },
  { id: "e4", name: "Comunión — Familia López", date: "2026-04-12", guests: 45, status: "pendiente", staffConfirmed: 0, staffTotal: 0 },
]
