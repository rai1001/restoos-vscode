"use client"

import { useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { SERIES_COLORS } from "@/lib/chart-config"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PriceHistoryEntry } from "../services/price-history.service"

interface PriceTrendChartProps {
  data: PriceHistoryEntry[]
  supplierNames?: Map<string, string>
  height?: number
}

export function PriceTrendChart({
  data,
  supplierNames = new Map(),
  height = 240,
}: PriceTrendChartProps) {
  // Group by date, with one series per supplier
  const { chartData, suppliers } = useMemo(() => {
    const supplierSet = new Set<string>()
    const byDate = new Map<string, Record<string, number>>()

    for (const entry of data) {
      supplierSet.add(entry.supplier_id)
      const existing = byDate.get(entry.date) ?? {}
      existing[entry.supplier_id] = entry.unit_price
      byDate.set(entry.date, existing)
    }

    const suppliers = [...supplierSet]
    const chartData = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, prices]) => ({
        date: date.slice(5), // MM-DD
        fullDate: date,
        ...prices,
      }))

    return { chartData, suppliers }
  }, [data])

  // Stats
  const stats = useMemo(() => {
    if (data.length === 0) return null
    const prices = data.map((d) => d.unit_price)
    const latest = prices[prices.length - 1]!
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    const min = Math.min(...prices)
    const max = Math.max(...prices)

    let trend: "up" | "down" | "stable" = "stable"
    let changePercent = 0
    if (prices.length >= 4) {
      const mid = Math.floor(prices.length / 2)
      const recentAvg = prices.slice(mid).reduce((a, b) => a + b, 0) / (prices.length - mid)
      const olderAvg = prices.slice(0, mid).reduce((a, b) => a + b, 0) / mid
      if (olderAvg > 0) {
        changePercent = ((recentAvg - olderAvg) / olderAvg) * 100
        if (changePercent > 3) trend = "up"
        else if (changePercent < -3) trend = "down"
      }
    }

    return { latest, avg, min, max, trend, changePercent }
  }, [data])

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg bg-card text-sm text-muted-foreground">
        Sin datos de precios
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-muted-foreground">Ultimo: </span>
            <span className="font-semibold text-foreground tabular-nums">{stats.latest.toFixed(2)} €</span>
          </div>
          <div>
            <span className="text-muted-foreground">Media: </span>
            <span className="tabular-nums text-foreground">{stats.avg.toFixed(2)} €</span>
          </div>
          <div>
            <span className="text-muted-foreground">Min/Max: </span>
            <span className="tabular-nums text-foreground">{stats.min.toFixed(2)} – {stats.max.toFixed(2)} €</span>
          </div>
          <div className="flex items-center gap-1">
            {stats.trend === "up" ? (
              <TrendingUp className="h-3.5 w-3.5 text-red-400" />
            ) : stats.trend === "down" ? (
              <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span
              className={cn(
                "font-semibold tabular-nums",
                stats.trend === "up" && "text-red-400",
                stats.trend === "down" && "text-emerald-500",
                stats.trend === "stable" && "text-muted-foreground"
              )}
            >
              {stats.changePercent > 0 ? "+" : ""}
              {stats.changePercent.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="rounded-lg bg-card p-4">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#706860" }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#706860" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}€`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1E1E1E",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#8A8078" }}
               
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recharts Tooltip generic types are incompatible
              formatter={((value: number, name: string) => [`${value.toFixed(2)} €`, supplierNames.get(name) ?? name.slice(0, 8)]) as any}
            />
            {suppliers.map((supplierId, i) => (
              <Line
                key={supplierId}
                type="monotone"
                dataKey={supplierId}
                name={supplierId}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {suppliers.length > 1 && (
        <div className="flex flex-wrap gap-4">
          {suppliers.map((sid, i) => (
            <div key={sid} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
              />
              <span className="text-muted-foreground">
                {supplierNames.get(sid) ?? sid.slice(0, 8)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
