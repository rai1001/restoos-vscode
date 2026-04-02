"use client"

import { useState, useMemo } from "react"
import { TrendingUp, Play, AlertTriangle, CheckCircle, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  generateForecast,
  type HistoricalConsumption,
  type FutureEventDemand,
  type StockLevel,
  type DailyForecast,
  type ForecastSummary,
} from "@/lib/calculations"
import { MOCK_PRODUCTS, MOCK_STOCK_LOTS } from "@/lib/mock-data"
// Mock services for restaurant forecast (replaces hotel events)
const MOCK_SERVICES = [
  { id: "svc-1", name: "Comida Lunes", date: "2026-03-30", service_type: "comida", guests: 45, status: "confirmado" },
  { id: "svc-2", name: "Cena Lunes", date: "2026-03-30", service_type: "cena", guests: 60, status: "confirmado" },
  { id: "svc-3", name: "Comida Martes", date: "2026-03-31", service_type: "comida", guests: 50, status: "confirmado" },
  { id: "svc-4", name: "Cena Martes", date: "2026-03-31", service_type: "cena", guests: 55, status: "confirmado" },
  { id: "svc-5", name: "Comida Miercoles", date: "2026-04-01", service_type: "comida", guests: 48, status: "confirmado" },
  { id: "svc-6", name: "Cena Miercoles", date: "2026-04-01", service_type: "cena", guests: 65, status: "confirmado" },
  { id: "svc-7", name: "Comida Jueves", date: "2026-04-02", service_type: "comida", guests: 42, status: "confirmado" },
  { id: "svc-8", name: "Cena Jueves", date: "2026-04-02", service_type: "cena", guests: 70, status: "confirmado" },
  { id: "svc-9", name: "Comida Viernes", date: "2026-04-03", service_type: "comida", guests: 55, status: "confirmado" },
  { id: "svc-10", name: "Cena Viernes", date: "2026-04-03", service_type: "cena_especial", guests: 80, status: "confirmado" },
]

// ─── Unit mapping ────────────────────────────────────────────────────────────

const UNIT_MAP: Record<string, string> = {
  "40000000-0000-0000-0000-000000000001": "kg",
  "40000000-0000-0000-0000-000000000003": "L",
}

function getUnit(unitId: string): string {
  return UNIT_MAP[unitId] ?? "ud"
}

// ─── Mock historical consumption generator ───────────────────────────────────

// Deterministic seeded random to keep results stable across renders
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Base daily demand ranges by product category */
const CATEGORY_DEMAND: Record<string, { min: number; max: number }> = {
  "10000000-0000-0000-0000-000000000001": { min: 3, max: 8 },   // Carnes
  "10000000-0000-0000-0000-000000000002": { min: 2, max: 6 },   // Pescados
  "10000000-0000-0000-0000-000000000003": { min: 4, max: 12 },  // Verduras
  "10000000-0000-0000-0000-000000000004": { min: 2, max: 8 },   // Lácteos
  "10000000-0000-0000-0000-000000000005": { min: 1, max: 4 },   // Aceites
  "10000000-0000-0000-0000-000000000006": { min: 2, max: 6 },   // Harinas
  "10000000-0000-0000-0000-000000000007": { min: 5, max: 15 },  // Bebidas
  "10000000-0000-0000-0000-000000000008": { min: 1, max: 3 },   // Otros
}

function generateMockHistory(): HistoricalConsumption[] {
  const history: HistoricalConsumption[] = []
  const today = new Date()
  const rand = seededRandom(42)

  for (const product of MOCK_PRODUCTS) {
    const range = (product.category_id ? CATEGORY_DEMAND[product.category_id] : undefined) ?? { min: 2, max: 6 }

    for (let d = 90; d >= 1; d--) {
      const date = new Date(today)
      date.setDate(date.getDate() - d)
      const dow = date.getDay() // 0=Sun, 6=Sat
      const dateStr = date.toISOString().split("T")[0]!

      // Weekend multiplier: more consumption on Fri-Sat-Sun
      const weekendFactor = dow === 0 || dow === 5 || dow === 6 ? 1.35 : 1.0
      // Small mid-week dip on Mon-Tue
      const midweekFactor = dow === 1 || dow === 2 ? 0.85 : 1.0

      const baseQty = range.min + rand() * (range.max - range.min)
      const quantity = Math.round(baseQty * weekendFactor * midweekFactor * 100) / 100

      history.push({
        product_id: product.id,
        product_name: product.name,
        date: dateStr,
        quantity,
        unit: getUnit(product.default_unit_id ?? ""),
      })
    }
  }

  return history
}

// ─── Build forecast inputs from mock data ────────────────────────────────────

function buildStockLevels(): StockLevel[] {
  // Aggregate stock lots by product
  const stockByProduct = new Map<string, number>()
  for (const lot of MOCK_STOCK_LOTS) {
    stockByProduct.set(
      lot.product_id,
      (stockByProduct.get(lot.product_id) ?? 0) + lot.current_quantity,
    )
  }

  return MOCK_PRODUCTS.map((p) => ({
    product_id: p.id,
    product_name: p.name,
    current_stock: stockByProduct.get(p.id) ?? 0,
    unit: getUnit(p.default_unit_id ?? ""),
    safety_stock: Math.round(((p.category_id ? CATEGORY_DEMAND[p.category_id]?.min : undefined) ?? 2) * 3),
  }))
}

function buildFutureEvents(): FutureEventDemand[] {
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]!

  // Filter for upcoming confirmed/en_preparacion events
  const upcoming = MOCK_SERVICES.filter(
    (e: { date: string; status: string }) =>
      e.date >= todayStr &&
      (e.status === "confirmado" || e.status === "en_preparacion"),
  )

  // Simple demand mapping per event type (product quantities per guest)
  // In a real system this would use menu explosion via demandEngine
  const perGuestDemand: Record<string, { product_id: string; qty: number }[]> = {
    boda: [
      { product_id: "30000000-0000-0000-0000-000000000004", qty: 0.25 },   // Ternera
      { product_id: "30000000-0000-0000-0000-000000000005", qty: 0.15 },   // Salmón
      { product_id: "30000000-0000-0000-0000-000000000007", qty: 0.3 },    // Tomate
      { product_id: "30000000-0000-0000-0000-000000000001", qty: 0.05 },   // Aceite
      { product_id: "30000000-0000-0000-0000-000000000015", qty: 0.5 },    // Vino
      { product_id: "30000000-0000-0000-0000-000000000011", qty: 0.03 },   // Mantequilla
    ],
    congreso: [
      { product_id: "30000000-0000-0000-0000-000000000003", qty: 0.1 },    // Pollo
      { product_id: "30000000-0000-0000-0000-000000000007", qty: 0.15 },   // Tomate
      { product_id: "30000000-0000-0000-0000-000000000009", qty: 0.1 },    // Leche
      { product_id: "30000000-0000-0000-0000-000000000002", qty: 0.05 },   // Harina
    ],
    cena_gala: [
      { product_id: "30000000-0000-0000-0000-000000000004", qty: 0.3 },    // Ternera
      { product_id: "30000000-0000-0000-0000-000000000005", qty: 0.2 },    // Salmón
      { product_id: "30000000-0000-0000-0000-000000000015", qty: 0.4 },    // Vino
      { product_id: "30000000-0000-0000-0000-000000000001", qty: 0.04 },   // Aceite
      { product_id: "30000000-0000-0000-0000-000000000011", qty: 0.04 },   // Mantequilla
    ],
    cumpleanos: [
      { product_id: "30000000-0000-0000-0000-000000000003", qty: 0.15 },   // Pollo
      { product_id: "30000000-0000-0000-0000-000000000002", qty: 0.1 },    // Harina
      { product_id: "30000000-0000-0000-0000-000000000009", qty: 0.15 },   // Leche
      { product_id: "30000000-0000-0000-0000-000000000011", qty: 0.05 },   // Mantequilla
    ],
    coctel: [
      { product_id: "30000000-0000-0000-0000-000000000005", qty: 0.08 },   // Salmón
      { product_id: "30000000-0000-0000-0000-000000000010", qty: 0.05 },   // Queso
      { product_id: "30000000-0000-0000-0000-000000000001", qty: 0.02 },   // Aceite
      { product_id: "30000000-0000-0000-0000-000000000015", qty: 0.3 },    // Vino
    ],
    desayuno_trabajo: [
      { product_id: "30000000-0000-0000-0000-000000000009", qty: 0.2 },    // Leche
      { product_id: "30000000-0000-0000-0000-000000000002", qty: 0.08 },   // Harina
      { product_id: "30000000-0000-0000-0000-000000000011", qty: 0.04 },   // Mantequilla
    ],
    catering_externo: [
      { product_id: "30000000-0000-0000-0000-000000000003", qty: 0.15 },   // Pollo
      { product_id: "30000000-0000-0000-0000-000000000007", qty: 0.2 },    // Tomate
      { product_id: "30000000-0000-0000-0000-000000000012", qty: 0.1 },    // Arroz
      { product_id: "30000000-0000-0000-0000-000000000001", qty: 0.03 },   // Aceite
    ],
    otro: [
      { product_id: "30000000-0000-0000-0000-000000000003", qty: 0.1 },    // Pollo
      { product_id: "30000000-0000-0000-0000-000000000007", qty: 0.15 },   // Tomate
    ],
  }

  const productNameMap = new Map(MOCK_PRODUCTS.map((p) => [p.id, p]))

  return upcoming.map((event: { id: string; name: string; date: string; guests: number; service_type: string }) => {
    const demandPerGuest = perGuestDemand[event.service_type] ?? perGuestDemand["otro"]!
    return {
      event_id: event.id,
      event_name: event.name,
      date: event.date,
      pax: event.guests,
      products: demandPerGuest.map((d) => {
        const prod = productNameMap.get(d.product_id)
        return {
          product_id: d.product_id,
          product_name: prod?.name ?? "Desconocido",
          quantity: Math.round(d.qty * event.guests * 100) / 100,
          unit: prod ? getUnit(prod.default_unit_id ?? "") : "kg",
        }
      }),
    }
  })
}

// ─── Urgency badge helper ────────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: ForecastSummary["urgency"] }) {
  switch (urgency) {
    case "critical":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium uppercase tracking-widest text-red-400">
          <AlertTriangle className="h-3 w-3" />
          Critico
        </span>
      )
    case "warning":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 text-xs font-medium uppercase tracking-widest text-orange-400">
          <AlertTriangle className="h-3 w-3" />
          Atencion
        </span>
      )
    case "ok":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-medium uppercase tracking-widest text-green-400">
          <CheckCircle className="h-3 w-3" />
          OK
        </span>
      )
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FORECAST_DAYS = 14

// ─── Page component ──────────────────────────────────────────────────────────

export default function ForecastingPage() {
  const [forecastResult, setForecastResult] = useState<{
    daily: DailyForecast[]
    summary: ForecastSummary[]
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = () => {
    setLoading(true)
    // Use setTimeout to let the loading state render before the synchronous computation
    setTimeout(() => {
      const history = generateMockHistory()
      const futureEvents = buildFutureEvents()
      const stock = buildStockLevels()
      const result = generateForecast(history, futureEvents, stock, FORECAST_DAYS)
      setForecastResult(result)
      setLoading(false)
    }, 100)
  }

  // Summary stats
  const stats = useMemo(() => {
    if (!forecastResult) return null
    const { summary } = forecastResult
    const critical = summary.filter((s) => s.urgency === "critical").length
    const warning = summary.filter((s) => s.urgency === "warning").length
    const ok = summary.filter((s) => s.urgency === "ok").length
    const totalDeficit = summary.reduce((acc, s) => acc + s.deficit, 0)
    return { critical, warning, ok, totalDeficit: Math.round(totalDeficit * 100) / 100 }
  }, [forecastResult])

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            PREVISION Y DEMANDA
          </p>
          <h1 className="text-xl font-bold sm:text-2xl text-foreground">Prevision de demanda</h1>
          <p className="text-muted-foreground mt-1">
            Pronostico de los proximos {FORECAST_DAYS} dias basado en consumo
            historico, estacionalidad y eventos confirmados
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={loading} className="gap-2 bg-primary text-white hover:bg-primary/90">
          <Play className="h-4 w-4" />
          {loading ? "Calculando..." : "Generar prevision"}
        </Button>
      </div>

      {/* ── Empty state ── */}
      {!forecastResult && !loading && (
        <div className="rounded-lg bg-card">
          <div className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold text-foreground">Sin prevision generada</h3>
            <p className="text-muted-foreground mt-1 max-w-md text-center text-sm">
              Pulsa &ldquo;Generar prevision&rdquo; para calcular la demanda
              prevista de los proximos {FORECAST_DAYS} dias combinando datos
              historicos, factores estacionales y eventos confirmados.
            </p>
          </div>
        </div>
      )}

      {/* ── Stats cards ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-card p-4 border-l-4 border-l-red-500">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Productos criticos
            </p>
            <p className="mt-1 text-2xl font-bold text-red-400">
              {stats.critical}
            </p>
          </div>
          <div className="rounded-lg bg-card p-4 border-l-4 border-l-orange-500">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Atencion
            </p>
            <p className="mt-1 text-2xl font-bold text-orange-400">
              {stats.warning}
            </p>
          </div>
          <div className="rounded-lg bg-card p-4 border-l-4 border-l-green-500">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Productos OK
            </p>
            <p className="mt-1 text-2xl font-bold text-green-400">
              {stats.ok}
            </p>
          </div>
          <div className="rounded-lg bg-card p-4 border-l-4 border-l-primary">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Deficit total
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.totalDeficit}</p>
          </div>
        </div>
      )}

      {/* ── Section 1: Resumen por producto ── */}
      {forecastResult && (
        <div className="rounded-lg bg-card">
          <div className="px-4 py-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Resumen por producto</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-muted-foreground/10 hover:bg-transparent">
                  <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Producto</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-widest text-muted-foreground">Demanda total</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-widest text-muted-foreground">Stock actual</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-widest text-muted-foreground">Stock seguridad</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-widest text-muted-foreground">Deficit</TableHead>
                  <TableHead className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">Urgencia</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-widest text-muted-foreground">Cantidad sugerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecastResult.summary.map((row) => (
                  <TableRow
                    key={row.product_id}
                    className={cn(
                      "border-b border-muted-foreground/10 hover:bg-card-hover transition-colors",
                      row.urgency === "critical" && "bg-red-950/20",
                      row.urgency === "warning" && "bg-orange-950/10",
                    )}
                  >
                    <TableCell className="font-medium text-foreground">
                      {row.product_name}
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({row.unit})
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {row.total_forecast_demand.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {row.current_stock.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.safety_stock.toFixed(1)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-semibold",
                        row.deficit > 0 ? "text-red-400" : "text-green-400",
                      )}
                    >
                      {row.deficit > 0 ? row.deficit.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <UrgencyBadge urgency={row.urgency} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-semibold",
                        row.suggested_order_qty > 0 && "text-blue-400",
                      )}
                    >
                      {row.suggested_order_qty > 0
                        ? row.suggested_order_qty.toFixed(1)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {forecastResult.summary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                      No se generaron resultados de prevision
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Section 2: Detalle diario ── */}
      {forecastResult && forecastResult.daily.length > 0 && (
        <div className="rounded-lg bg-card">
          <div className="px-4 py-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Detalle diario</h2>
          </div>
          <div className="px-4 pb-4">
            <DailyDetailGrid daily={forecastResult.daily} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Daily Detail Grid (horizontal scrollable) ──────────────────────────────

function DailyDetailGrid({ daily }: { daily: DailyForecast[] }) {
  // Collect all unique products across all days
  const allProducts = useMemo(() => {
    const map = new Map<string, { name: string; unit: string }>()
    for (const day of daily) {
      for (const p of day.products) {
        if (!map.has(p.product_id)) {
          map.set(p.product_id, { name: p.product_name, unit: p.unit })
        }
      }
    }
    return Array.from(map.entries()).map(([id, info]) => ({
      product_id: id,
      ...info,
    }))
  }, [daily])

  // Build lookup: day+product -> ProductForecast
  const demandLookup = useMemo(() => {
    const lookup = new Map<string, { total_demand: number; deficit: number }>()
    for (const day of daily) {
      for (const p of day.products) {
        lookup.set(`${day.date}|${p.product_id}`, {
          total_demand: p.total_demand,
          deficit: p.deficit,
        })
      }
    }
    return lookup
  }, [daily])

  // Format day header: "Lun 20"
  function formatDayHeader(day: DailyForecast): string {
    const dayNum = day.date.split("-")[2] ?? ""
    return `${day.day_label} ${parseInt(dayNum)}`
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-sm">
        <thead>
          <tr className="border-b border-muted-foreground/10">
            <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Producto
            </th>
            {daily.map((day) => (
              <th
                key={day.date}
                className={cn(
                  "min-w-[60px] px-2 py-2 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground",
                  day.day_of_week === 0 || day.day_of_week === 6
                    ? "bg-sidebar"
                    : "",
                )}
              >
                {formatDayHeader(day)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-muted-foreground/10">
          {allProducts.map((product) => (
            <tr key={product.product_id} className="hover:bg-card-hover transition-colors">
              <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-medium whitespace-nowrap text-foreground">
                {product.name}
                <span className="text-muted-foreground ml-1 text-xs">
                  ({product.unit})
                </span>
              </td>
              {daily.map((day) => {
                const cell = demandLookup.get(`${day.date}|${product.product_id}`)
                const demand = cell?.total_demand ?? 0
                const deficit = cell?.deficit ?? 0

                return (
                  <td
                    key={day.date}
                    className={cn(
                      "px-2 py-1.5 text-center tabular-nums text-xs text-foreground",
                      deficit > 0 && "bg-red-950/30 font-semibold text-red-400",
                      day.day_of_week === 0 || day.day_of_week === 6
                        ? deficit > 0
                          ? ""
                          : "bg-sidebar"
                        : "",
                    )}
                  >
                    {demand > 0 ? demand.toFixed(1) : "—"}
                  </td>
                )
              })}
            </tr>
          ))}
          {/* Total row */}
          <tr className="border-t-2 border-muted-foreground/20 font-semibold">
            <td className="sticky left-0 z-10 bg-card px-3 py-2 text-foreground">
              Total
            </td>
            {daily.map((day) => (
              <td key={day.date} className="px-2 py-2 text-center tabular-nums text-xs text-foreground">
                {day.total_demand.toFixed(1)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
