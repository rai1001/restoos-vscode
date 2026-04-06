"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Building2, AlertTriangle, ChefHat, Warehouse, DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTenantOverview, usePriceComparisons } from "@/features/multi-local/hooks/use-multi-local"
import type { HotelOverview, PriceComparison } from "@/features/multi-local/services/multi-local.service"

// ── Helpers ──────────────────────────────────────────────────────────────────

function AppccBadge({ pct }: { pct: number }) {
  return (
    <Badge className={cn(
      "text-xs border-0",
      pct >= 100 ? "bg-emerald-500/15 text-emerald-400" :
      pct >= 80 ? "bg-[var(--alert-warning)]/15 text-[var(--alert-warning)]" :
      "bg-[var(--alert-critical)]/15 text-[var(--alert-critical)]"
    )}>
      {Math.round(pct)}%
    </Badge>
  )
}

function eurFmt(n: number): string {
  if (n >= 1000) return `\u20AC${(n / 1000).toFixed(1)}K`
  return `\u20AC${n.toFixed(0)}`
}

// ── Price comparison grouping ────────────────────────────────────────────────

interface GroupedPrice {
  product: string
  unit: string
  prices: { hotel: string; price: number; supplier: string }[]
  minPrice: number
  maxPrice: number
  diffPct: number
}

function groupPrices(comparisons: PriceComparison[]): GroupedPrice[] {
  const byProduct = new Map<string, GroupedPrice>()

  for (const c of comparisons) {
    const key = c.product_name
    if (!byProduct.has(key)) {
      byProduct.set(key, {
        product: c.product_name,
        unit: c.unit,
        prices: [],
        minPrice: Infinity,
        maxPrice: 0,
        diffPct: 0,
      })
    }
    const group = byProduct.get(key)!
    group.prices.push({ hotel: c.hotel_name, price: Number(c.price), supplier: c.supplier_name })
    group.minPrice = Math.min(group.minPrice, Number(c.price))
    group.maxPrice = Math.max(group.maxPrice, Number(c.price))
  }

  for (const g of byProduct.values()) {
    g.diffPct = g.minPrice > 0 ? ((g.maxPrice - g.minPrice) / g.minPrice) * 100 : 0
  }

  return Array.from(byProduct.values())
    .filter(g => g.prices.length > 1)
    .sort((a, b) => b.diffPct - a.diffPct)
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MultiLocalPage() {
  const { data: hotels, isLoading: hotelsLoading } = useTenantOverview()
  const { data: rawPrices, isLoading: pricesLoading } = usePriceComparisons()

  const priceGroups = useMemo(() => groupPrices(rawPrices ?? []), [rawPrices])
  const priceIssues = priceGroups.filter(p => p.diffPct > 10).length

  if (hotelsLoading) {
    return <p className="text-muted-foreground py-8 text-center">Cargando datos del grupo...</p>
  }

  if (!hotels || hotels.length === 0) {
    return (
      <div className="text-center py-16">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">No hay locales configurados en este grupo.</p>
      </div>
    )
  }

  const totalStock = hotels.reduce((s: number, h: HotelOverview) => s + Number(h.stock_value), 0)
  const totalWaste = hotels.reduce((s: number, h: HotelOverview) => s + Number(h.waste_30d_cost), 0)
  const totalAlerts = hotels.reduce((s: number, h: HotelOverview) => s + h.alerts_active, 0)
  const totalProducts = hotels.reduce((s: number, h: HotelOverview) => s + h.products_count, 0)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          CONTROL MULTI-LOCAL
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Grupo Culuca &mdash; {hotels.length} locales
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Datos en tiempo real de todos los locales del grupo
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-lg bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Locales</p>
          <p className="text-xl font-bold text-foreground">{hotels.length}</p>
        </div>
        <div className="rounded-lg bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Productos total</p>
          <p className="text-xl font-bold text-foreground">{totalProducts}</p>
        </div>
        <div className="rounded-lg bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Valor stock</p>
          <p className="text-xl font-bold text-foreground">{eurFmt(totalStock)}</p>
        </div>
        <div className="rounded-lg bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Merma 30d</p>
          <p className="text-xl font-bold text-[var(--alert-critical)]">{eurFmt(totalWaste)}</p>
        </div>
        <div className="rounded-lg bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Alertas</p>
          <p className="text-xl font-bold text-[var(--alert-warning)]">{totalAlerts}</p>
        </div>
      </div>

      {/* Per-local comparison */}
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
              <TableHead className="text-muted-foreground text-right">Productos</TableHead>
              <TableHead className="text-muted-foreground text-right">Recetas</TableHead>
              <TableHead className="text-muted-foreground text-right">Stock</TableHead>
              <TableHead className="text-muted-foreground text-right">Merma 30d</TableHead>
              <TableHead className="text-muted-foreground text-center">APPCC hoy</TableHead>
              <TableHead className="text-muted-foreground text-right">Alertas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hotels.map((h: HotelOverview) => (
              <TableRow key={h.hotel_id} className={cn("border-border", h.alerts_active > 0 && "bg-[var(--alert-critical)]/10")}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {h.slug.includes("obrador") ? (
                      <Warehouse className="h-4 w-4 text-blue-400" />
                    ) : (
                      <ChefHat className="h-4 w-4 text-primary" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{h.name}</p>
                      <p className="text-[10px] text-muted-foreground">{h.suppliers_count} proveedores</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-foreground">{h.products_count}</TableCell>
                <TableCell className="text-right">
                  <span className="text-sm text-foreground">{h.recipes_approved}</span>
                  <span className="text-muted-foreground text-xs">/{h.recipes_count}</span>
                </TableCell>
                <TableCell className="text-right text-sm text-foreground">{eurFmt(Number(h.stock_value))}</TableCell>
                <TableCell className="text-right">
                  {Number(h.waste_30d_cost) > 0 ? (
                    <span className="text-sm text-[var(--alert-critical)]">{eurFmt(Number(h.waste_30d_cost))}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">{eurFmt(0)}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <AppccBadge pct={Number(h.appcc_today_pct)} />
                    {h.appcc_incidents_open > 0 && (
                      <Badge className="bg-[var(--alert-critical)]/15 text-[var(--alert-critical)] border-0 text-[10px]">
                        {h.appcc_incidents_open} inc.
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {h.alerts_active > 0 ? (
                    <div className="flex items-center justify-end gap-1">
                      <AlertTriangle className="h-3 w-3 text-[var(--alert-warning)]" />
                      <span className="text-sm text-[var(--alert-warning)]">{h.alerts_active}</span>
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

      {/* Price comparisons */}
      {!pricesLoading && priceGroups.length > 0 && (
        <div className="rounded-lg bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[var(--alert-critical)]" />
                <h2 className="text-sm font-semibold text-foreground">Desviaciones de precio entre locales</h2>
              </div>
              {priceIssues > 0 && (
                <Badge className="bg-[var(--alert-critical)]/15 text-[var(--alert-critical)] border-0">
                  {priceIssues} productos con &gt;10% desviacion
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mismo producto, diferente precio por local
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Producto</TableHead>
                <TableHead className="text-muted-foreground">Local</TableHead>
                <TableHead className="text-muted-foreground text-right">Precio</TableHead>
                <TableHead className="text-muted-foreground">Proveedor</TableHead>
                <TableHead className="text-muted-foreground text-center">Desviacion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceGroups.map((group) =>
                group.prices.map((p, idx) => (
                  <TableRow
                    key={`${group.product}-${p.hotel}`}
                    className={cn("border-border", idx === 0 && group.diffPct > 10 && "bg-[var(--alert-critical)]/10")}
                  >
                    {idx === 0 && (
                      <TableCell rowSpan={group.prices.length} className="text-sm font-medium text-foreground align-top">
                        {group.product}
                        <span className="text-muted-foreground ml-1.5 text-xs">{group.unit}</span>
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">{p.hotel}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-sm font-mono",
                        p.price === group.minPrice ? "text-emerald-400" :
                        p.price > group.minPrice * 1.1 ? "text-[var(--alert-critical)] font-semibold" :
                        "text-foreground"
                      )}>
                        {p.price.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.supplier}</TableCell>
                    {idx === 0 && (
                      <TableCell rowSpan={group.prices.length} className="text-center align-top">
                        {group.diffPct > 0 ? (
                          <Badge className={cn(
                            "text-xs border-0",
                            group.diffPct > 20 ? "bg-[var(--alert-critical)]/15 text-[var(--alert-critical)]" :
                            group.diffPct > 10 ? "bg-[var(--alert-warning)]/15 text-[var(--alert-warning)]" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {group.diffPct.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-emerald-400">OK</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
