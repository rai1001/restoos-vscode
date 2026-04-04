"use client"

import { useState } from "react"
import Link from "next/link"
import { useEscandallos, useEscandallo } from "@/features/escandallo/use-escandallo"
import { InvoiceUploader } from "@/features/invoice-ocr/components/InvoiceUploader"
import type { EscandalloRecipe } from "@/features/escandallo/types"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertTriangle,
  Building2,
  Calculator,
  ChefHat,
  FileText,
  Lightbulb,
  Plus,
  TrendingUp,
  UtensilsCrossed,
  Wheat,
  Egg,
  Milk,
} from "lucide-react"
import { toast } from "sonner"
import { useVoiceInput } from "@/hooks/use-voice-input"
import { parseIngredientVoice } from "@/lib/voice-parser"
import { VoiceMicButton } from "@/components/voice-mic-button"

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `€${n.toFixed(2)}`
}

function foodCostColor(pct: number): string {
  if (pct <= 30) return "bg-green-500/10 text-green-400 border-green-500/20"
  if (pct <= 35) return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
  return "bg-red-500/10 text-red-400 border-red-500/20"
}

function foodCostColorLight(pct: number): string {
  if (pct <= 30) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
  if (pct <= 35) return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20"
  return "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function mermaColor(yieldPct: number): string {
  const merma = 100 - yieldPct
  if (merma >= 20) return "bg-red-500/10 text-red-400 border border-red-500/20"
  if (merma >= 10) return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
  return "bg-green-500/10 text-green-400 border border-green-500/20"
}

// ─── Donut Chart (pure CSS) ─────────────────────────────────────────────────

function DonutChart({ totalCost }: { totalCost: number }) {
  const segments = [
    { label: "Proteina Principal", pct: 64, color: "#B8906F" },
    { label: "Guarnicion & Salsas", pct: 21, color: "#3B82F6" },
    { label: "Costes Indirectos", pct: 15, color: "#8B5CF6" },
  ]

  // Build conic-gradient
  let accumulated = 0
  const stops = segments.map(s => {
    const start = accumulated
    accumulated += s.pct
    return `${s.color} ${start}% ${accumulated}%`
  })
  const gradient = `conic-gradient(${stops.join(", ")})`

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div
          className="w-40 h-40 rounded-full"
          style={{ background: gradient }}
        />
        {/* Inner circle for donut effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-card dark:bg-card bg-white flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-primary">{fmt(totalCost)}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Total</span>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="space-y-2 w-full">
        {segments.map(s => (
          <div key={s.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-gray-400 dark:text-gray-400 text-gray-600">{s.label}</span>
            </div>
            <span className="font-medium text-gray-100 dark:text-gray-100 text-gray-800">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtitle,
  subtitleColor = "text-gray-400",
  borderColor = "bg-primary",
}: {
  label: string
  value: string
  subtitle: string
  subtitleColor?: string
  borderColor?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-accent/30 p-5">
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", borderColor)} />
      <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-500 font-medium mb-2 pl-3">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 pl-3">{value}</p>
      <p className={cn("text-xs mt-1 pl-3", subtitleColor)}>{subtitle}</p>
    </div>
  )
}

// ─── Detail Dialog ───────────────────────────────────────────────────────────

function DetailDialog({
  recipeId,
  open,
  onClose,
}: {
  recipeId: string
  open: boolean
  onClose: () => void
}) {
  const { escandallo, evolution } = useEscandallo(recipeId)
  const [toastVisible, setToastVisible] = useState(false)

  const voice = useVoiceInput({
    lang: "es-ES",
    onResult: (transcript) => {
      const parsed = parseIngredientVoice(transcript)
      if (parsed) {
        toast.success(`Ingrediente detectado: ${parsed.quantity} ${parsed.unit} de ${parsed.name}`)
      } else {
        toast.info("No se detecto un ingrediente. Prueba: '300 gramos de harina de trigo'")
      }
    },
    onError: (err) => toast.error(err),
  })

  function handleExportPDF() {
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  if (!escandallo) return null

  const maxCpp = Math.max(...evolution.map(p => p.cost_per_portion), 0.01)
  const firstCpp = evolution[0]?.cost_per_portion ?? escandallo.cost_per_portion
  const lastCpp = evolution[evolution.length - 1]?.cost_per_portion ?? escandallo.cost_per_portion
  const evolutionChangePct =
    firstCpp > 0 ? ((lastCpp - firstCpp) / firstCpp) * 100 : 0
  const targetCostLine = escandallo.selling_price * (escandallo.target_food_cost_pct / 100)

  // Calculate margin
  const marginPct = escandallo.selling_price > 0
    ? ((escandallo.selling_price - escandallo.cost_per_portion) / escandallo.selling_price) * 100
    : 0
  const targetMarginPct = 100 - escandallo.target_food_cost_pct
  const marginDeviation = marginPct - targetMarginPct

  // Mise en place steps (derived from recipe or static demo)
  const miseEnPlace = [
    {
      title: "PREPARACION BASE",
      desc: "Limpiar y cortar todos los ingredientes. Pesar las cantidades exactas segun escandallo. Preparar mise en place completa antes de comenzar coccion.",
    },
    {
      title: "COCCION PRINCIPAL",
      desc: "Aplicar tecnicas de coccion segun ficha tecnica. Controlar temperaturas y tiempos. Verificar puntos de coccion intermedios.",
    },
    {
      title: "EMPLATADO Y SERVICIO",
      desc: "Montar segun foto de referencia. Verificar gramaaje por racion. Aplicar guarnicion y salsa en proporciones del escandallo.",
    },
  ]

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white dark:bg-background border-gray-200 dark:border-accent/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-gray-100">
            <ChefHat className="h-5 w-5 text-primary" />
            {escandallo.name}
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {escandallo.category} · {escandallo.portions} porciones · Objetivo food cost {escandallo.target_food_cost_pct}%
          </p>
        </DialogHeader>

        {toastVisible && (
          <div className="mb-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-sm text-blue-400 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Exportando escandallo...
          </div>
        )}

        <Tabs defaultValue="ingredientes">
          <TabsList className="mb-4 bg-gray-100 dark:bg-card border border-gray-200 dark:border-accent/30">
            <TabsTrigger value="ingredientes" className="data-[state=active]:bg-white dark:data-[state=active]:bg-accent data-[state=active]:text-primary">
              Ingredientes
            </TabsTrigger>
            <TabsTrigger value="evolucion" className="data-[state=active]:bg-white dark:data-[state=active]:bg-accent data-[state=active]:text-primary">
              Evolucion de Costes
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Ingredientes ── */}
          <TabsContent value="ingredientes">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <KpiCard
                label="Coste Total por Racion"
                value={fmt(escandallo.cost_per_portion)}
                subtitle={`${evolutionChangePct >= 0 ? "+" : ""}${evolutionChangePct.toFixed(1)}% vs mes anterior`}
                subtitleColor={evolutionChangePct > 0 ? "text-red-400" : "text-green-400"}
                borderColor="bg-primary"
              />
              <KpiCard
                label="Margen Objetivo"
                value={`${targetMarginPct.toFixed(1)}%`}
                subtitle="Optimizado"
                subtitleColor="text-green-400"
                borderColor="bg-green-500"
              />
              <KpiCard
                label="Precio Recomendado (PVP)"
                value={fmt(escandallo.suggested_price)}
                subtitle="Inc. IVA 10%"
                subtitleColor="text-gray-400 dark:text-gray-500"
                borderColor="bg-primary"
              />
              <KpiCard
                label="Margen Real vs Teorico"
                value={`${marginPct.toFixed(1)}%`}
                subtitle={`Desviacion ${marginDeviation >= 0 ? "+" : ""}${marginDeviation.toFixed(1)}%`}
                subtitleColor={Math.abs(marginDeviation) > 3 ? "text-yellow-400" : "text-green-400"}
                borderColor={Math.abs(marginDeviation) > 3 ? "bg-yellow-500" : "bg-green-500"}
              />
            </div>

            {/* Bento grid: 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left column: col-span-8 */}
              <div className="lg:col-span-8 space-y-4">
                {/* Voice input for ingredient dictation */}
                {voice.isSupported && (
                  <div className={cn(
                    "rounded-xl border p-3 transition-all",
                    voice.status === "listening"
                      ? "border-red-500/30 bg-red-500/5 dark:bg-red-950/20"
                      : "border-dashed border-gray-300 dark:border-accent/50"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">Dictar ingrediente</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">Ej: &quot;300 gramos de harina de trigo&quot;</p>
                        {voice.transcript && (
                          <p className="text-xs italic mt-1 text-gray-400">&quot;{voice.transcript}&quot;</p>
                        )}
                      </div>
                      <VoiceMicButton
                        status={voice.status}
                        isSupported={voice.isSupported}
                        onStart={voice.start}
                        onStop={voice.stop}
                        size="sm"
                      />
                    </div>
                  </div>
                )}

                {/* Ingredients Table - Dark themed */}
                <div className="rounded-xl border border-gray-200 dark:border-accent/30 overflow-hidden bg-white dark:bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-card border-b border-gray-200 dark:border-accent/30 hover:bg-gray-50 dark:hover:bg-card">
                        <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold">Ingrediente</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-center">Unidad</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-right">Cantidad</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-right">P.Neto (&euro;)</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-right">Merma (%)</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-right">Coste Final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {escandallo.ingredients.map(ing => {
                        const merma = 100 - ing.yield_pct
                        return (
                          <TableRow key={ing.id} className="border-b border-gray-100 dark:border-accent/20 hover:bg-gray-50 dark:hover:bg-card/80">
                            <TableCell className="font-medium text-gray-900 dark:text-gray-100">{ing.ingredient_name}</TableCell>
                            <TableCell className="text-center text-gray-500 dark:text-gray-500 text-sm">{ing.unit}</TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{ing.quantity}</TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{fmt(ing.current_unit_price)}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn(
                                "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                                mermaColor(ing.yield_pct)
                              )}>
                                {merma.toFixed(0)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">{fmt(ing.line_cost)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer summary */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-accent/30 bg-gray-50 dark:bg-card px-4 py-3">
                  <div className="flex gap-6 text-sm">
                    <span>
                      <span className="text-gray-500 dark:text-gray-500">Coste total: </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(escandallo.total_cost)}</span>
                    </span>
                    <span>
                      <span className="text-gray-500 dark:text-gray-500">Coste/racion: </span>
                      <span className="font-semibold text-primary">{fmt(escandallo.cost_per_portion)}</span>
                    </span>
                    <span>
                      <span className="text-gray-500 dark:text-gray-500">Food cost: </span>
                      <Badge variant="outline" className={cn("text-xs", foodCostColorLight(escandallo.food_cost_pct))}>
                        {escandallo.food_cost_pct.toFixed(1)}%
                      </Badge>
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportPDF} className="border-gray-300 dark:border-accent/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-accent">
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>

                {/* Mise en Place section */}
                <div className="rounded-xl border border-gray-200 dark:border-accent/30 bg-white dark:bg-card p-5">
                  <h3 className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-500 font-semibold mb-4">
                    Mise en Place
                  </h3>
                  <div className="space-y-4">
                    {miseEnPlace.map((step, i) => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs uppercase font-bold tracking-wide text-gray-900 dark:text-gray-100 mb-1">
                            {step.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column: col-span-4 */}
              <div className="lg:col-span-4 space-y-4">
                {/* Donut Chart - Distribucion de Costes */}
                <div className="rounded-xl border border-gray-200 dark:border-accent/30 bg-white dark:bg-card p-5">
                  <h3 className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-500 font-semibold mb-4">
                    Distribucion de Costes
                  </h3>
                  <DonutChart totalCost={escandallo.cost_per_portion} />
                </div>

                {/* Tip de Rentabilidad */}
                <div className="rounded-xl border border-gray-200 dark:border-accent/30 bg-white dark:bg-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Tip de Rentabilidad</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {escandallo.food_cost_pct > escandallo.target_food_cost_pct
                          ? `El food cost actual (${escandallo.food_cost_pct.toFixed(1)}%) supera el objetivo (${escandallo.target_food_cost_pct}%). Considera ajustar gramajes o buscar proveedores alternativos para los ingredientes de mayor coste.`
                          : `El food cost esta dentro del objetivo. Mantener control de precios de proveedores para preservar el margen actual de ${marginPct.toFixed(1)}%.`
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Suggested price callout */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/5 px-4 py-3 text-sm">
                  <span className="font-medium text-primary">Precio sugerido</span>
                  <span className="text-gray-500 dark:text-gray-400"> con objetivo {escandallo.target_food_cost_pct}% food cost: </span>
                  <span className="text-lg font-bold text-primary">{fmt(escandallo.suggested_price)}</span>
                  {Math.abs(escandallo.suggested_price - escandallo.selling_price) > escandallo.selling_price * 0.1 && (
                    <p className="mt-1 text-xs text-yellow-400">
                      Precio actual {fmt(escandallo.selling_price)} — diferencia &gt;10%
                    </p>
                  )}
                </div>

                {/* Allergens section */}
                <div className="rounded-xl border border-gray-200 dark:border-accent/30 bg-white dark:bg-card p-5">
                  <h3 className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-500 font-semibold mb-3">
                    Alergenos
                  </h3>
                  <div className="flex gap-3">
                    {[
                      { icon: Wheat, label: "Gluten" },
                      { icon: Egg, label: "Huevo" },
                      { icon: Milk, label: "Lacteos" },
                    ].map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-accent/30 border border-gray-200 dark:border-accent/30 flex-1"
                      >
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab: Evolucion de Costes ── */}
          <TabsContent value="evolucion">
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-accent/30 bg-white dark:bg-card p-5">
                <h3 className="mb-4 text-[11px] font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-widest">
                  Coste por racion — ultimos 6 meses
                </h3>

                {/* Pure CSS bar chart */}
                <div className="relative">
                  {/* Y-axis labels */}
                  <div className="flex gap-2">
                    <div className="flex w-10 flex-col justify-between text-right text-xs text-gray-500 dark:text-gray-500" style={{ height: 160 }}>
                      <span>{fmt(maxCpp)}</span>
                      <span>{fmt(maxCpp * 0.5)}</span>
                      <span>&euro;0</span>
                    </div>

                    {/* Chart area */}
                    <div className="relative flex-1 border-b border-l border-gray-200 dark:border-accent/50" style={{ height: 160 }}>
                      {/* Target cost dashed line */}
                      <div
                        className="absolute left-0 right-0 border-t-2 border-dashed border-[var(--alert-warning)] z-10"
                        style={{
                          bottom: `${Math.min((targetCostLine / maxCpp) * 100, 100)}%`,
                        }}
                      >
                        <span className="absolute right-0 -top-5 text-xs text-primary font-medium pr-1">
                          objetivo {fmt(targetCostLine)}
                        </span>
                      </div>

                      {/* Bars */}
                      <div className="absolute inset-0 flex items-end gap-1 px-2 pb-0">
                        {evolution.map((point, i) => {
                          const heightPct = maxCpp > 0 ? (point.cost_per_portion / maxCpp) * 100 : 0
                          const isAboveTarget = point.cost_per_portion > targetCostLine
                          return (
                            <div key={i} className="flex flex-1 flex-col items-center justify-end h-full">
                              <div
                                className={cn(
                                  "w-full rounded-t transition-all",
                                  isAboveTarget ? "bg-red-500/70" : "bg-primary/70"
                                )}
                                style={{ height: `${heightPct}%` }}
                                title={`${point.date}: ${fmt(point.cost_per_portion)} (food cost ${point.food_cost_pct}%)`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* X-axis labels */}
                  <div className="ml-12 flex gap-1 mt-1">
                    {evolution.map((point, i) => (
                      <div key={i} className="flex-1 text-center text-xs text-gray-500 dark:text-gray-500">
                        {new Date(point.date + "T12:00:00").toLocaleDateString("es-ES", { month: "short" })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary stat */}
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <div className="rounded-lg border border-gray-200 dark:border-accent/30 bg-gray-50 dark:bg-card px-3 py-2">
                    <span className="text-gray-500 dark:text-gray-500">Variacion 6 meses: </span>
                    <span className={cn("font-semibold", evolutionChangePct > 0 ? "text-red-400" : "text-green-400")}>
                      {evolutionChangePct > 0 ? "+" : ""}
                      {evolutionChangePct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-accent/30 bg-gray-50 dark:bg-card px-3 py-2">
                    <span className="text-gray-500 dark:text-gray-500">Food cost actual: </span>
                    <Badge variant="outline" className={cn("text-xs", foodCostColor(escandallo.food_cost_pct))}>
                      {escandallo.food_cost_pct.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-accent/30 bg-gray-50 dark:bg-card px-3 py-2">
                    <span className="text-gray-500 dark:text-gray-500">Objetivo: </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{escandallo.target_food_cost_pct}%</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function EscandalloPage() {
  const { escandallos, isLoading } = useEscandallos()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Escandallo Dinamico</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Cargando...</p>
        </div>
      </div>
    )
  }

  if (escandallos.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Escandallo Dinamico</h1>
          <p className="text-muted-foreground mt-1">Coste actualizado de recetas</p>
        </div>
        <InvoiceUploader />
        <EmptyState
          icon={Calculator}
          title="Aun no tienes recetas con coste"
          description="Anade tu primera receta con ingredientes para ver el escandallo dinamico. O sube una factura de proveedor para empezar."
          actionLabel="Crear receta"
          actionHref="/recipes/new"
        />
      </div>
    )
  }

  const alertCount = escandallos.filter(r => r.has_price_alert).length
  const avgCostPerPortion = avg(escandallos.map(r => r.cost_per_portion))
  const avgFoodCostPct = avg(escandallos.map(r => r.food_cost_pct))

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Calculator className="h-6 w-6 text-primary" />
            Escandallo Dinamico
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Coste actualizado de recetas · Precios al dia de hoy
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/escandallo/multi-local">
            <Button variant="outline" className="border-border-subtle">
              <Building2 className="mr-1 h-4 w-4" />
              Multi-Local
            </Button>
          </Link>
          <Link href="/recipes/new">
            <Button className="bg-primary hover:bg-primary/90 text-white border-0">
              <Plus className="mr-1 h-4 w-4" />
              Nuevo escandallo
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Price Alert Banner ── */}
      {alertCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5 px-4 py-3 text-sm text-amber-400 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <span className="font-semibold">{alertCount} receta{alertCount !== 1 ? "s" : ""}</span>{" "}
            {alertCount !== 1 ? "tienen" : "tiene"} ingredientes con variacion de precio &gt;5% desde el ultimo calculo
          </span>
        </div>
      )}

      {/* ── Invoice OCR Upload ── */}
      <InvoiceUploader />

      {/* ── Summary KPI Cards with colored left border ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-accent/30 p-5">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
          <div className="pl-3">
            <div className="flex items-center gap-2 mb-2">
              <UtensilsCrossed className="h-4 w-4 text-gray-400 dark:text-gray-600" />
              <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-500 font-medium">
                Recetas analizadas
              </p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{escandallos.length}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-accent/30 p-5">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
          <div className="pl-3">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-gray-400 dark:text-gray-600" />
              <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-500 font-medium">
                Coste medio / racion
              </p>
            </div>
            <p className="text-3xl font-bold text-primary">{fmt(avgCostPerPortion)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-accent/30 p-5">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
          <div className="pl-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-gray-400 dark:text-gray-600" />
              <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-500 font-medium">
                Food cost medio
              </p>
            </div>
            <p className={cn(
              "text-3xl font-bold",
              avgFoodCostPct <= 30 ? "text-green-400" : avgFoodCostPct <= 35 ? "text-yellow-400" : "text-red-400"
            )}>
              {avgFoodCostPct.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-accent/30 p-5">
          <div className={cn("absolute left-0 top-0 bottom-0 w-1", alertCount > 0 ? "bg-red-500" : "bg-green-500")} />
          <div className="pl-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-gray-400 dark:text-gray-600" />
              <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-500 font-medium">
                Con alerta de precio
              </p>
            </div>
            <p className={cn("text-3xl font-bold", alertCount > 0 ? "text-red-400" : "text-green-400")}>
              {alertCount}
            </p>
          </div>
        </div>
      </div>

      {/* ── Recipes Table - Premium dark styled ── */}
      <div className="rounded-xl border border-gray-200 dark:border-accent/30 overflow-hidden bg-white dark:bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-card border-b border-gray-200 dark:border-accent/30 hover:bg-gray-50 dark:hover:bg-card">
              <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold">Receta</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold">Categoria</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-right">Porciones</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-right">Coste total</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-right">Coste / racion</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-center">Food cost %</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-right">Precio venta</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-right">Precio sugerido</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-center">Alerta</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold text-center">Accion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {escandallos.map((recipe: EscandalloRecipe) => {
              const priceDiffPct =
                recipe.selling_price > 0
                  ? Math.abs((recipe.suggested_price - recipe.selling_price) / recipe.selling_price) * 100
                  : 0
              const suggestedPriceClass =
                priceDiffPct > 10
                  ? "text-primary font-semibold"
                  : "text-gray-500 dark:text-gray-400"

              return (
                <TableRow key={recipe.id} className="border-b border-gray-100 dark:border-accent/20 hover:bg-gray-50 dark:hover:bg-accent/20 transition-colors">
                  <TableCell className="font-medium max-w-[220px] text-gray-900 dark:text-gray-100">
                    <span className="flex items-center gap-1.5 truncate">
                      <ChefHat className="h-3.5 w-3.5 flex-shrink-0 text-primary/50" />
                      <span className="truncate">{recipe.name}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal border-gray-200 dark:border-accent/50 text-gray-600 dark:text-gray-400">
                      {recipe.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-gray-700 dark:text-gray-300">{recipe.portions}</TableCell>
                  <TableCell className="text-right font-medium text-gray-900 dark:text-gray-100">{fmt(recipe.total_cost)}</TableCell>
                  <TableCell className="text-right font-bold text-primary">{fmt(recipe.cost_per_portion)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("text-xs", foodCostColor(recipe.food_cost_pct))}>
                      {recipe.food_cost_pct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-gray-700 dark:text-gray-300">{fmt(recipe.selling_price)}</TableCell>
                  <TableCell className={cn("text-right", suggestedPriceClass)}>
                    {fmt(recipe.suggested_price)}
                  </TableCell>
                  <TableCell className="text-center">
                    {recipe.has_price_alert ? (
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" title="Variacion >5% en algun ingrediente" />
                    ) : (
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500" title="Sin alertas de precio" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedId(recipe.id)}
                      className="border-gray-200 dark:border-accent/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-accent hover:text-primary transition-colors text-xs"
                    >
                      Ver detalle
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Detail Dialog ── */}
      {selectedId && (
        <DetailDialog
          recipeId={selectedId}
          open={selectedId !== null}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
