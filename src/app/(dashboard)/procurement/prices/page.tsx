"use client"

import { useState, useMemo } from "react"
import { useProducts } from "@/features/catalog/hooks/use-products"
import { useSuppliers } from "@/features/catalog/hooks/use-suppliers"
import { usePriceHistory, usePriceAlerts } from "@/features/procurement/hooks/use-price-history"
import { PriceTrendChart } from "@/features/procurement/components/price-trend-chart"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, TrendingUp, TrendingDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Supplier } from "@/features/catalog/schemas/catalog.schema"

const PERIOD_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "365", label: "1 ano" },
]

export default function PricesPage() {
  const { data: products = [] } = useProducts()
  const { data: suppliers = [] } = useSuppliers()
  const { data: alerts = [] } = usePriceAlerts(15)

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [period, setPeriod] = useState("30")
  const [searchQuery, setSearchQuery] = useState("")

  const dateFrom = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - parseInt(period))
    return d.toISOString().slice(0, 10)
  }, [period])

  const { data: priceData = [] } = usePriceHistory(selectedProductId ?? undefined, {
    dateFrom,
  })

  const supplierMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(suppliers as Supplier[]).forEach((s) => map.set(s.id, s.name))
    return map
  }, [suppliers])

  const filteredProducts = useMemo(() => {
    const active = products.filter((p: { is_active: boolean }) => p.is_active)
    if (!searchQuery.trim()) return active.slice(0, 20)
    const q = searchQuery.toLowerCase()
    return active.filter((p: { name: string }) => p.name.toLowerCase().includes(q)).slice(0, 20)
  }, [products, searchQuery])

  const selectedProduct = products.find((p: { id: string }) => p.id === selectedProductId)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          Analisis de Precios
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Precios de Compra
        </h1>
      </div>

      {/* Price alerts */}
      {alerts.length > 0 && (
        <div className="rounded-lg bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Alertas de precios ({alerts.length})
            </p>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <button
                key={alert.productId}
                onClick={() => setSelectedProductId(alert.productId)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-card-hover transition-colors"
              >
                <span className="font-medium text-foreground">{alert.productName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {alert.avg30d.toFixed(2)} € → {alert.latest.toFixed(2)} €
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-xs font-semibold tabular-nums",
                      alert.changePercent > 0 ? "text-[var(--alert-critical)]" : "text-emerald-500"
                    )}
                  >
                    {alert.changePercent > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {alert.changePercent > 0 ? "+" : ""}
                    {alert.changePercent.toFixed(1)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content: product selector + chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Product list */}
        <div>
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {filteredProducts.map((product: { id: string; name: string }) => (
              <button
                key={product.id}
                onClick={() => setSelectedProductId(product.id)}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  selectedProductId === product.id
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-card-hover"
                )}
              >
                {product.name}
              </button>
            ))}
          </div>
        </div>

        {/* Price chart */}
        <div>
          {!selectedProductId ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg bg-card">
              <Search className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Selecciona un producto para ver su historico de precios
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Product header + period selector */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {(selectedProduct as { name: string } | undefined)?.name ?? "Producto"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {priceData.length} observaciones de precio
                  </p>
                </div>
                <Select value={period} onValueChange={(v) => setPeriod(v ?? "30")}>
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chart */}
              <PriceTrendChart
                data={priceData}
                supplierNames={supplierMap}
                height={300}
              />

              {/* Price table */}
              {priceData.length > 0 && (
                <div className="rounded-lg bg-card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Fecha", "Proveedor", "Precio", "Cantidad", "Fuente"].map((h) => (
                          <th
                            key={h}
                            className={`py-2 px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground ${
                              h === "Precio" || h === "Cantidad" ? "text-right" : "text-left"
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...priceData].reverse().slice(0, 30).map((entry) => (
                        <tr key={entry.id} className="border-b border-card-hover hover:bg-card-hover transition-colors">
                          <td className="py-2 px-4 text-muted-foreground">{entry.date}</td>
                          <td className="py-2 px-4 text-foreground">
                            {supplierMap.get(entry.supplier_id) ?? entry.supplier_id.slice(0, 8)}
                          </td>
                          <td className="py-2 px-4 text-right font-medium tabular-nums text-foreground">
                            {entry.unit_price.toFixed(2)} €
                          </td>
                          <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">
                            {entry.quantity?.toFixed(1) ?? "—"}
                          </td>
                          <td className="py-2 px-4">
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                              entry.source === "receipt" && "bg-primary/10 text-primary",
                              entry.source === "ocr" && "bg-blue-500/10 text-blue-400",
                              entry.source === "manual" && "bg-[rgba(255,255,255,0.03)] text-muted-foreground",
                            )}>
                              {entry.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
