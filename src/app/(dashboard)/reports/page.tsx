"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  FileDown,
  Printer,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { exportCSV, printReport, formatCurrency, formatPercent } from "@/lib/reports"
import {
  MOCK_FOOD_COST_REPORT,
  MOCK_PURCHASE_REPORT,
  MOCK_PROFITABILITY_REPORT,
  MOCK_WASTE_REPORT,
} from "@/features/reporting/report-mock-data"
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  ReferenceArea,
} from "recharts"
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SERIES_COLORS,
  CHART_COLORS,
  CHART_THEME,
  CHART_MARGINS,
  formatCurrency as fmtCurrency,
  formatPercent as fmtPercent,
  formatKg,
} from "@/lib/chart-config"
import { cn } from "@/lib/utils"

// ─── Design tokens (Stitch Matte Kitchen) ─────────────────────────────────────

const T = {
  bg: "#0A0A0A",
  card: "#1A1A1A",
  cardHover: "#222222",
  primary: "#F97316",
  text: "#E5E2E1",
  secondary: "#A78B7D",
  ghostBorder: "rgba(88, 66, 55, 0.15)",
} as const

// ─── Chart mock data ──────────────────────────────────────────────────────────

const months = ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar"]

const foodCostMonthly = [
  { month: "Oct", Carnes: 4200, Pescados: 3100, Verduras: 1800, Lacteos: 1200, Otros: 900, foodCostPct: 31.2 },
  { month: "Nov", Carnes: 4500, Pescados: 2800, Verduras: 1950, Lacteos: 1350, Otros: 850, foodCostPct: 29.8 },
  { month: "Dic", Carnes: 5800, Pescados: 3600, Verduras: 2200, Lacteos: 1500, Otros: 1100, foodCostPct: 33.5 },
  { month: "Ene", Carnes: 3900, Pescados: 2600, Verduras: 1700, Lacteos: 1100, Otros: 780, foodCostPct: 28.4 },
  { month: "Feb", Carnes: 4100, Pescados: 2900, Verduras: 1850, Lacteos: 1250, Otros: 820, foodCostPct: 30.1 },
  { month: "Mar", Carnes: 4350, Pescados: 3200, Verduras: 2000, Lacteos: 1300, Otros: 900, foodCostPct: 29.6 },
]

const foodCost12M = [
  { month: "Abr", foodCostPct: 30.5 },
  { month: "May", foodCostPct: 29.2 },
  { month: "Jun", foodCostPct: 31.8 },
  { month: "Jul", foodCostPct: 32.1 },
  { month: "Ago", foodCostPct: 34.0 },
  { month: "Sep", foodCostPct: 30.9 },
  ...foodCostMonthly.map(d => ({ month: d.month, foodCostPct: d.foodCostPct })),
]

const purchaseBySupplier = [
  { month: "Oct", "Carnes Ruiz": 3800, "Pescados Galicia": 2900, "Huerta del Sol": 1600, "Lacteos Norte": 1100, "Distribuciones Marin": 750 },
  { month: "Nov", "Carnes Ruiz": 4100, "Pescados Galicia": 2600, "Huerta del Sol": 1750, "Lacteos Norte": 1200, "Distribuciones Marin": 820 },
  { month: "Dic", "Carnes Ruiz": 5200, "Pescados Galicia": 3400, "Huerta del Sol": 2100, "Lacteos Norte": 1400, "Distribuciones Marin": 1050 },
  { month: "Ene", "Carnes Ruiz": 3600, "Pescados Galicia": 2400, "Huerta del Sol": 1500, "Lacteos Norte": 1000, "Distribuciones Marin": 680 },
  { month: "Feb", "Carnes Ruiz": 3900, "Pescados Galicia": 2700, "Huerta del Sol": 1650, "Lacteos Norte": 1150, "Distribuciones Marin": 750 },
  { month: "Mar", "Carnes Ruiz": 4050, "Pescados Galicia": 3000, "Huerta del Sol": 1800, "Lacteos Norte": 1200, "Distribuciones Marin": 800 },
]

const purchaseByCategory = [
  { name: "Carnes", value: 24650 },
  { name: "Pescados", value: 17000 },
  { name: "Verduras", value: 10400 },
  { name: "Lacteos", value: 7050 },
  { name: "Otros", value: 4850 },
]

const profitabilityMonthly = [
  { month: "Oct", ingresos: 35800, margenPct: 62.4 },
  { month: "Nov", ingresos: 38500, margenPct: 65.1 },
  { month: "Dic", ingresos: 52000, margenPct: 58.3 },
  { month: "Ene", ingresos: 31200, margenPct: 67.8 },
  { month: "Feb", ingresos: 36100, margenPct: 64.2 },
  { month: "Mar", ingresos: 39700, margenPct: 66.0 },
]

const topDishes = [
  { name: "Chuleton Vaca Vieja", margen: 18.50 },
  { name: "Lubina al Horno", margen: 16.20 },
  { name: "Solomillo Wellington", margen: 15.80 },
  { name: "Pulpo a la Gallega", margen: 14.90 },
  { name: "Risotto de Setas", margen: 13.60 },
  { name: "Tataki de Atun", margen: 12.40 },
  { name: "Cochinillo Asado", margen: 11.80 },
  { name: "Merluza en Salsa", margen: 10.50 },
  { name: "Paella Mixta", margen: 9.70 },
  { name: "Tarta de Queso", margen: 8.90 },
].reverse()

const wasteDaily = [
  { dia: "Lun", kg: 4.2 },
  { dia: "Mar", kg: 3.8 },
  { dia: "Mie", kg: 5.1 },
  { dia: "Jue", kg: 3.5 },
  { dia: "Vie", kg: 6.8 },
  { dia: "Sab", kg: 8.2 },
  { dia: "Dom", kg: 7.1 },
  { dia: "Lun2", kg: 3.9 },
  { dia: "Mar2", kg: 4.4 },
  { dia: "Mie2", kg: 5.6 },
  { dia: "Jue2", kg: 3.2 },
  { dia: "Vie2", kg: 7.0 },
  { dia: "Sab2", kg: 9.1 },
  { dia: "Dom2", kg: 6.5 },
]

const wasteByStation = [
  { name: "Partida Caliente", kg: 28.5 },
  { name: "Partida Fria", kg: 18.2 },
  { name: "Pasteleria", kg: 12.8 },
  { name: "Cuarto Frio", kg: 9.4 },
  { name: "Economato", kg: 6.3 },
  { name: "Plonge", kg: 3.1 },
].reverse()

// Pareto de Mermas data (horizontal bars by category with percentages)
const paretoMermas = [
  { name: "Carnes", pct: 32, value: 2450 },
  { name: "Pescados", pct: 24, value: 1840 },
  { name: "Verduras", pct: 18, value: 1380 },
  { name: "Lacteos", pct: 14, value: 1072 },
  { name: "Panaderia", pct: 8, value: 614 },
  { name: "Otros", pct: 4, value: 307 },
]

// Menu engineering table data
const menuEngineering = [
  { plato: "Chuleton Vaca Vieja", categoria: "Estrella", ventas: 245, costeUnit: 12.80, precioVta: 38.00, margenPct: 66.3 },
  { plato: "Lubina al Horno", categoria: "Estrella", ventas: 198, costeUnit: 8.50, precioVta: 28.00, margenPct: 69.6 },
  { plato: "Solomillo Wellington", categoria: "Puzzle", ventas: 87, costeUnit: 15.20, precioVta: 42.00, margenPct: 63.8 },
  { plato: "Pulpo a la Gallega", categoria: "Caballo", ventas: 312, costeUnit: 9.40, precioVta: 22.00, margenPct: 57.3 },
  { plato: "Risotto de Setas", categoria: "Estrella", ventas: 176, costeUnit: 4.20, precioVta: 18.00, margenPct: 76.7 },
  { plato: "Tataki de Atun", categoria: "Puzzle", ventas: 65, costeUnit: 11.60, precioVta: 26.00, margenPct: 55.4 },
  { plato: "Cochinillo Asado", categoria: "Caballo", ventas: 289, costeUnit: 10.80, precioVta: 24.00, margenPct: 55.0 },
  { plato: "Merluza en Salsa", categoria: "Perro", ventas: 42, costeUnit: 7.90, precioVta: 19.00, margenPct: 58.4 },
]

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

const DONUT_COLORS = [
  CHART_COLORS.blue,
  CHART_COLORS.red,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.orange,
]

const darkTooltipStyle = {
  backgroundColor: T.card,
  border: `1px solid ${T.ghostBorder}`,
  borderRadius: "8px",
  color: T.text,
  fontSize: "12px",
}

const darkAxisStyle = { fill: T.secondary, fontSize: 11 }
const darkGridProps = { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.06)" }

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">
      {children}
    </h2>
  )
}

// ─── Food Cost % Badge ────────────────────────────────────────────────────────

function FoodCostBadge({ pct }: { pct: number }) {
  if (pct <= 30)
    return (
      <span className="inline-flex items-center rounded-full bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-400">
        {formatPercent(pct)}
      </span>
    )
  if (pct <= 35)
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-900/30 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
        {formatPercent(pct)}
      </span>
    )
  return (
    <span className="inline-flex items-center rounded-full bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-400">
      {formatPercent(pct)}
    </span>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isReceived = status === "Recibida"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        isReceived
          ? "bg-green-900/30 text-green-400"
          : "bg-amber-900/30 text-amber-400"
      )}
    >
      {status}
    </span>
  )
}

// ─── Category Badge ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Estrella: "bg-green-900/30 text-green-400",
  Caballo: "bg-blue-900/30 text-blue-400",
  Puzzle: "bg-amber-900/30 text-amber-400",
  Perro: "bg-red-900/30 text-red-400",
}

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", CATEGORY_COLORS[cat] ?? "bg-[#2A2A2A] text-[#A78B7D]")}>
      {cat}
    </span>
  )
}

// ─── Margin color helper ──────────────────────────────────────────────────────

function marginColor(pct: number) {
  if (pct >= 65) return "text-green-400"
  if (pct >= 55) return "text-amber-400"
  return "text-red-400"
}

// ─── KPI Card (Stitch Matte with 4px left border) ───────────────────────────

function KpiCard({
  title,
  value,
  sub,
  borderColor = "border-l-orange-500",
}: {
  title: string
  value: string
  sub?: string
  borderColor?: string
}) {
  return (
    <div className={cn("rounded-lg border-l-4 bg-[#1A1A1A] p-4 transition-colors hover:bg-[#222222]", borderColor)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">
        {title}
      </p>
      <p className="mt-1 text-2xl font-bold text-[#E5E2E1]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#A78B7D]">{sub}</p>}
    </div>
  )
}

// ─── Stitch Matte Card Wrapper ──────────────────────────────────────────────

function MCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg bg-[#1A1A1A] p-5", className)}>
      {children}
    </div>
  )
}

function MCardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-sm font-semibold text-[#E5E2E1]">{children}</h3>
  )
}

// ─── Hallazgo Card ──────────────────────────────────────────────────────────

function HallazgoCard({
  title,
  description,
  type,
}: {
  title: string
  description: string
  type: "opportunity" | "warning" | "optimization"
}) {
  const borderMap = {
    opportunity: "border-l-green-500",
    warning: "border-l-orange-500",
    optimization: "border-l-blue-500",
  }
  const iconMap = {
    opportunity: <Lightbulb className="h-4 w-4 text-green-400" />,
    warning: <AlertTriangle className="h-4 w-4 text-orange-400" />,
    optimization: <BarChart3 className="h-4 w-4 text-blue-400" />,
  }
  return (
    <div className={cn("rounded-lg border-l-4 bg-[#1A1A1A] p-4", borderMap[type])}>
      <div className="flex items-start gap-2">
        {iconMap[type]}
        <div>
          <p className="text-sm font-semibold text-[#E5E2E1]">{title}</p>
          <p className="mt-0.5 text-xs text-[#A78B7D]">{description}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Period Selector (UI only) ────────────────────────────────────────────────

const PERIODS = ["Este mes", "Ultimo trimestre", "Este ano", "Personalizado"]

function PeriodSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="print:hidden h-9 rounded-md border border-[rgba(88,66,55,0.15)] bg-[#1A1A1A] px-3 py-1 text-sm text-[#E5E2E1] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#F97316]"
    >
      {PERIODS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  )
}

// =============================================================================
// Main Page
// =============================================================================

export default function ReportsPage() {
  const [period, setPeriod] = useState("Este mes")
  const [foodCostRange, setFoodCostRange] = useState<"6m" | "12m">("6m")

  // ─── Food Cost derived values ──────────────────────────────────────────────
  const totalRevenue = MOCK_FOOD_COST_REPORT.reduce((s, r) => s + r.revenue, 0)
  const totalFoodCost = MOCK_FOOD_COST_REPORT.reduce((s, r) => s + r.food_cost, 0)
  const avgFoodCostPct =
    MOCK_FOOD_COST_REPORT.reduce((s, r) => s + r.food_cost_pct, 0) /
    MOCK_FOOD_COST_REPORT.length
  const totalEvents = MOCK_FOOD_COST_REPORT.reduce((s, r) => s + r.events, 0)

  // ─── Purchases derived values ──────────────────────────────────────────────
  const totalPurchasesAmount = MOCK_PURCHASE_REPORT.reduce(
    (s, r) => s + r.total,
    0
  )
  const uniqueSuppliers = new Set(MOCK_PURCHASE_REPORT.map((r) => r.supplier))
    .size
  const categoryTotals = MOCK_PURCHASE_REPORT.reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + r.total
      return acc
    },
    {}
  )
  const topCategory = Object.entries(categoryTotals).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0] ?? "—"

  // ─── Profitability derived values ──────────────────────────────────────────
  const totalProfRevenue = MOCK_PROFITABILITY_REPORT.reduce(
    (s, r) => s + r.revenue,
    0
  )
  const totalProfCost = MOCK_PROFITABILITY_REPORT.reduce(
    (s, r) => s + r.real_cost,
    0
  )
  const avgMarginPct =
    MOCK_PROFITABILITY_REPORT.reduce((s, r) => s + r.margin_pct, 0) /
    MOCK_PROFITABILITY_REPORT.length
  const bestEvent = MOCK_PROFITABILITY_REPORT.reduce((best, r) =>
    r.margin_pct > best.margin_pct ? r : best
  )

  // ─── Waste derived values ──────────────────────────────────────────────────
  const totalWasteCost = MOCK_WASTE_REPORT.reduce(
    (s, r) => s + r.total_cost,
    0
  )
  const reasonCounts = MOCK_WASTE_REPORT.reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.reason] = (acc[r.reason] ?? 0) + 1
      return acc
    },
    {}
  )
  const topReason =
    Object.entries(reasonCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—"
  const productWaste = MOCK_WASTE_REPORT.reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.product] = (acc[r.product] ?? 0) + r.total_cost
      return acc
    },
    {}
  )
  const topWasteProduct =
    Object.entries(productWaste).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—"

  // Gross margin
  const grossMarginPct = totalRevenue > 0 ? ((totalRevenue - totalFoodCost) / totalRevenue * 100) : 0
  // Average ticket
  const avgTicket = totalEvents > 0 ? totalRevenue / totalEvents : 0

  // ─── CSV export functions ──────────────────────────────────────────────────
  function exportFoodCostCSV() {
    exportCSV(
      "food-cost",
      ["Periodo", "Ingresos", "Coste alimentacion", "Food Cost %", "Eventos"],
      MOCK_FOOD_COST_REPORT.map((r) => [
        r.period,
        r.revenue,
        r.food_cost,
        formatPercent(r.food_cost_pct),
        r.events,
      ])
    )
  }

  function exportPurchasesCSV() {
    exportCSV(
      "compras",
      [
        "Proveedor",
        "Categoria",
        "Producto",
        "Cantidad",
        "Unidad",
        "Precio unit.",
        "Total",
        "Fecha",
        "Estado",
      ],
      MOCK_PURCHASE_REPORT.map((r) => [
        r.supplier,
        r.category,
        r.product,
        r.quantity,
        r.unit,
        r.unit_price,
        r.total,
        r.date,
        r.status,
      ])
    )
  }

  function exportProfitabilityCSV() {
    exportCSV(
      "rentabilidad",
      [
        "Evento",
        "Fecha",
        "Tipo",
        "Comensales",
        "Ingresos",
        "Coste teorico",
        "Coste real",
        "Margen",
        "Margen %",
      ],
      MOCK_PROFITABILITY_REPORT.map((r) => [
        r.event_name,
        r.event_date,
        r.event_type,
        r.guests,
        r.revenue,
        r.theoretical_cost,
        r.real_cost,
        r.margin,
        formatPercent(r.margin_pct),
      ])
    )
  }

  function exportWasteCSV() {
    exportCSV(
      "mermas",
      [
        "Fecha",
        "Producto",
        "Cantidad",
        "Unidad",
        "Motivo",
        "Coste unit.",
        "Perdida total",
        "Registrado por",
      ],
      MOCK_WASTE_REPORT.map((r) => [
        r.date,
        r.product,
        r.quantity,
        r.unit,
        r.reason,
        r.cost_per_unit,
        r.total_cost,
        r.recorded_by,
      ])
    )
  }

  // ─── Supplier keys for purchase chart ──────────────────────────────────────
  const supplierKeys = ["Carnes Ruiz", "Pescados Galicia", "Huerta del Sol", "Lacteos Norte", "Distribuciones Marin"]

  // Food cost chart data based on range
  const foodCostLineData = foodCostRange === "6m"
    ? foodCostMonthly.map(d => ({ month: d.month, foodCostPct: d.foodCostPct }))
    : foodCost12M

  return (
    <div className="flex flex-col gap-6 p-6" style={{ backgroundColor: T.bg, minHeight: "100vh" }}>
      {/* -- Page header (Stitch Matte) -- */}
      <div className="flex flex-col gap-1 print:hidden">
        <SectionLabel>CUADRO DE MANDO Y GESTION</SectionLabel>
        <h1 className="text-3xl font-bold tracking-tight text-[#E5E2E1]">
          Informes y Analitica
        </h1>
      </div>

      {/* -- Print-only title -- */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-[#E5E2E1]">RestoOS — Informes y Analitica</h1>
        <p className="text-sm text-[#A78B7D]">
          Periodo: {period}
        </p>
      </div>

      {/* -- Toolbar: date selector + export -- */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-[#1A1A1A] px-3 py-2">
            <button className="text-[#A78B7D] hover:text-[#E5E2E1] transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-[#E5E2E1] min-w-[120px] text-center">
              Octubre 2023
            </span>
            <button className="text-[#A78B7D] hover:text-[#E5E2E1] transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <button
          onClick={() => printReport("Informes")}
          className="flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#EA6C0E]"
        >
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </button>
      </div>

      {/* -- Tabs -- */}
      <Tabs defaultValue="food-cost" className="w-full">
        <TabsList className="print:hidden mb-4 bg-[#1A1A1A] border border-[rgba(88,66,55,0.15)]">
          <TabsTrigger value="food-cost" className="gap-2 data-[state=active]:bg-[#F97316] data-[state=active]:text-white text-[#A78B7D]">
            <TrendingUp className="h-4 w-4" />
            Food Cost
          </TabsTrigger>
          <TabsTrigger value="purchases" className="gap-2 data-[state=active]:bg-[#F97316] data-[state=active]:text-white text-[#A78B7D]">
            <ShoppingCart className="h-4 w-4" />
            Compras
          </TabsTrigger>
          <TabsTrigger value="profitability" className="gap-2 data-[state=active]:bg-[#F97316] data-[state=active]:text-white text-[#A78B7D]">
            <BarChart3 className="h-4 w-4" />
            Rentabilidad
          </TabsTrigger>
          <TabsTrigger value="waste" className="gap-2 data-[state=active]:bg-[#F97316] data-[state=active]:text-white text-[#A78B7D]">
            <Trash2 className="h-4 w-4" />
            Mermas
          </TabsTrigger>
        </TabsList>

        {/* ================================================================
            TAB: Food Cost
        ================================================================ */}
        <TabsContent value="food-cost" className="space-y-6 print:block">
          {/* Print section title */}
          <h2 className="hidden print:block text-lg font-semibold mb-2 text-[#E5E2E1]">
            Informe Food Cost
          </h2>

          {/* 4 KPI cards in row with colored left borders */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard
              title="Margen Bruto"
              value={formatPercent(grossMarginPct)}
              sub="vs 65% objetivo"
              borderColor="border-l-green-500"
            />
            <KpiCard
              title="Ventas Netas"
              value={`€${(totalRevenue / 1000).toFixed(0)}k`}
              sub="Periodo seleccionado"
              borderColor="border-l-blue-500"
            />
            <KpiCard
              title="Food Cost Actual"
              value={formatPercent(avgFoodCostPct)}
              sub="Objetivo: <= 30%"
              borderColor="border-l-orange-500"
            />
            <KpiCard
              title="Ticket Medio"
              value={`€${avgTicket.toFixed(2)}`}
              sub={`${totalEvents} eventos`}
              borderColor="border-l-purple-500"
            />
          </div>

          {/* Evolucion Food Cost line chart with reference areas + period tabs */}
          <MCard>
            <div className="flex items-center justify-between mb-4">
              <MCardTitle>Evolucion Food Cost (%)</MCardTitle>
              <div className="flex gap-1">
                <button
                  onClick={() => setFoodCostRange("6m")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors",
                    foodCostRange === "6m"
                      ? "bg-[#F97316] text-white"
                      : "bg-[#2A2A2A] text-[#A78B7D] hover:text-[#E5E2E1]"
                  )}
                >
                  6 Meses
                </button>
                <button
                  onClick={() => setFoodCostRange("12m")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors",
                    foodCostRange === "12m"
                      ? "bg-[#F97316] text-white"
                      : "bg-[#2A2A2A] text-[#A78B7D] hover:text-[#E5E2E1]"
                  )}
                >
                  12 Meses
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={foodCostLineData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={T.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...darkGridProps} />
                <XAxis dataKey="month" tick={darkAxisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={darkAxisStyle} axisLine={false} tickLine={false} domain={[25, 40]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip contentStyle={darkTooltipStyle} formatter={((value: number) => [`${value.toFixed(1)}%`, "Food Cost"]) as any} />
                <ReferenceArea y1={25} y2={30} fill="#1D9E75" fillOpacity={0.08} />
                <ReferenceArea y1={35} y2={40} fill="#E24B4A" fillOpacity={0.08} />
                <Area type="monotone" dataKey="foodCostPct" stroke={T.primary} strokeWidth={2.5} fill="url(#fcGrad)" dot={{ fill: T.primary, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="Food Cost %" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center gap-4 text-[10px] text-[#A78B7D]">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500/40" /> &lt;30% Optimo</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500/40" /> &gt;35% Alerta</span>
            </div>
          </MCard>

          {/* Two-col: Pareto de Mermas + Alerta de Control */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Pareto de Mermas */}
            <MCard>
              <MCardTitle>Pareto de Mermas</MCardTitle>
              <div className="space-y-3">
                {paretoMermas.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-[#A78B7D] text-right">{item.name}</span>
                    <div className="flex-1 h-6 rounded bg-[#2A2A2A] relative overflow-hidden">
                      <div
                        className="h-full rounded bg-gradient-to-r from-[#F97316] to-[#F97316]/60"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-xs font-semibold text-[#E5E2E1] text-right">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </MCard>

            {/* Alerta de Control */}
            <MCard className="border border-orange-500/20">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-400">
                  Alerta de Control
                </h3>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-[#2A2A2A] p-3">
                  <p className="text-xs font-semibold text-[#E5E2E1]">Food Cost por encima del objetivo</p>
                  <p className="text-xs text-[#A78B7D] mt-1">El food cost actual ({formatPercent(avgFoodCostPct)}) supera el objetivo del 30%. Revisar costes de carnes y pescados.</p>
                </div>
                <div className="rounded-lg bg-[#2A2A2A] p-3">
                  <p className="text-xs font-semibold text-[#E5E2E1]">Merma elevada en fin de semana</p>
                  <p className="text-xs text-[#A78B7D] mt-1">Las mermas del sabado superan los 8kg. Ajustar previsiones de produccion para servicio de fin de semana.</p>
                </div>
                <div className="rounded-lg bg-[#2A2A2A] p-3">
                  <p className="text-xs font-semibold text-[#E5E2E1]">Variacion en coste de proveedores</p>
                  <p className="text-xs text-[#A78B7D] mt-1">Carnes Ruiz ha incrementado precios un 5.2% en diciembre. Evaluar alternativas.</p>
                </div>
              </div>
            </MCard>
          </div>

          {/* Food Cost Stacked Bar + Line Chart */}
          <MCard>
            <MCardTitle>Desglose mensual de coste alimentario por categoria</MCardTitle>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={foodCostMonthly} margin={CHART_MARGINS.withLegend}>
                <CartesianGrid {...darkGridProps} />
                <XAxis dataKey="month" tick={darkAxisStyle} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={darkAxisStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtCurrency(v)} />
                <YAxis yAxisId="right" orientation="right" tick={darkAxisStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[25, 40]} />
                <Tooltip contentStyle={darkTooltipStyle} formatter={((value: number, name: string) => name === "foodCostPct" ? [fmtPercent(value), "Food Cost %"] : [fmtCurrency(value), name]) as any} />
                <Legend iconType="square" wrapperStyle={{ fontSize: 11, color: T.secondary }} />
                <Bar yAxisId="left" dataKey="Carnes" stackId="cost" fill={SERIES_COLORS[0]} radius={[0, 0, 0, 0]} />
                <Bar yAxisId="left" dataKey="Pescados" stackId="cost" fill={SERIES_COLORS[1]} />
                <Bar yAxisId="left" dataKey="Verduras" stackId="cost" fill={SERIES_COLORS[2]} />
                <Bar yAxisId="left" dataKey="Lacteos" stackId="cost" fill={SERIES_COLORS[3]} />
                <Bar yAxisId="left" dataKey="Otros" stackId="cost" fill={SERIES_COLORS[4]} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="foodCostPct" stroke="#ffffff" strokeWidth={2} dot={{ fill: "#ffffff", r: 4 }} name="Food Cost %" />
              </ComposedChart>
            </ResponsiveContainer>
          </MCard>

          {/* Comparativa Ventas vs Objetivos */}
          <MCard>
            <MCardTitle>Comparativa Ventas vs Objetivos</MCardTitle>
            <div className="flex items-end gap-6">
              <div>
                <p className="text-4xl font-bold text-[#E5E2E1]">€{(totalRevenue).toLocaleString("es-ES")}</p>
                <p className="mt-1 text-xs text-[#A78B7D]">Ventas acumuladas del periodo</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-green-900/30 px-3 py-1">
                <ArrowUpRight className="h-3.5 w-3.5 text-green-400" />
                <span className="text-sm font-semibold text-green-400">+8.5% vs Plan</span>
              </div>
            </div>
          </MCard>

          {/* Hallazgos Operativos */}
          <div>
            <SectionLabel>Hallazgos Operativos</SectionLabel>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <HallazgoCard
                type="opportunity"
                title="Oportunidad en Risotto"
                description="Alto margen (76.7%) y buena demanda. Considerar promover en menu degustacion."
              />
              <HallazgoCard
                type="warning"
                title="Food Cost Diciembre"
                description="Pico de 33.5% por incremento estacional. Planificar negociacion con proveedores."
              />
              <HallazgoCard
                type="optimization"
                title="Optimizar Partida Caliente"
                description="Representa el 36% de las mermas totales. Revisar porciones y mise en place."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={exportFoodCostCSV}
              className="flex items-center gap-2 rounded-lg border border-[rgba(88,66,55,0.15)] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-[#A78B7D] transition-colors hover:bg-[#222222] hover:text-[#E5E2E1]"
            >
              <FileDown className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
            <button
              onClick={() => printReport("Food Cost")}
              className="flex items-center gap-2 rounded-lg border border-[rgba(88,66,55,0.15)] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-[#A78B7D] transition-colors hover:bg-[#222222] hover:text-[#E5E2E1]"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir PDF
            </button>
          </div>

          {/* Table */}
          <MCard className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[rgba(88,66,55,0.15)] hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Periodo</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Ingresos</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Coste alim.</TableHead>
                  <TableHead className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Food cost %</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Eventos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_FOOD_COST_REPORT.map((row) => (
                  <TableRow key={row.period} className="border-b border-[rgba(88,66,55,0.08)] hover:bg-[#222222]">
                    <TableCell className="font-medium text-[#E5E2E1]">{row.period}</TableCell>
                    <TableCell className="text-right text-[#E5E2E1]">
                      {formatCurrency(row.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-[#E5E2E1]">
                      {formatCurrency(row.food_cost)}
                    </TableCell>
                    <TableCell className="text-center">
                      <FoodCostBadge pct={row.food_cost_pct} />
                    </TableCell>
                    <TableCell className="text-right text-[#A78B7D]">{row.events}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MCard>

          {/* Ingenieria de Menu (Profitability Matrix) */}
          <div>
            <SectionLabel>Ingenieria de Menu (Matriz de Rentabilidad)</SectionLabel>
            <MCard className="mt-3 p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[rgba(88,66,55,0.15)] hover:bg-transparent">
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Plato</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Categoria</TableHead>
                    <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Ventas (uds)</TableHead>
                    <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Coste Unit</TableHead>
                    <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Precio VTA</TableHead>
                    <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Margen %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuEngineering.map((row) => (
                    <TableRow key={row.plato} className="border-b border-[rgba(88,66,55,0.08)] hover:bg-[#222222]">
                      <TableCell className="font-medium text-[#E5E2E1]">{row.plato}</TableCell>
                      <TableCell><CategoryBadge cat={row.categoria} /></TableCell>
                      <TableCell className="text-right text-[#E5E2E1]">{row.ventas}</TableCell>
                      <TableCell className="text-right text-[#A78B7D]">€{row.costeUnit.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-[#E5E2E1]">€{row.precioVta.toFixed(2)}</TableCell>
                      <TableCell className={cn("text-right font-semibold", marginColor(row.margenPct))}>
                        {row.margenPct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </MCard>
          </div>
        </TabsContent>

        {/* ================================================================
            TAB: Purchases
        ================================================================ */}
        <TabsContent value="purchases" className="space-y-6 print:block">
          <h2 className="hidden print:block text-lg font-semibold mb-2 text-[#E5E2E1]">
            Informe Compras
          </h2>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard
              title="Total pedidos"
              value={String(MOCK_PURCHASE_REPORT.length)}
              sub="Lineas de compra"
              borderColor="border-l-blue-500"
            />
            <KpiCard
              title="Importe total"
              value={formatCurrency(totalPurchasesAmount)}
              sub="Periodo seleccionado"
              borderColor="border-l-green-500"
            />
            <KpiCard
              title="Proveedores"
              value={String(uniqueSuppliers)}
              sub="Proveedores activos"
              borderColor="border-l-purple-500"
            />
            <KpiCard
              title="Top categoria"
              value={topCategory}
              sub={formatCurrency(categoryTotals[topCategory] ?? 0)}
              borderColor="border-l-orange-500"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Bar Chart: purchases by supplier */}
            <MCard>
              <MCardTitle>Volumen mensual por proveedor (Top 5)</MCardTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={purchaseBySupplier} margin={CHART_MARGINS.withLegend}>
                  <CartesianGrid {...darkGridProps} />
                  <XAxis dataKey="month" tick={darkAxisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={darkAxisStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtCurrency(v)} />
                  <Tooltip contentStyle={darkTooltipStyle} formatter={((value: number) => [fmtCurrency(value), undefined]) as any} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: 11, color: T.secondary }} />
                  {supplierKeys.map((key, i) => (
                    <Bar key={key} dataKey={key} fill={DONUT_COLORS[i % DONUT_COLORS.length]} radius={i === supplierKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </MCard>

            {/* Donut Chart: by category */}
            <MCard>
              <MCardTitle>Distribucion de compras por categoria</MCardTitle>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={purchaseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {purchaseByCategory.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={darkTooltipStyle} formatter={((value: number) => [fmtCurrency(value), undefined]) as any} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: T.secondary }} />
                </PieChart>
              </ResponsiveContainer>
            </MCard>
          </div>

          {/* Actions */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={exportPurchasesCSV}
              className="flex items-center gap-2 rounded-lg border border-[rgba(88,66,55,0.15)] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-[#A78B7D] transition-colors hover:bg-[#222222] hover:text-[#E5E2E1]"
            >
              <FileDown className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
            <button
              onClick={() => printReport("Compras")}
              className="flex items-center gap-2 rounded-lg border border-[rgba(88,66,55,0.15)] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-[#A78B7D] transition-colors hover:bg-[#222222] hover:text-[#E5E2E1]"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir PDF
            </button>
          </div>

          {/* Table */}
          <MCard className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[rgba(88,66,55,0.15)] hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Proveedor</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Categoria</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Producto</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Cantidad</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Ud.</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">P. unit.</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Total</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Fecha</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_PURCHASE_REPORT.map((row, i) => (
                  <TableRow key={i} className="border-b border-[rgba(88,66,55,0.08)] hover:bg-[#222222]">
                    <TableCell className="font-medium text-[#E5E2E1]">
                      {row.supplier}
                    </TableCell>
                    <TableCell className="text-[#A78B7D]">{row.category}</TableCell>
                    <TableCell className="text-[#E5E2E1]">{row.product}</TableCell>
                    <TableCell className="text-right text-[#E5E2E1]">{row.quantity}</TableCell>
                    <TableCell className="text-[#A78B7D]">{row.unit}</TableCell>
                    <TableCell className="text-right text-[#A78B7D]">
                      {formatCurrency(row.unit_price)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-[#E5E2E1]">
                      {formatCurrency(row.total)}
                    </TableCell>
                    <TableCell className="text-sm text-[#A78B7D]">
                      {row.date}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MCard>
        </TabsContent>

        {/* ================================================================
            TAB: Profitability
        ================================================================ */}
        <TabsContent value="profitability" className="space-y-6 print:block">
          <h2 className="hidden print:block text-lg font-semibold mb-2 text-[#E5E2E1]">
            Informe Rentabilidad por Evento
          </h2>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard
              title="Ingresos totales"
              value={formatCurrency(totalProfRevenue)}
              sub="Todos los eventos"
              borderColor="border-l-green-500"
            />
            <KpiCard
              title="Coste total"
              value={formatCurrency(totalProfCost)}
              sub="Coste real acumulado"
              borderColor="border-l-red-500"
            />
            <KpiCard
              title="Margen medio"
              value={formatPercent(avgMarginPct)}
              sub="Sobre ingresos totales"
              borderColor="border-l-blue-500"
            />
            <KpiCard
              title="Mejor evento"
              value={bestEvent.event_name}
              sub={`Margen: ${formatPercent(bestEvent.margin_pct)}`}
              borderColor="border-l-purple-500"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Revenue + Margin ComposedChart */}
            <MCard>
              <MCardTitle>Ingresos mensuales y margen %</MCardTitle>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={profitabilityMonthly} margin={CHART_MARGINS.withLegend}>
                  <CartesianGrid {...darkGridProps} />
                  <XAxis dataKey="month" tick={darkAxisStyle} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={darkAxisStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtCurrency(v)} />
                  <YAxis yAxisId="right" orientation="right" tick={darkAxisStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[50, 75]} />
                  <Tooltip contentStyle={darkTooltipStyle} formatter={((value: number, name: string) => name === "margenPct" ? [fmtPercent(value), "Margen %"] : [fmtCurrency(value), "Ingresos"]) as any} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: 11, color: T.secondary }} />
                  <Bar yAxisId="left" dataKey="ingresos" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} name="Ingresos" />
                  <Line yAxisId="right" type="monotone" dataKey="margenPct" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ fill: CHART_COLORS.green, r: 4 }} name="Margen %" />
                </ComposedChart>
              </ResponsiveContainer>
            </MCard>

            {/* Top 10 Dishes Horizontal Bar */}
            <MCard>
              <MCardTitle>Top 10 platos mas rentables (margen unitario)</MCardTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topDishes} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid {...darkGridProps} />
                  <XAxis type="number" tick={darkAxisStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtCurrency(v)} />
                  <YAxis type="category" dataKey="name" tick={darkAxisStyle} axisLine={false} tickLine={false} width={95} />
                  <Tooltip contentStyle={darkTooltipStyle} formatter={((value: number) => [fmtCurrency(value), "Margen"]) as any} />
                  <Bar dataKey="margen" fill={CHART_COLORS.green} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </MCard>
          </div>

          {/* Actions */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={exportProfitabilityCSV}
              className="flex items-center gap-2 rounded-lg border border-[rgba(88,66,55,0.15)] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-[#A78B7D] transition-colors hover:bg-[#222222] hover:text-[#E5E2E1]"
            >
              <FileDown className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
            <button
              onClick={() => printReport("Rentabilidad Eventos")}
              className="flex items-center gap-2 rounded-lg border border-[rgba(88,66,55,0.15)] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-[#A78B7D] transition-colors hover:bg-[#222222] hover:text-[#E5E2E1]"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir PDF
            </button>
          </div>

          {/* Table */}
          <MCard className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[rgba(88,66,55,0.15)] hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Evento</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Fecha</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Tipo</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Comensales</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Ingresos</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">C. teorico</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">C. real</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Margen</TableHead>
                  <TableHead className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_PROFITABILITY_REPORT.map((row) => {
                  const overBudget = row.real_cost > row.theoretical_cost
                  return (
                    <TableRow key={row.event_name} className="border-b border-[rgba(88,66,55,0.08)] hover:bg-[#222222]">
                      <TableCell className="font-medium text-[#E5E2E1]">
                        {row.event_name}
                      </TableCell>
                      <TableCell className="text-sm text-[#A78B7D]">
                        {row.event_date}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full border border-[rgba(88,66,55,0.15)] px-2.5 py-0.5 text-xs text-[#A78B7D]">{row.event_type}</span>
                      </TableCell>
                      <TableCell className="text-right text-[#E5E2E1]">{row.guests}</TableCell>
                      <TableCell className="text-right text-[#E5E2E1]">
                        {formatCurrency(row.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-[#A78B7D]">
                        {formatCurrency(row.theoretical_cost)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          overBudget ? "text-red-400" : "text-[#E5E2E1]"
                        )}
                      >
                        {formatCurrency(row.real_cost)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#E5E2E1]">
                        {formatCurrency(row.margin)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center rounded-full bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-400">
                          {formatPercent(row.margin_pct)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </MCard>
        </TabsContent>

        {/* ================================================================
            TAB: Waste
        ================================================================ */}
        <TabsContent value="waste" className="space-y-6 print:block">
          <h2 className="hidden print:block text-lg font-semibold mb-2 text-[#E5E2E1]">
            Informe Mermas
          </h2>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard
              title="Total mermas"
              value={String(MOCK_WASTE_REPORT.length)}
              sub="Registros de merma"
              borderColor="border-l-red-500"
            />
            <KpiCard
              title="Coste total perdidas"
              value={formatCurrency(totalWasteCost)}
              sub="Periodo seleccionado"
              borderColor="border-l-orange-500"
            />
            <KpiCard
              title="Motivo principal"
              value={topReason}
              sub={`${reasonCounts[topReason] ?? 0} incidencias`}
              borderColor="border-l-amber-500"
            />
            <KpiCard
              title="Producto mas mermado"
              value={topWasteProduct}
              sub={formatCurrency(productWaste[topWasteProduct] ?? 0)}
              borderColor="border-l-purple-500"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Area Chart: daily waste trend */}
            <MCard>
              <MCardTitle>Tendencia diaria de mermas (kg)</MCardTitle>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={wasteDaily} margin={CHART_MARGINS.withLegend}>
                  <defs>
                    <linearGradient id="wasteGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.red} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.red} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...darkGridProps} />
                  <XAxis dataKey="dia" tick={darkAxisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={darkAxisStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatKg(v)} />
                  <Tooltip contentStyle={darkTooltipStyle} formatter={((value: number) => [formatKg(value), "Merma"]) as any} />
                  <Area type="monotone" dataKey="kg" stroke={CHART_COLORS.red} strokeWidth={2} fill="url(#wasteGrad)" dot={{ fill: CHART_COLORS.red, r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </MCard>

            {/* Horizontal Bar: waste by station */}
            <MCard>
              <MCardTitle>Mermas por estacion / partida</MCardTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={wasteByStation} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid {...darkGridProps} />
                  <XAxis type="number" tick={darkAxisStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatKg(v)} />
                  <YAxis type="category" dataKey="name" tick={darkAxisStyle} axisLine={false} tickLine={false} width={95} />
                  <Tooltip contentStyle={darkTooltipStyle} formatter={((value: number) => [formatKg(value), "Merma"]) as any} />
                  <Bar dataKey="kg" fill={CHART_COLORS.orange} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </MCard>
          </div>

          {/* Actions */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={exportWasteCSV}
              className="flex items-center gap-2 rounded-lg border border-[rgba(88,66,55,0.15)] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-[#A78B7D] transition-colors hover:bg-[#222222] hover:text-[#E5E2E1]"
            >
              <FileDown className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
            <button
              onClick={() => printReport("Mermas")}
              className="flex items-center gap-2 rounded-lg border border-[rgba(88,66,55,0.15)] bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-[#A78B7D] transition-colors hover:bg-[#222222] hover:text-[#E5E2E1]"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir PDF
            </button>
          </div>

          {/* Table */}
          <MCard className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[rgba(88,66,55,0.15)] hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Fecha</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Producto</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Cantidad</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Ud.</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Motivo</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Coste unit.</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Perdida total</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A78B7D]">Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_WASTE_REPORT.map((row, i) => (
                  <TableRow key={i} className="border-b border-[rgba(88,66,55,0.08)] hover:bg-[#222222]">
                    <TableCell className="text-sm text-[#A78B7D]">
                      {row.date}
                    </TableCell>
                    <TableCell className="font-medium text-[#E5E2E1]">{row.product}</TableCell>
                    <TableCell className="text-right text-[#E5E2E1]">{row.quantity}</TableCell>
                    <TableCell className="text-[#A78B7D]">{row.unit}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-[#2A2A2A] px-2.5 py-0.5 text-xs text-[#A78B7D]">{row.reason}</span>
                    </TableCell>
                    <TableCell className="text-right text-[#A78B7D]">
                      {formatCurrency(row.cost_per_unit)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-400">
                      {formatCurrency(row.total_cost)}
                    </TableCell>
                    <TableCell className="text-sm text-[#A78B7D]">
                      {row.recorded_by}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
