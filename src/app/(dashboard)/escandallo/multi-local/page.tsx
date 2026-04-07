"use client"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { DemoBanner } from "@/components/demo-banner"

// ── Mock: misma receta, coste diferente por local ────────────────────────────

interface RecipeByLocal {
  recipeName: string
  category: string
  portions: number
  sellingPrice: number // mismo PVP en todos
  locals: Array<{
    name: string
    shortName: string
    costPerPortion: number
    foodCostPct: number
    monthlyVolume: number // raciones vendidas/mes
    monthlyProfit: number
  }>
}

const MOCK_RECIPES_BY_LOCAL: RecipeByLocal[] = [
  {
    recipeName: "Callos de Culuca",
    category: "Principal",
    portions: 1,
    sellingPrice: 14.00,
    locals: [
      { name: "Culuca Cociña-Bar", shortName: "Culuca", costPerPortion: 2.80, foodCostPct: 20.0, monthlyVolume: 320, monthlyProfit: 3584 },
      { name: "Taberna da Galera", shortName: "Galera", costPerPortion: 3.15, foodCostPct: 22.5, monthlyVolume: 180, monthlyProfit: 1953 },
      { name: "Taberna da Tabacalera", shortName: "Tabacalera", costPerPortion: 3.40, foodCostPct: 24.3, monthlyVolume: 140, monthlyProfit: 1484 },
    ],
  },
  {
    recipeName: "Croquetas de jamón (6 uds)",
    category: "Entrante",
    portions: 1,
    sellingPrice: 9.50,
    locals: [
      { name: "Culuca Cociña-Bar", shortName: "Culuca", costPerPortion: 2.70, foodCostPct: 28.4, monthlyVolume: 280, monthlyProfit: 1904 },
      { name: "Taberna da Galera", shortName: "Galera", costPerPortion: 2.70, foodCostPct: 28.4, monthlyVolume: 220, monthlyProfit: 1496 },
      { name: "Taberna da Tabacalera", shortName: "Tabacalera", costPerPortion: 2.70, foodCostPct: 28.4, monthlyVolume: 160, monthlyProfit: 1088 },
    ],
  },
  {
    recipeName: "Ensaladilla rusa",
    category: "Entrante",
    portions: 1,
    sellingPrice: 8.50,
    locals: [
      { name: "Culuca Cociña-Bar", shortName: "Culuca", costPerPortion: 1.90, foodCostPct: 22.4, monthlyVolume: 200, monthlyProfit: 1320 },
      { name: "Taberna da Galera", shortName: "Galera", costPerPortion: 2.20, foodCostPct: 25.9, monthlyVolume: 150, monthlyProfit: 945 },
      { name: "Taberna da Tabacalera", shortName: "Tabacalera", costPerPortion: 2.35, foodCostPct: 27.6, monthlyVolume: 90, monthlyProfit: 554 },
    ],
  },
  {
    recipeName: "Tortilla jugosa",
    category: "Entrante",
    portions: 1,
    sellingPrice: 9.00,
    locals: [
      { name: "Culuca Cociña-Bar", shortName: "Culuca", costPerPortion: 1.50, foodCostPct: 16.7, monthlyVolume: 250, monthlyProfit: 1875 },
      { name: "Taberna da Galera", shortName: "Galera", costPerPortion: 1.80, foodCostPct: 20.0, monthlyVolume: 180, monthlyProfit: 1296 },
      { name: "Taberna da Tabacalera", shortName: "Tabacalera", costPerPortion: 1.95, foodCostPct: 21.7, monthlyVolume: 120, monthlyProfit: 846 },
    ],
  },
  {
    recipeName: "Pulpo á feira",
    category: "Principal",
    portions: 1,
    sellingPrice: 18.00,
    locals: [
      { name: "Taberna da Galera", shortName: "Galera", costPerPortion: 4.50, foodCostPct: 25.0, monthlyVolume: 120, monthlyProfit: 1620 },
    ],
  },
  {
    recipeName: "Chuletón vaca gallega 1kg",
    category: "Principal",
    portions: 2,
    sellingPrice: 52.00,
    locals: [
      { name: "Taberna da Tabacalera", shortName: "Tabacalera", costPerPortion: 19.00, foodCostPct: 36.5, monthlyVolume: 80, monthlyProfit: 1120 },
    ],
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function findCheapest(locals: RecipeByLocal["locals"]): number {
  return Math.min(...locals.map(l => l.costPerPortion))
}

function findMostExpensive(locals: RecipeByLocal["locals"]): number {
  return Math.max(...locals.map(l => l.costPerPortion))
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EscandalloMultiLocalPage() {
  // Stats
  const recipesShared = MOCK_RECIPES_BY_LOCAL.filter(r => r.locals.length > 1)
  const totalSavingIfBestPrice = recipesShared.reduce((total, recipe) => {
    const cheapest = findCheapest(recipe.locals)
    return total + recipe.locals.reduce((sum, local) => {
      const saving = (local.costPerPortion - cheapest) * local.monthlyVolume
      return sum + Math.max(0, saving)
    }, 0)
  }, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/escandallo">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Escandallo
            </Button>
          </Link>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          ESCANDALLO MULTI-LOCAL
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Comparativa de costes por local
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Misma receta, diferente coste — ¿dónde se escapa el margen?
        </p>
      </div>

      <DemoBanner module="Multi-local" />

      {/* Saving opportunity */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-5 flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Ahorro potencial: €{totalSavingIfBestPrice.toFixed(0)}/mes
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Si todos los locales comprasen al mejor precio disponible del grupo para cada ingrediente.
            Esto es {recipesShared.length} recetas compartidas × {MOCK_RECIPES_BY_LOCAL.reduce((s, r) => s + r.locals.length, 0)} puntos de venta.
          </p>
        </div>
      </div>

      {/* Recipes comparison */}
      {MOCK_RECIPES_BY_LOCAL.map((recipe, idx) => {
        const cheapest = recipe.locals.length > 1 ? findCheapest(recipe.locals) : null
        const mostExpensive = recipe.locals.length > 1 ? findMostExpensive(recipe.locals) : null
        const hasDiff = cheapest !== null && mostExpensive !== null && mostExpensive > cheapest * 1.05

        return (
          <div key={idx} className={cn(
            "rounded-lg bg-card overflow-hidden",
            hasDiff && "ring-1 ring-yellow-700/30"
          )}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{recipe.recipeName}</h3>
                  <p className="text-xs text-muted-foreground">{recipe.category} · PVP {recipe.sellingPrice.toFixed(2)}€ · {recipe.locals.length} local{recipe.locals.length > 1 ? "es" : ""}</p>
                </div>
              </div>
              {hasDiff && cheapest && mostExpensive && (
                <Badge className="bg-[var(--alert-warning)]/15 text-[var(--alert-warning)] border-0 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {(((mostExpensive - cheapest) / cheapest) * 100).toFixed(0)}% desviación
                </Badge>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Local</TableHead>
                  <TableHead className="text-muted-foreground text-right">Coste/ración</TableHead>
                  <TableHead className="text-muted-foreground text-center">Food cost %</TableHead>
                  <TableHead className="text-muted-foreground text-right">Volumen/mes</TableHead>
                  <TableHead className="text-muted-foreground text-right">Margen/mes</TableHead>
                  <TableHead className="text-muted-foreground text-right">Ahorro posible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipe.locals.map((local, li) => {
                  const isCheapest = cheapest !== null && local.costPerPortion === cheapest
                  const isMostExpensive = mostExpensive !== null && local.costPerPortion === mostExpensive && hasDiff
                  const savingPerUnit = cheapest !== null ? local.costPerPortion - cheapest : 0
                  const savingTotal = savingPerUnit * local.monthlyVolume

                  return (
                    <TableRow key={li} className={cn("border-border", isMostExpensive && "bg-[var(--alert-critical)]/10")}>
                      <TableCell className="text-sm font-medium text-foreground">{local.shortName}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "text-sm font-mono",
                          isCheapest ? "text-emerald-400 font-semibold" :
                          isMostExpensive ? "text-[var(--alert-critical)] font-semibold" : "text-foreground"
                        )}>
                          {local.costPerPortion.toFixed(2)}€
                        </span>
                        {isCheapest && recipe.locals.length > 1 && (
                          <TrendingDown className="h-3 w-3 text-emerald-400 inline ml-1" />
                        )}
                        {isMostExpensive && (
                          <TrendingUp className="h-3 w-3 text-[var(--alert-critical)] inline ml-1" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-xs border-0",
                          local.foodCostPct > 32 ? "bg-[var(--alert-critical)]/15 text-[var(--alert-critical)]" :
                          local.foodCostPct > 28 ? "bg-[var(--alert-warning)]/15 text-[var(--alert-warning)]" :
                          "bg-emerald-500/15 text-emerald-400"
                        )}>
                          {local.foodCostPct.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {local.monthlyVolume} raciones
                      </TableCell>
                      <TableCell className="text-right text-sm text-foreground font-mono">
                        €{local.monthlyProfit.toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {savingTotal > 0 ? (
                          <span className="text-sm font-semibold text-primary">
                            €{savingTotal.toFixed(0)}/mes
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400">Mejor precio</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )
      })}
    </div>
  )
}
