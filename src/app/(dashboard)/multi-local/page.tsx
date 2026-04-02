"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChefHat,
  Warehouse,
  ShieldCheck,
  DollarSign,
  Package,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// ── Mock multi-local data ───────────────────────────────────────────────────

interface LocalKPIs {
  id: string
  name: string
  shortName: string
  type: "restaurante" | "obrador"
  foodCostPct: number
  foodCostTarget: number
  revenue: number
  revenuePrev: number
  wasteEur: number
  wastePrev: number
  stockValue: number
  appccPct: number
  desvTeoricoReal: number
  topAlert: string | null
}

const MOCK_LOCALS: LocalKPIs[] = [
  {
    id: "bb000000-0000-0000-0000-000000000001",
    name: "Culuca Cociña-Bar",
    shortName: "Culuca",
    type: "restaurante",
    foodCostPct: 28.4,
    foodCostTarget: 30,
    revenue: 42800,
    revenuePrev: 38500,
    wasteEur: 320,
    wastePrev: 280,
    stockValue: 4850,
    appccPct: 100,
    desvTeoricoReal: 3.2,
    topAlert: null,
  },
  {
    id: "bb000000-0000-0000-0000-000000000002",
    name: "Taberna da Galera",
    shortName: "Galera",
    type: "restaurante",
    foodCostPct: 32.1,
    foodCostTarget: 30,
    revenue: 28600,
    revenuePrev: 27200,
    wasteEur: 580,
    wastePrev: 420,
    stockValue: 3200,
    appccPct: 87.5,
    desvTeoricoReal: 8.7,
    topAlert: "Merma +38% vs mes anterior",
  },
  {
    id: "bb000000-0000-0000-0000-000000000003",
    name: "Taberna da Tabacalera",
    shortName: "Tabacalera",
    type: "restaurante",
    foodCostPct: 35.8,
    foodCostTarget: 32,
    revenue: 31200,
    revenuePrev: 32800,
    wasteEur: 450,
    wastePrev: 390,
    stockValue: 5600,
    appccPct: 75,
    desvTeoricoReal: 12.4,
    topAlert: "Food cost 3.8% por encima del objetivo",
  },
  {
    id: "bb000000-0000-0000-0000-000000000004",
    name: "Culuca Obrador",
    shortName: "Obrador",
    type: "obrador",
    foodCostPct: 42.5,
    foodCostTarget: 45,
    revenue: 8900,
    revenuePrev: 8200,
    wasteEur: 120,
    wastePrev: 145,
    stockValue: 2100,
    appccPct: 100,
    desvTeoricoReal: 1.8,
    topAlert: null,
  },
]

// ── Price comparison (the money shot) ────────────────────────────────────────

interface PriceComparison {
  product: string
  culuca: number | null
  galera: number | null
  tabacalera: number | null
  obrador: number | null
  unit: string
  maxDiff: number // % difference between cheapest and most expensive
}

const PRICE_COMPARISONS: PriceComparison[] = [
  { product: "Aceite oliva virgen extra", culuca: 4.50, galera: 4.80, tabacalera: 5.20, obrador: 4.50, unit: "€/L", maxDiff: 15.6 },
  { product: "Solomillo de ternera", culuca: 18.50, galera: null, tabacalera: 19.80, obrador: null, unit: "€/kg", maxDiff: 7.0 },
  { product: "Patata gallega", culuca: 1.10, galera: 1.40, tabacalera: 1.40, obrador: null, unit: "€/kg", maxDiff: 27.3 },
  { product: "Cebolla blanca", culuca: 0.95, galera: 1.10, tabacalera: 1.15, obrador: 0.95, unit: "€/kg", maxDiff: 21.1 },
  { product: "Leche entera", culuca: 1.10, galera: null, tabacalera: null, obrador: 1.10, unit: "€/L", maxDiff: 0 },
  { product: "Huevo fresco", culuca: 0.18, galera: 0.22, tabacalera: 0.20, obrador: 0.18, unit: "€/ud", maxDiff: 22.2 },
]

// ── Obrador distribution ─────────────────────────────────────────────────────

interface ObradorDistribution {
  product: string
  produced: number
  unit: string
  costPerUnit: number
  culuca: number
  galera: number
  tabacalera: number
  unaccounted: number
}

const OBRADOR_DISTRIBUTION: ObradorDistribution[] = [
  { product: "Callos de Culuca", produced: 200, unit: "raciones", costPerUnit: 2.80, culuca: 85, galera: 55, tabacalera: 40, unaccounted: 20 },
  { product: "Croquetas jamón", produced: 500, unit: "uds", costPerUnit: 0.45, culuca: 200, galera: 150, tabacalera: 120, unaccounted: 30 },
  { product: "Croquetas cocido", produced: 300, unit: "uds", costPerUnit: 0.52, culuca: 120, galera: 80, tabacalera: 75, unaccounted: 25 },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function TrendBadge({ current, previous, inverted = false }: { current: number; previous: number; inverted?: boolean }) {
  const pct = ((current - previous) / previous) * 100
  const isGood = inverted ? pct < 0 : pct > 0
  return (
    <span className={cn("text-xs font-medium", isGood ? "text-emerald-400" : "text-red-400")}>
      {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  )
}

function FoodCostBadge({ value, target }: { value: number; target: number }) {
  const overTarget = value > target
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("text-lg font-bold", overTarget ? "text-red-400" : "text-emerald-400")}>
        {value.toFixed(1)}%
      </span>
      {overTarget && (
        <Badge className="bg-red-500/15 text-red-400 border-0 text-[10px]">
          +{(value - target).toFixed(1)}
        </Badge>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MultiLocalPage() {
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null)

  const totalRevenue = MOCK_LOCALS.reduce((s, l) => s + l.revenue, 0)
  const totalWaste = MOCK_LOCALS.reduce((s, l) => s + l.wasteEur, 0)
  const totalStock = MOCK_LOCALS.reduce((s, l) => s + l.stockValue, 0)
  const avgFoodCost = MOCK_LOCALS.filter(l => l.type === "restaurante").reduce((s, l) => s + l.foodCostPct, 0) / MOCK_LOCALS.filter(l => l.type === "restaurante").length
  const localsWithAlerts = MOCK_LOCALS.filter(l => l.topAlert).length
  const priceIssues = PRICE_COMPARISONS.filter(p => p.maxDiff > 10).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          CONTROL MULTI-LOCAL
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Grupo Culuca — 4 locales
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visión consolidada de costes, merma, compras y cumplimiento
        </p>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-lg bg-card border-l-4 border-l-primary p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Facturación mes</p>
          <p className="text-xl font-bold text-foreground">€{(totalRevenue / 1000).toFixed(1)}K</p>
        </div>
        <div className="rounded-lg bg-card border-l-4 border-l-blue-500 p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Food cost medio</p>
          <p className="text-xl font-bold text-foreground">{avgFoodCost.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-card border-l-4 border-l-red-500 p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Merma total</p>
          <p className="text-xl font-bold text-red-400">€{totalWaste}</p>
        </div>
        <div className="rounded-lg bg-card border-l-4 border-l-emerald-500 p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Valor stock</p>
          <p className="text-xl font-bold text-foreground">€{(totalStock / 1000).toFixed(1)}K</p>
        </div>
        <div className="rounded-lg bg-card border-l-4 border-l-yellow-500 p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Alertas activas</p>
          <p className="text-xl font-bold text-yellow-400">{localsWithAlerts}</p>
        </div>
        <div className="rounded-lg bg-card border-l-4 border-l-orange-500 p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Desviaciones precio</p>
          <p className="text-xl font-bold text-orange-400">{priceIssues}</p>
        </div>
      </div>

      {/* Per-local comparison table */}
      <div className="rounded-lg bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Comparativa por local</h2>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Local</TableHead>
              <TableHead className="text-muted-foreground text-right">Facturación</TableHead>
              <TableHead className="text-muted-foreground text-center">Food Cost</TableHead>
              <TableHead className="text-muted-foreground text-right">Merma €</TableHead>
              <TableHead className="text-muted-foreground text-center">Desv. T/R</TableHead>
              <TableHead className="text-muted-foreground text-center">APPCC</TableHead>
              <TableHead className="text-muted-foreground">Alerta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_LOCALS.map(local => (
              <TableRow key={local.id} className={cn("border-border", local.topAlert && "bg-red-950/5")}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {local.type === "obrador" ? (
                      <Warehouse className="h-4 w-4 text-blue-400" />
                    ) : (
                      <ChefHat className="h-4 w-4 text-primary" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{local.shortName}</p>
                      <p className="text-[10px] text-muted-foreground">{local.type}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm text-foreground">€{(local.revenue / 1000).toFixed(1)}K</span>
                  <span className="ml-1.5"><TrendBadge current={local.revenue} previous={local.revenuePrev} /></span>
                </TableCell>
                <TableCell className="text-center">
                  <FoodCostBadge value={local.foodCostPct} target={local.foodCostTarget} />
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm text-red-400">€{local.wasteEur}</span>
                  <span className="ml-1.5"><TrendBadge current={local.wasteEur} previous={local.wastePrev} inverted /></span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={cn(
                    "text-xs border-0",
                    local.desvTeoricoReal > 10 ? "bg-red-500/15 text-red-400" :
                    local.desvTeoricoReal > 5 ? "bg-yellow-500/15 text-yellow-400" :
                    "bg-emerald-500/15 text-emerald-400"
                  )}>
                    {local.desvTeoricoReal.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={cn(
                    "text-xs border-0",
                    local.appccPct === 100 ? "bg-emerald-500/15 text-emerald-400" :
                    local.appccPct >= 80 ? "bg-yellow-500/15 text-yellow-400" :
                    "bg-red-500/15 text-red-400"
                  )}>
                    {local.appccPct}%
                  </Badge>
                </TableCell>
                <TableCell>
                  {local.topAlert ? (
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-yellow-400 shrink-0" />
                      <span className="text-xs text-yellow-400 truncate max-w-[200px]">{local.topAlert}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-emerald-400">OK</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Price comparison — THE MONEY SHOT */}
      <div className="rounded-lg bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-semibold text-foreground">Desviaciones de precio entre locales</h2>
            </div>
            <Badge className="bg-red-500/15 text-red-400 border-0">
              {priceIssues} productos con &gt;10% desviación
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Mismo producto, mismo proveedor, diferente precio — dinero que se escapa
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Producto</TableHead>
              <TableHead className="text-muted-foreground text-right">Culuca</TableHead>
              <TableHead className="text-muted-foreground text-right">Galera</TableHead>
              <TableHead className="text-muted-foreground text-right">Tabacalera</TableHead>
              <TableHead className="text-muted-foreground text-right">Obrador</TableHead>
              <TableHead className="text-muted-foreground text-center">Desviación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PRICE_COMPARISONS.sort((a, b) => b.maxDiff - a.maxDiff).map((item, idx) => {
              const prices = [item.culuca, item.galera, item.tabacalera, item.obrador].filter((p): p is number => p !== null)
              const minPrice = Math.min(...prices)
              return (
                <TableRow key={idx} className={cn("border-border", item.maxDiff > 10 && "bg-red-950/5")}>
                  <TableCell className="text-sm font-medium text-foreground">
                    {item.product}
                    <span className="text-muted-foreground ml-1.5 text-xs">{item.unit}</span>
                  </TableCell>
                  {[item.culuca, item.galera, item.tabacalera, item.obrador].map((price, i) => (
                    <TableCell key={i} className="text-right">
                      {price !== null ? (
                        <span className={cn(
                          "text-sm font-mono",
                          price === minPrice ? "text-emerald-400" : price > minPrice * 1.1 ? "text-red-400 font-semibold" : "text-foreground"
                        )}>
                          {price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    {item.maxDiff > 0 ? (
                      <Badge className={cn(
                        "text-xs border-0",
                        item.maxDiff > 20 ? "bg-red-500/15 text-red-400" :
                        item.maxDiff > 10 ? "bg-yellow-500/15 text-yellow-400" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {item.maxDiff.toFixed(1)}%
                      </Badge>
                    ) : (
                      <span className="text-xs text-emerald-400">OK</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Obrador distribution */}
      <div className="rounded-lg bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-foreground">Obrador → Distribución a locales</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Producción centralizada vs consumo por local — ¿dónde van las raciones que faltan?
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Producto</TableHead>
              <TableHead className="text-muted-foreground text-right">Producido</TableHead>
              <TableHead className="text-muted-foreground text-right">Culuca</TableHead>
              <TableHead className="text-muted-foreground text-right">Galera</TableHead>
              <TableHead className="text-muted-foreground text-right">Tabacalera</TableHead>
              <TableHead className="text-muted-foreground text-right">Sin justificar</TableHead>
              <TableHead className="text-muted-foreground text-right">Coste perdido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {OBRADOR_DISTRIBUTION.map((item, idx) => (
              <TableRow key={idx} className={cn("border-border", item.unaccounted > 0 && "bg-yellow-950/5")}>
                <TableCell className="text-sm font-medium text-foreground">{item.product}</TableCell>
                <TableCell className="text-right text-sm text-foreground">{item.produced} {item.unit}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{item.culuca}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{item.galera}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{item.tabacalera}</TableCell>
                <TableCell className="text-right">
                  {item.unaccounted > 0 ? (
                    <span className="text-sm font-semibold text-red-400">{item.unaccounted}</span>
                  ) : (
                    <span className="text-sm text-emerald-400">0</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {item.unaccounted > 0 ? (
                    <span className="text-sm font-semibold text-red-400">
                      €{(item.unaccounted * item.costPerUnit).toFixed(0)}
                    </span>
                  ) : (
                    <span className="text-sm text-emerald-400">€0</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-border bg-red-950/10">
              <TableCell colSpan={6} className="text-sm font-semibold text-red-400 text-right">
                Total coste sin justificar
              </TableCell>
              <TableCell className="text-right text-sm font-bold text-red-400">
                €{OBRADOR_DISTRIBUTION.reduce((s, d) => s + d.unaccounted * d.costPerUnit, 0).toFixed(0)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
