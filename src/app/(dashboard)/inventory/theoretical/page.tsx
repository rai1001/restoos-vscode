"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, AlertTriangle, TrendingDown } from "lucide-react"
import { CSVImportSales } from "@/features/sales/components/csv-import-sales"
import { cn } from "@/lib/utils"

// Mock data: theoretical vs real stock comparison
const MOCK_COMPARISON = [
  { product: "Aceite de oliva virgen extra", unit: "L", theoretical: 7.2, real: 5.0, diff: -2.2, diffPct: -30.6, reason: "Merma no registrada" },
  { product: "Solomillo de ternera", unit: "kg", theoretical: 18.5, real: 17.8, diff: -0.7, diffPct: -3.8, reason: null },
  { product: "Patata gallega", unit: "kg", theoretical: 6.0, real: 5.5, diff: -0.5, diffPct: -8.3, reason: null },
  { product: "Tomate fresco", unit: "kg", theoretical: 1.8, real: 0.5, diff: -1.3, diffPct: -72.2, reason: "Posible merma por maduración" },
  { product: "Leche entera", unit: "L", theoretical: 4.0, real: 4.0, diff: 0, diffPct: 0, reason: null },
  { product: "Huevo fresco", unit: "ud", theoretical: 22, real: 18, diff: -4, diffPct: -18.2, reason: "Rotura no registrada" },
  { product: "Salmón noruego", unit: "kg", theoretical: 5.8, real: 5.5, diff: -0.3, diffPct: -5.2, reason: null },
  { product: "Queso crema", unit: "kg", theoretical: 1.5, real: 1.5, diff: 0, diffPct: 0, reason: null },
  { product: "Arroz bomba", unit: "kg", theoretical: 3.2, real: 3.0, diff: -0.2, diffPct: -6.3, reason: null },
  { product: "Nata 35% MG", unit: "L", theoretical: 1.0, real: 0.3, diff: -0.7, diffPct: -70.0, reason: "¿Consumo en platos no registrados?" },
  { product: "Lacón gallego", unit: "kg", theoretical: 4.2, real: 4.0, diff: -0.2, diffPct: -4.8, reason: null },
  { product: "Pulpo fresco", unit: "kg", theoretical: 3.5, real: 3.5, diff: 0, diffPct: 0, reason: null },
]

function DiffBadge({ pct }: { pct: number }) {
  if (pct === 0) return <Badge className="bg-emerald-500/15 text-emerald-400 border-0">OK</Badge>
  if (Math.abs(pct) <= 10) return <Badge className="bg-yellow-500/15 text-yellow-400 border-0">{pct.toFixed(1)}%</Badge>
  return <Badge className="bg-red-500/15 text-red-400 border-0">{pct.toFixed(1)}%</Badge>
}

export default function TheoreticalInventoryPage() {
  const [lastImport] = useState("30 mar 2026, 14:30")

  const totalItems = MOCK_COMPARISON.length
  const withDiff = MOCK_COMPARISON.filter(c => c.diffPct !== 0).length
  const critical = MOCK_COMPARISON.filter(c => Math.abs(c.diffPct) > 20).length
  const totalLoss = MOCK_COMPARISON
    .filter(c => c.diff < 0)
    .reduce((s, c) => s + Math.abs(c.diff) * (c.unit === "kg" ? 12 : c.unit === "L" ? 5 : 0.3), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Inventario
              </Button>
            </Link>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            ANÁLISIS
          </p>
          <h1 className="text-3xl font-bold text-foreground">Teórico vs Real</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Comparación del stock según ventas vs conteo físico · Última importación: {lastImport}
          </p>
        </div>
        <CSVImportSales />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg bg-card border-l-4 border-l-blue-500 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Productos analizados</p>
          <p className="text-2xl font-bold text-blue-400">{totalItems}</p>
        </div>
        <div className="rounded-lg bg-card border-l-4 border-l-yellow-500 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Con desviación</p>
          <p className="text-2xl font-bold text-yellow-400">{withDiff}</p>
        </div>
        <div className="rounded-lg bg-card border-l-4 border-l-red-500 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Críticos (&gt;20%)</p>
          <p className="text-2xl font-bold text-red-400">{critical}</p>
        </div>
        <div className="rounded-lg bg-card border-l-4 border-l-primary p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pérdida estimada</p>
          <p className="text-2xl font-bold text-primary">{totalLoss.toFixed(0)}€</p>
        </div>
      </div>

      {/* Alert */}
      {critical > 0 && (
        <div className="rounded-lg bg-red-950/20 border border-red-800/30 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">
              {critical} producto{critical > 1 ? "s" : ""} con desviación superior al 20%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Revisa si hay merma no registrada, consumos en platos fuera de carta, o errores de conteo
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border-subtle hover:bg-transparent">
              <TableHead className="text-muted-foreground">Producto</TableHead>
              <TableHead className="text-muted-foreground text-right">Teórico</TableHead>
              <TableHead className="text-muted-foreground text-right">Real</TableHead>
              <TableHead className="text-muted-foreground text-right">Diferencia</TableHead>
              <TableHead className="text-muted-foreground">Desviación</TableHead>
              <TableHead className="text-muted-foreground">Posible causa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_COMPARISON
              .sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct))
              .map((item, idx) => (
              <TableRow key={idx} className={cn(
                "border-border-subtle",
                Math.abs(item.diffPct) > 20 && "bg-red-950/10"
              )}>
                <TableCell className="font-medium text-foreground">{item.product}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.theoretical} {item.unit}
                </TableCell>
                <TableCell className="text-right text-foreground">
                  {item.real} {item.unit}
                </TableCell>
                <TableCell className="text-right">
                  {item.diff !== 0 ? (
                    <span className={item.diff < 0 ? "text-red-400" : "text-emerald-400"}>
                      {item.diff > 0 ? "+" : ""}{item.diff} {item.unit}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell><DiffBadge pct={item.diffPct} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {item.reason && (
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-red-400" />
                      {item.reason}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
