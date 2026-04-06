"use client"

import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface PricePoint {
  date: string
  supplier: string
  price: number
  variation: number // % vs previous
}

// Mock price history — in real app comes from goods_receipt_lines + supplier_offers
const MOCK_PRICE_HISTORY: Record<string, PricePoint[]> = {
  "Aceite de oliva virgen extra": [
    { date: "2026-03-28", supplier: "Distribuciones Gallaecia", price: 4.80, variation: 6.7 },
    { date: "2026-03-15", supplier: "Distribuciones Gallaecia", price: 4.50, variation: 0 },
    { date: "2026-03-01", supplier: "Distribuciones Gallaecia", price: 4.50, variation: -5.3 },
    { date: "2026-02-15", supplier: "Distribuciones Gallaecia", price: 4.75, variation: 2.2 },
    { date: "2026-02-01", supplier: "Distribuciones Gallaecia", price: 4.65, variation: 0 },
    { date: "2026-01-15", supplier: "Distribuciones Gallaecia", price: 4.65, variation: 3.3 },
  ],
  "Solomillo de ternera": [
    { date: "2026-03-28", supplier: "Carnicería Rial", price: 19.50, variation: 8.3 },
    { date: "2026-03-14", supplier: "Carnicería Rial", price: 18.00, variation: 0 },
    { date: "2026-03-01", supplier: "Carnicería Rial", price: 18.00, variation: -2.7 },
    { date: "2026-02-15", supplier: "Carnicería Rial", price: 18.50, variation: 0 },
    { date: "2026-02-01", supplier: "Carnicería Rial", price: 18.50, variation: 5.7 },
    { date: "2026-01-15", supplier: "Carnicería Rial", price: 17.50, variation: 0 },
  ],
  "Salmón noruego": [
    { date: "2026-03-28", supplier: "Pescadería O Porto", price: 14.20, variation: -3.4 },
    { date: "2026-03-14", supplier: "Pescadería O Porto", price: 14.70, variation: 5.0 },
    { date: "2026-03-01", supplier: "Pescadería O Porto", price: 14.00, variation: 0 },
    { date: "2026-02-15", supplier: "Pescadería O Porto", price: 14.00, variation: -6.7 },
    { date: "2026-02-01", supplier: "Pescadería O Porto", price: 15.00, variation: 0 },
  ],
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const w = 120
  const h = 30
  const step = w / (points.length - 1)

  const pathData = points
    .map((p, i) => {
      const x = i * step
      const y = h - ((p - min) / range) * (h - 4) - 2
      return `${i === 0 ? "M" : "L"}${x},${y}`
    })
    .join(" ")

  const lastPoint = points[points.length - 1]!
  const firstPoint = points[0]!
  const trend = lastPoint > firstPoint ? "#ef4444" : lastPoint < firstPoint ? "#22c55e" : "#a78b7d"

  return (
    <svg width={w} height={h} className="inline-block">
      <path d={pathData} fill="none" stroke={trend} strokeWidth={1.5} />
      <circle cx={(points.length - 1) * step} cy={h - ((lastPoint - min) / range) * (h - 4) - 2} r={2.5} fill={trend} />
    </svg>
  )
}

export function PriceHistory({ productName }: { productName: string }) {
  const history = MOCK_PRICE_HISTORY[productName]

  if (!history || history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Sin historial de precios</p>
    )
  }

  const prices = [...history].reverse().map(h => h.price)
  const currentPrice = history[0]!.price
  const oldestPrice = history[history.length - 1]!.price
  const totalVariation = ((currentPrice - oldestPrice) / oldestPrice) * 100

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Historial de precios</p>
          <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-2">
          <Sparkline points={prices} />
          <Badge className={`text-xs ${
            totalVariation > 2 ? "bg-[var(--alert-critical)]/15 text-[var(--alert-critical)] border-0" :
            totalVariation < -2 ? "bg-emerald-500/15 text-emerald-400 border-0" :
            "bg-accent text-muted-foreground border-0"
          }`}>
            {totalVariation > 0 ? "+" : ""}{totalVariation.toFixed(1)}% total
          </Badge>
        </div>
      </div>

      <div className="space-y-1">
        {history.map((point, idx) => (
          <div key={idx} className="flex items-center justify-between py-1 text-xs border-b border-border-subtle last:border-0">
            <span className="text-muted-foreground w-20">{point.date.slice(5)}</span>
            <span className="text-muted-foreground flex-1 truncate">{point.supplier}</span>
            <span className="text-foreground font-mono w-16 text-right">{point.price.toFixed(2)}€</span>
            <span className="w-14 text-right">
              {point.variation !== 0 ? (
                <span className={`inline-flex items-center gap-0.5 ${
                  point.variation > 0 ? "text-[var(--alert-critical)]" : "text-emerald-400"
                }`}>
                  {point.variation > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(point.variation).toFixed(1)}%
                </span>
              ) : (
                <Minus className="h-2.5 w-2.5 text-muted-foreground inline" />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Standalone page/section showing products with highest price volatility */
export function PriceAlertsSummary() {
  const allProducts = Object.entries(MOCK_PRICE_HISTORY)
    .map(([name, history]) => {
      const latest = history[0]!
      return { name, ...latest }
    })
    .filter(p => Math.abs(p.variation) > 3)
    .sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation))

  if (allProducts.length === 0) return null

  return (
    <div className="rounded-lg bg-card p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        Alertas de precio — últimas entregas
      </p>
      {allProducts.map((p, idx) => (
        <div key={idx} className="flex items-center justify-between py-1 border-b border-border-subtle last:border-0">
          <span className="text-sm text-foreground">{p.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">{p.price.toFixed(2)}€</span>
            <Badge className={`text-xs ${
              p.variation > 0
                ? "bg-[var(--alert-critical)]/15 text-[var(--alert-critical)] border-0"
                : "bg-emerald-500/15 text-emerald-400 border-0"
            }`}>
              {p.variation > 0 ? "↑" : "↓"}{Math.abs(p.variation).toFixed(1)}%
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
