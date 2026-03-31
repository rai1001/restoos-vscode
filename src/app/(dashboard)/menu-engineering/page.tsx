"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useMenuEngineering } from "@/features/menu-engineering/use-menu-engineering"
import {
  CATEGORY_LABELS,
  QUADRANT_CONFIG,
  type MenuCategory,
  type MatrixQuadrant,
  type MenuDishAnalysis,
} from "@/features/menu-engineering/types"
import { generateRecommendations } from "@/features/menu-engineering/recommendation-engine"
import { RecommendationsTab } from "@/features/menu-engineering/components/recommendations-tab"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
  ZAxis,
} from "recharts"
import {
  CHART_COLORS,
  CHART_THEME,
} from "@/lib/chart-config"

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  emoji,
}: {
  label: string
  value: string
  sub?: string
  emoji: string
}) {
  return (
    <div className="rounded-lg bg-[#1A1A1A] p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#A78B7D]">
        <span>{emoji}</span>
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-[#E5E2E1]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#A78B7D]">{sub}</p>}
    </div>
  )
}

// ─── Quadrant Card ───────────────────────────────────────────────────────────

function QuadrantCard({
  quadrant,
  dishes,
}: {
  quadrant: MatrixQuadrant
  dishes: MenuDishAnalysis[]
}) {
  const cfg = QUADRANT_CONFIG[quadrant]

  // Map quadrants to dark bg tints
  const quadrantBg: Record<MatrixQuadrant, string> = {
    estrella: "bg-[#1A1A0A]",
    vaca: "bg-[#0A1A1A]",
    enigma: "bg-[#1A1A1A]",
    perro: "bg-[#1A0A0A]",
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg p-4",
        quadrantBg[quadrant],
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg leading-none">{cfg.emoji}</span>
            <span className={cn("font-bold text-xs uppercase tracking-widest", cfg.color)}>
              {cfg.label}
            </span>
            <span
              className="ml-1 rounded-md bg-[#0A0A0A] px-2 py-0.5 text-xs font-semibold text-[#E5E2E1]"
            >
              {dishes.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#A78B7D]">{cfg.description}</p>
        </div>
      </div>

      {/* Recommendation */}
      <p className={cn("mb-3 text-xs italic", cfg.color)}>
        {cfg.recommendation}
      </p>

      {/* Dish list */}
      <div className="flex flex-col gap-1.5">
        {dishes.length === 0 ? (
          <p className="text-xs text-[#A78B7D]">Sin platos en este cuadrante</p>
        ) : (
          dishes.map((dish) => (
            <div
              key={dish.id}
              className="flex items-start justify-between gap-2 rounded-md bg-[#0A0A0A]/60 px-2.5 py-1.5 text-xs"
            >
              <span className="font-medium leading-snug text-[#E5E2E1]">{dish.name}</span>
              <span className="shrink-0 text-[#A78B7D]">
                {dish.contribution_margin.toFixed(2)}€ · {dish.units_sold} uds
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Table View ──────────────────────────────────────────────────────────────

type SortColumn =
  | "name"
  | "category"
  | "selling_price"
  | "cost_price"
  | "contribution_margin"
  | "contribution_margin_pct"
  | "units_sold"
  | "quadrant"

function QuadrantBadge({ quadrant }: { quadrant: MatrixQuadrant }) {
  const cfg = QUADRANT_CONFIG[quadrant]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-[#0A0A0A] px-2 py-0.5 text-xs font-medium uppercase tracking-widest",
        cfg.color,
      )}
    >
      {cfg.emoji} {cfg.label}
    </span>
  )
}

function TableView({ dishes }: { dishes: MenuDishAnalysis[] }) {
  const [sortCol, setSortCol] = useState<SortColumn>("units_sold")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  function handleSort(col: SortColumn) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortCol(col)
      setSortDir("desc")
    }
  }

  const sorted = useMemo(() => {
    return [...dishes].sort((a, b) => {
      let av: string | number = a[sortCol] as string | number
      let bv: string | number = b[sortCol] as string | number
      if (typeof av === "string") av = av.toLowerCase()
      if (typeof bv === "string") bv = bv.toLowerCase()
      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }, [dishes, sortCol, sortDir])

  const totalRevenue = dishes.reduce((a, d) => a + d.selling_price * d.units_sold, 0)
  const totalCost = dishes.reduce((a, d) => a + d.cost_price * d.units_sold, 0)
  const totalContrib = dishes.reduce((a, d) => a + d.total_contribution, 0)
  const totalUnits = dishes.reduce((a, d) => a + d.units_sold, 0)

  const SortIcon = ({ col }: { col: SortColumn }) =>
    sortCol === col ? (
      <span className="ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
    ) : (
      <span className="ml-1 text-xs text-[#A78B7D]/40">↕</span>
    )

  const Th = ({
    col,
    children,
    right,
  }: {
    col: SortColumn
    children: React.ReactNode
    right?: boolean
  }) => (
    <th
      onClick={() => handleSort(col)}
      className={cn(
        "cursor-pointer select-none whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-widest text-[#A78B7D] hover:text-[#E5E2E1] transition-colors",
        right ? "text-right" : "text-left",
      )}
    >
      {children}
      <SortIcon col={col} />
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-lg bg-[#1A1A1A]">
      <table className="w-full text-sm">
        <thead className="bg-[#111111]">
          <tr>
            <Th col="name">Plato</Th>
            <Th col="category">Categoria</Th>
            <Th col="selling_price" right>Precio</Th>
            <Th col="cost_price" right>Coste</Th>
            <Th col="contribution_margin" right>Margen €</Th>
            <Th col="contribution_margin_pct" right>Margen %</Th>
            <Th col="units_sold" right>Uds vendidas</Th>
            <Th col="quadrant">Cuadrante</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#A78B7D]/10">
          {sorted.map((dish) => (
            <tr key={dish.id} className="hover:bg-[#222222] transition-colors">
              <td className="px-3 py-2 font-medium text-[#E5E2E1]">{dish.name}</td>
              <td className="px-3 py-2 text-[#A78B7D]">
                {CATEGORY_LABELS[dish.category]}
              </td>
              <td className="px-3 py-2 text-right text-[#E5E2E1]">{dish.selling_price.toFixed(2)} €</td>
              <td className="px-3 py-2 text-right text-[#A78B7D]">
                {dish.cost_price.toFixed(2)} €
              </td>
              <td className="px-3 py-2 text-right font-medium text-[#E5E2E1]">
                {dish.contribution_margin.toFixed(2)} €
              </td>
              <td className="px-3 py-2 text-right text-[#E5E2E1]">
                {dish.contribution_margin_pct.toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right text-[#E5E2E1]">{dish.units_sold}</td>
              <td className="px-3 py-2">
                <QuadrantBadge quadrant={dish.quadrant} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-[#A78B7D]/20 bg-[#111111] font-semibold">
          <tr>
            <td className="px-3 py-2 text-[#E5E2E1]" colSpan={2}>
              Totales ({dishes.length} platos)
            </td>
            <td className="px-3 py-2 text-right text-[#E5E2E1]">
              {totalRevenue.toFixed(0)} €
            </td>
            <td className="px-3 py-2 text-right text-[#A78B7D]">
              {totalCost.toFixed(0)} €
            </td>
            <td className="px-3 py-2 text-right text-[#E5E2E1]">
              {totalContrib.toFixed(0)} €
            </td>
            <td className="px-3 py-2 text-right text-[#E5E2E1]">
              {totalRevenue > 0
                ? ((totalContrib / totalRevenue) * 100).toFixed(1)
                : "0.0"}
              %
            </td>
            <td className="px-3 py-2 text-right text-[#E5E2E1]">{totalUnits}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Recommendations ─────────────────────────────────────────────────────────

function Recommendations({ dishes }: { dishes: MenuDishAnalysis[] }) {
  const stars = dishes.filter((d) => d.quadrant === "estrella")
  const dogs = dishes.filter((d) => d.quadrant === "perro")
  const plowHorses = dishes.filter((d) => d.quadrant === "vaca")
  const puzzles = dishes.filter((d) => d.quadrant === "enigma")

  const topStar = [...stars].sort(
    (a, b) => b.total_contribution - a.total_contribution,
  )[0]

  const worstDog = [...dogs].sort(
    (a, b) => a.total_contribution - b.total_contribution,
  )[0]

  const worstPlow = [...plowHorses].sort(
    (a, b) => a.contribution_margin_pct - b.contribution_margin_pct,
  )[0]

  const topPuzzle = [...puzzles].sort(
    (a, b) => b.contribution_margin - a.contribution_margin,
  )[0]

  const insights: { emoji: string; text: string; borderColor: string }[] = []

  if (topStar) {
    insights.push({
      emoji: "⭐",
      text: `"${topStar.name}" es tu mejor plato — ponlo en lugar destacado de la carta.`,
      borderColor: "border-l-yellow-500",
    })
  }

  if (dogs.length > 0) {
    insights.push({
      emoji: "🐕",
      text: `${dogs.length} plato${dogs.length > 1 ? "s" : ""} con baja rentabilidad y baja popularidad${worstDog ? ` — "${worstDog.name}" es el candidato principal para retirar` : ""}.`,
      borderColor: "border-l-red-500",
    })
  }

  if (worstPlow) {
    const suggestedPrice = (worstPlow.selling_price * 1.1).toFixed(2)
    insights.push({
      emoji: "🐄",
      text: `"${worstPlow.name}" se vende mucho pero su margen es bajo (${worstPlow.contribution_margin_pct.toFixed(1)}%) — considera subir el precio a ${suggestedPrice} €.`,
      borderColor: "border-l-blue-500",
    })
  }

  if (topPuzzle) {
    insights.push({
      emoji: "❓",
      text: `"${topPuzzle.name}" tiene buen margen (${topPuzzle.contribution_margin.toFixed(2)} €) pero pocas ventas — mejora su visibilidad en la carta.`,
      borderColor: "border-l-purple-500",
    })
  }

  if (insights.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Recomendaciones automaticas</h2>
      <div className="flex flex-col gap-2">
        {insights.map((ins, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-lg border-l-4 bg-[#1A1A1A] px-4 py-3 text-sm text-[#E5E2E1]",
              ins.borderColor,
            )}
          >
            <span className="mt-0.5 text-base leading-none">{ins.emoji}</span>
            <span>{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Matrix View ─────────────────────────────────────────────────────────────

function MatrixView({ dishes }: { dishes: MenuDishAnalysis[] }) {
  const byQuadrant = (q: MatrixQuadrant) => dishes.filter((d) => d.quadrant === q)

  return (
    <div className="flex gap-4">
      {/* Y-axis label */}
      <div className="hidden w-6 shrink-0 items-center justify-center sm:flex">
        <span
          className="whitespace-nowrap text-xs font-medium text-[#A78B7D]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Rentabilidad ↑
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {/* 2×2 Grid: top-left=ENIGMA, top-right=ESTRELLA, bottom-left=PERRO, bottom-right=VACA */}
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {/* Row 1: high profitability */}
          <QuadrantCard quadrant="enigma" dishes={byQuadrant("enigma")} />
          <QuadrantCard quadrant="estrella" dishes={byQuadrant("estrella")} />

          {/* Row 2: low profitability */}
          <QuadrantCard quadrant="perro" dishes={byQuadrant("perro")} />
          <QuadrantCard quadrant="vaca" dishes={byQuadrant("vaca")} />
        </div>

        {/* X-axis label */}
        <div className="flex items-center justify-center">
          <span className="text-xs font-medium text-[#A78B7D]">
            Popularidad →
          </span>
        </div>

        {/* Axis legend */}
        <div className="flex items-center justify-between text-xs text-[#A78B7D]">
          <span>← Baja popularidad</span>
          <span>Alta popularidad →</span>
        </div>
      </div>
    </div>
  )
}

// ─── Scatter / Bubble Chart ──────────────────────────────────────────────────

type QuadrantKey = "star" | "workhorse" | "puzzle" | "dog"

interface DishScatterDatum {
  plato: string
  popularidad: number
  margen: number
  revenue: number
  quadrant: QuadrantKey
}

const QUADRANT_COLORS: Record<QuadrantKey, string> = {
  star: CHART_COLORS.green,
  workhorse: CHART_COLORS.blue,
  puzzle: CHART_COLORS.amber,
  dog: CHART_COLORS.red,
}

const QUADRANT_LABELS_SCATTER: Record<QuadrantKey, string> = {
  star: "Estrella",
  workhorse: "Vaca",
  puzzle: "Enigma",
  dog: "Perro",
}

const dishScatterData: DishScatterDatum[] = [
  { plato: "Solomillo al Oporto", popularidad: 45, margen: 68, revenue: 1260, quadrant: "star" },
  { plato: "Gazpacho andaluz", popularidad: 52, margen: 72, revenue: 520, quadrant: "star" },
  { plato: "Ensalada cesar", popularidad: 38, margen: 55, revenue: 456, quadrant: "workhorse" },
  { plato: "Lubina a la sal", popularidad: 15, margen: 75, revenue: 480, quadrant: "puzzle" },
  { plato: "Carpaccio trufa", popularidad: 12, margen: 82, revenue: 384, quadrant: "puzzle" },
  { plato: "Pasta carbonara", popularidad: 42, margen: 45, revenue: 588, quadrant: "workhorse" },
  { plato: "Tarta queso", popularidad: 35, margen: 70, revenue: 525, quadrant: "star" },
  { plato: "Croquetas jamon", popularidad: 48, margen: 60, revenue: 480, quadrant: "star" },
  { plato: "Risotto setas", popularidad: 8, margen: 35, revenue: 160, quadrant: "dog" },
  { plato: "Ensaladilla rusa", popularidad: 18, margen: 40, revenue: 216, quadrant: "dog" },
]

const avgPopularidad =
  dishScatterData.reduce((s, d) => s + d.popularidad, 0) / dishScatterData.length
const avgMargen =
  dishScatterData.reduce((s, d) => s + d.margen, 0) / dishScatterData.length

const maxPop = Math.max(...dishScatterData.map((d) => d.popularidad))
const maxMargen = Math.max(...dishScatterData.map((d) => d.margen))

function ScatterTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: DishScatterDatum }> }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        background: "#1A1A1A",
        borderColor: "#A78B7D33",
        border: "1px solid #A78B7D33",
        color: "#E5E2E1",
      }}
    >
      <p className="mb-1 font-semibold">{d.plato}</p>
      <p>Popularidad: {d.popularidad} uds</p>
      <p>Margen: {d.margen}%</p>
      <p>Revenue: {d.revenue.toLocaleString("es-ES")} €</p>
      <p className="mt-1 font-medium" style={{ color: QUADRANT_COLORS[d.quadrant] }}>
        {QUADRANT_LABELS_SCATTER[d.quadrant]}
      </p>
    </div>
  )
}

function ScatterLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#A78B7D]">
      {(Object.entries(QUADRANT_LABELS_SCATTER) as [QuadrantKey, string][]).map(
        ([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: QUADRANT_COLORS[key] }}
            />
            <span>{label}</span>
          </div>
        ),
      )}
    </div>
  )
}

function RentabilidadScatterChart() {
  const theme = CHART_THEME.dark
  const minRev = Math.min(...dishScatterData.map((d) => d.revenue))
  const maxRev = Math.max(...dishScatterData.map((d) => d.revenue))

  return (
    <div className="rounded-lg bg-[#1A1A1A] p-4">
      <div className="mb-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Mapa de Rentabilidad</h2>
        <p className="text-sm text-[#A78B7D] mt-1">
          Margen vs popularidad — tamano = contribucion a ingresos
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.gridStroke}
          />

          {/* Quadrant background areas */}
          <ReferenceArea
            x1={0}
            x2={avgPopularidad}
            y1={avgMargen}
            y2={maxMargen + 5}
            fill={CHART_COLORS.amber}
            fillOpacity={0.06}
            ifOverflow="extendDomain"
          />
          <ReferenceArea
            x1={avgPopularidad}
            x2={maxPop + 5}
            y1={avgMargen}
            y2={maxMargen + 5}
            fill={CHART_COLORS.green}
            fillOpacity={0.06}
            ifOverflow="extendDomain"
          />
          <ReferenceArea
            x1={0}
            x2={avgPopularidad}
            y1={0}
            y2={avgMargen}
            fill={CHART_COLORS.red}
            fillOpacity={0.06}
            ifOverflow="extendDomain"
          />
          <ReferenceArea
            x1={avgPopularidad}
            x2={maxPop + 5}
            y1={0}
            y2={avgMargen}
            fill={CHART_COLORS.blue}
            fillOpacity={0.06}
            ifOverflow="extendDomain"
          />

          <XAxis
            type="number"
            dataKey="popularidad"
            name="Popularidad"
            tick={{ fontSize: 11, fill: theme.axisStroke }}
            stroke={theme.axisStroke}
            label={{
              value: "Popularidad (uds vendidas)",
              position: "bottom",
              offset: 0,
              style: { fontSize: 11, fill: theme.axisStroke },
            }}
          />
          <YAxis
            type="number"
            dataKey="margen"
            name="Margen"
            tick={{ fontSize: 11, fill: theme.axisStroke }}
            stroke={theme.axisStroke}
            tickFormatter={(v: number) => `${v}%`}
            label={{
              value: "Margen (%)",
              angle: -90,
              position: "insideLeft",
              offset: 5,
              style: { fontSize: 11, fill: theme.axisStroke },
            }}
          />
          <ZAxis
            type="number"
            dataKey="revenue"
            range={[60, 400]}
            name="Revenue"
          />

          {/* Reference lines for averages */}
          <ReferenceLine
            x={avgPopularidad}
            stroke={theme.axisStroke}
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `Media: ${avgPopularidad.toFixed(0)} uds`,
              position: "top",
              style: { fontSize: 10, fill: theme.axisStroke },
            }}
          />
          <ReferenceLine
            y={avgMargen}
            stroke={theme.axisStroke}
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `Media: ${avgMargen.toFixed(1)}%`,
              position: "right",
              style: { fontSize: 10, fill: theme.axisStroke },
            }}
          />

          <Tooltip
            content={<ScatterTooltipContent />}
            cursor={{ strokeDasharray: "3 3", stroke: theme.axisStroke }}
          />

          <Scatter name="Platos" data={dishScatterData}>
            {dishScatterData.map((entry, index) => (
              <Cell
                key={index}
                fill={QUADRANT_COLORS[entry.quadrant]}
                fillOpacity={0.85}
                stroke={QUADRANT_COLORS[entry.quadrant]}
                strokeWidth={1}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Quadrant corner labels */}
      <div className="mt-1 grid grid-cols-2 gap-x-4 text-[10px] text-[#A78B7D]">
        <div className="flex justify-between">
          <span style={{ color: CHART_COLORS.red }}>🐕 Perro (bajo/bajo)</span>
          <span />
        </div>
        <div className="flex justify-between">
          <span />
          <span style={{ color: CHART_COLORS.blue }}>🐄 Vaca (alto pop/bajo margen)</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: CHART_COLORS.amber }}>❓ Enigma (bajo pop/alto margen)</span>
          <span />
        </div>
        <div className="flex justify-between">
          <span />
          <span style={{ color: CHART_COLORS.green }}>⭐ Estrella (alto/alto)</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3">
        <ScatterLegend />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MenuEngineeringPage() {
  const [selectedCategory, setSelectedCategory] = useState<
    MenuCategory | undefined
  >(undefined)
  const [viewMode, setViewMode] = useState<"matriz" | "tabla" | "recomendaciones">("matriz")

  const { report } = useMenuEngineering(selectedCategory)

  const marginPct =
    report.total_revenue > 0
      ? ((report.total_contribution / report.total_revenue) * 100).toFixed(1)
      : "0.0"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">
          INGENIERIA DE MENU
        </p>
        <h1 className="text-xl font-bold sm:text-2xl text-[#E5E2E1]">Ingenieria de Menu</h1>
        <p className="mt-1 text-[#A78B7D]">
          Analisis de rentabilidad y popularidad de platos · {report.period_label}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          emoji="💰"
          label="Ingresos totales"
          value={`${report.total_revenue.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`}
        />
        <KpiCard
          emoji="📉"
          label="Coste total"
          value={`${report.total_cost.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`}
        />
        <KpiCard
          emoji="📈"
          label="Margen total"
          value={`${report.total_contribution.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`}
          sub={`${marginPct}% sobre ingresos`}
        />
        <KpiCard
          emoji="🍽️"
          label="Platos analizados"
          value={String(report.dishes.length)}
          sub={`⭐ ${report.stars.length} · 🐄 ${report.plow_horses.length} · ❓ ${report.puzzles.length} · 🐕 ${report.dogs.length}`}
        />
      </div>

      {/* Filter + view toggle row */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedCategory ?? ""}
          onChange={(e) =>
            setSelectedCategory(
              e.target.value === "" ? undefined : (e.target.value as MenuCategory),
            )
          }
          className="rounded-md bg-[#1A1A1A] border-[#A78B7D]/20 px-3 py-2 text-sm text-[#E5E2E1]"
        >
          <option value="">Todas las categorias</option>
          {(Object.entries(CATEGORY_LABELS) as [MenuCategory, string][]).map(
            ([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ),
          )}
        </select>

        {/* View mode toggle */}
        <div className="flex rounded-lg overflow-hidden bg-[#1A1A1A]">
          <button
            onClick={() => setViewMode("matriz")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              viewMode === "matriz"
                ? "bg-[#F97316] text-white"
                : "text-[#A78B7D] hover:bg-[#222222] hover:text-[#E5E2E1]",
            )}
          >
            Matriz
          </button>
          <button
            onClick={() => setViewMode("tabla")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              viewMode === "tabla"
                ? "bg-[#F97316] text-white"
                : "text-[#A78B7D] hover:bg-[#222222] hover:text-[#E5E2E1]",
            )}
          >
            Tabla
          </button>
          <button
            onClick={() => setViewMode("recomendaciones")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              viewMode === "recomendaciones"
                ? "bg-[#F97316] text-white"
                : "text-[#A78B7D] hover:bg-[#222222] hover:text-[#E5E2E1]",
            )}
          >
            Recomendaciones
          </button>
        </div>
      </div>

      {/* Main content */}
      {viewMode === "matriz" ? (
        <MatrixView dishes={report.dishes} />
      ) : viewMode === "recomendaciones" ? (
        <RecommendationsTab recommendations={generateRecommendations(report.dishes)} />
      ) : (
        <TableView dishes={report.dishes} />
      )}

      {/* Scatter / Bubble Chart */}
      <RentabilidadScatterChart />

      {/* Recommendations */}
      <Recommendations dishes={report.dishes} />
    </div>
  )
}
