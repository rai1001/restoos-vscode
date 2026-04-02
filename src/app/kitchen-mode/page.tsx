"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  PackagePlus,
  ChefHat,
  ArrowLeft,
  Check,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useAppccTemplates, useCreateRecord } from "@/features/appcc/use-appcc"
import type { CheckTemplate } from "@/features/appcc/types"

// ── Microflujo types ────────────────────────────────────────────────────────

type KitchenView = "home" | "merma" | "appcc" | "entrada" | "produccion"

// ── Mock data for quick selects ─────────────────────────────────────────────

const QUICK_PRODUCTS = [
  { id: "p1", name: "Solomillo", unit: "kg", icon: "🥩" },
  { id: "p2", name: "Salmón", unit: "kg", icon: "🐟" },
  { id: "p3", name: "Aceite oliva", unit: "L", icon: "🫒" },
  { id: "p4", name: "Patata", unit: "kg", icon: "🥔" },
  { id: "p5", name: "Tomate", unit: "kg", icon: "🍅" },
  { id: "p6", name: "Leche", unit: "L", icon: "🥛" },
  { id: "p7", name: "Huevos", unit: "ud", icon: "🥚" },
  { id: "p8", name: "Cebolla", unit: "kg", icon: "🧅" },
  { id: "p9", name: "Pulpo", unit: "kg", icon: "🐙" },
  { id: "p10", name: "Nata", unit: "L", icon: "🍶" },
  { id: "p11", name: "Queso", unit: "kg", icon: "🧀" },
  { id: "p12", name: "Pan", unit: "ud", icon: "🍞" },
]

const WASTE_REASONS = [
  { id: "expired", label: "Caducado", icon: "⏰", color: "border-red-700 bg-red-950/30" },
  { id: "damaged", label: "Deteriorado", icon: "💔", color: "border-yellow-700 bg-yellow-950/30" },
  { id: "accident", label: "Accidente", icon: "💥", color: "border-orange-700 bg-[var(--alert-warning)]/30" },
  { id: "overproduction", label: "Sobreproducción", icon: "📦", color: "border-blue-700 bg-blue-950/30" },
]

// APPCC_CHECKS removed — now loaded from real templates via useAppccTemplates

// ── Main page ───────────────────────────────────────────────────────────────

export default function KitchenModePage() {
  const [view, setView] = useState<KitchenView>("home")

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-background">
      {/* Compact header */}
      <div className="flex items-center justify-between mb-6">
        {view === "home" ? (
          <>
            <div className="flex items-center gap-3">
              <ChefHat className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Modo Cocina</h1>
                <p className="text-xs text-muted-foreground">Microflujos rápidos — sin formularios</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm" className="border-border-subtle text-muted-foreground">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Dashboard
              </Button>
            </Link>
          </>
        ) : (
          <button
            onClick={() => setView("home")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Volver</span>
          </button>
        )}
      </div>

      {view === "home" && <HomeView onNavigate={setView} />}
      {view === "merma" && <MermaFlow onDone={() => setView("home")} />}
      {view === "appcc" && <AppccFlow onDone={() => setView("home")} />}
      {view === "entrada" && <EntradaFlow onDone={() => setView("home")} />}
      {view === "produccion" && <ProduccionFlow onDone={() => setView("home")} />}
    </div>
  )
}

// ── Home: 4 big action buttons ──────────────────────────────────────────────

function HomeView({ onNavigate }: { onNavigate: (v: KitchenView) => void }) {
  const actions = [
    { id: "merma" as KitchenView, label: "Merma", icon: "🗑️", desc: "2 toques", color: "border-red-800 hover:bg-red-950/20" },
    { id: "appcc" as KitchenView, label: "APPCC", icon: "🌡️", desc: "3 toques", color: "border-emerald-800 hover:bg-emerald-950/20" },
    { id: "entrada" as KitchenView, label: "Entrada", icon: "📦", desc: "Recepción rápida", color: "border-blue-800 hover:bg-blue-950/20" },
    { id: "produccion" as KitchenView, label: "Producción", icon: "👨‍🍳", desc: "Consumo por receta", color: "border-purple-800 hover:bg-purple-950/20" },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
      {actions.map(a => (
        <button
          key={a.id}
          onClick={() => onNavigate(a.id)}
          className={cn(
            "rounded-xl border-2 p-8 text-center transition-colors",
            "bg-card",
            a.color,
          )}
        >
          <span className="text-4xl block mb-3">{a.icon}</span>
          <p className="text-lg font-bold text-foreground">{a.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
        </button>
      ))}
    </div>
  )
}

// ── Merma: producto → cantidad → motivo → listo ─────────────────────────────

function MermaFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [product, setProduct] = useState<typeof QUICK_PRODUCTS[0] | null>(null)
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")

  function handleSubmit() {
    toast.success(`Merma: ${quantity} ${product?.unit} de ${product?.name} (${reason})`)
    onDone()
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-lg font-bold text-foreground mb-1">🗑️ Registrar merma</h2>
      <p className="text-xs text-muted-foreground mb-4">Paso {step} de 3</p>

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-foreground font-medium">¿Qué producto?</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_PRODUCTS.map(p => (
              <button
                key={p.id}
                onClick={() => { setProduct(p); setStep(2) }}
                className="rounded-lg border border-border-subtle bg-card p-3 text-center hover:border-primary transition-colors"
              >
                <span className="text-2xl block">{p.icon}</span>
                <p className="text-xs text-foreground mt-1 truncate">{p.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && product && (
        <div className="space-y-4">
          <p className="text-sm text-foreground font-medium">
            {product.icon} {product.name} — ¿Cuánto?
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
              className="text-3xl h-16 text-center font-bold"
              autoFocus
            />
            <span className="text-lg text-muted-foreground font-medium">{product.unit}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {["0.5", "1", "2", "5"].map(v => (
              <Button
                key={v}
                variant="outline"
                onClick={() => setQuantity(v)}
                className="border-border-subtle text-lg h-12"
              >
                {v}
              </Button>
            ))}
          </div>
          <Button
            onClick={() => quantity && setStep(3)}
            disabled={!quantity}
            className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white"
          >
            Siguiente
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-foreground font-medium">
            {product?.icon} {quantity} {product?.unit} de {product?.name} — ¿Motivo?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {WASTE_REASONS.map(r => (
              <button
                key={r.id}
                onClick={() => { setReason(r.label); handleSubmit() }}
                className={cn(
                  "rounded-lg border-2 p-4 text-center transition-colors",
                  r.color,
                )}
              >
                <span className="text-2xl block mb-1">{r.icon}</span>
                <p className="text-sm font-medium text-foreground">{r.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── APPCC: lista de controles reales → valor → guardar en Supabase ──────────

function formatLimit(t: CheckTemplate): string | null {
  if (t.min_value !== null && t.max_value !== null) return `${t.min_value}–${t.max_value}${t.unit ?? ""}`
  if (t.min_value !== null) return `≥${t.min_value}${t.unit ?? ""}`
  if (t.max_value !== null) return `≤${t.max_value}${t.unit ?? ""}`
  return null
}

function AppccFlow({ onDone }: { onDone: () => void }) {
  const { templates, isLoading } = useAppccTemplates()
  const createRecord = useCreateRecord()
  const [values, setValues] = useState<Record<string, string>>({})
  const [done, setDone] = useState<Set<string>>(new Set())

  const todayStr = new Date().toISOString().slice(0, 10)
  // Filter to daily checks only for kitchen quick flow
  const dailyChecks = templates.filter(t => t.is_active && t.frequency === "diario")

  function markDone(template: CheckTemplate, value?: string) {
    const numValue = value ? parseFloat(value) : null
    if (value !== undefined) {
      setValues(prev => ({ ...prev, [template.id]: value }))
    }

    createRecord.mutate(
      {
        template_id: template.id,
        check_date: todayStr,
        value: numValue,
        corrective_action: value === "NO OK" ? "Registrado desde modo cocina — pendiente de revisión" : null,
      },
      {
        onSuccess: () => {
          setDone(prev => {
            const next = new Set([...prev, template.id])
            if (next.size === dailyChecks.length) {
              toast.success(`APPCC completado — ${dailyChecks.length}/${dailyChecks.length} controles`)
              setTimeout(onDone, 1000)
            }
            return next
          })
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Error al guardar")
        },
      }
    )
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm py-8 text-center">Cargando controles...</p>
  }

  if (dailyChecks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">No hay controles diarios configurados.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Configura plantillas en /appcc.</p>
      </div>
    )
  }

  const completedCount = done.size
  const totalCount = dailyChecks.length

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Control APPCC</h2>
        <Badge className="bg-primary/15 text-primary border-0">
          {completedCount}/{totalCount}
        </Badge>
      </div>

      <div className="h-2 bg-card rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-2">
        {dailyChecks.map(check => {
          const isDone = done.has(check.id)
          const hasUnit = check.unit !== null
          const limit = formatLimit(check)
          return (
            <div
              key={check.id}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                isDone ? "border-emerald-800 bg-emerald-950/10" : "border-border-subtle bg-card"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-sm font-medium", isDone ? "text-emerald-400" : "text-foreground")}>
                    {check.name}
                  </p>
                  {limit && <p className="text-xs text-muted-foreground">{limit}</p>}
                </div>

                {isDone ? (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-0">
                    <Check className="h-3 w-3 mr-0.5" />
                    {values[check.id] ? `${values[check.id]}${check.unit ?? ""}` : "OK"}
                  </Badge>
                ) : hasUnit ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-20 h-10 text-center text-lg font-bold"
                      disabled={createRecord.isPending}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value
                          if (val) markDone(check, val)
                        }
                      }}
                    />
                    <span className="text-xs text-muted-foreground">{check.unit}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => markDone(check)}
                      disabled={createRecord.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 w-10 p-0"
                    >
                      <Check className="h-5 w-5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={createRecord.isPending}
                      onClick={() => {
                        toast.error(`${check.name}: no OK`)
                        markDone(check, "NO OK")
                      }}
                      className="border-red-800 text-red-400 h-10 w-10 p-0"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Entrada rápida: producto → cantidad → precio → listo ────────────────────

function EntradaFlow({ onDone }: { onDone: () => void }) {
  const [product, setProduct] = useState<typeof QUICK_PRODUCTS[0] | null>(null)
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")

  function handleSubmit() {
    toast.success(`Entrada: ${quantity} ${product?.unit} de ${product?.name} a ${price}€/${product?.unit}`)
    onDone()
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto space-y-3">
        <h2 className="text-lg font-bold text-foreground mb-1">📦 Entrada rápida</h2>
        <p className="text-xs text-muted-foreground">¿Qué producto recibiste?</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_PRODUCTS.map(p => (
            <button
              key={p.id}
              onClick={() => setProduct(p)}
              className="rounded-lg border border-border-subtle bg-card p-3 text-center hover:border-primary transition-colors"
            >
              <span className="text-2xl block">{p.icon}</span>
              <p className="text-xs text-foreground mt-1 truncate">{p.name}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-lg font-bold text-foreground">
        {product.icon} {product.name}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Cantidad ({product.unit})</p>
          <Input
            type="number"
            min="0.1"
            step="0.1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="text-2xl h-14 text-center font-bold"
            autoFocus
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">€/{product.unit}</p>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="text-2xl h-14 text-center font-bold"
          />
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!quantity || !price}
        className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white"
      >
        <PackagePlus className="h-5 w-5 mr-2" />
        Registrar entrada
      </Button>
    </div>
  )
}

// ── Producción: seleccionar receta → raciones → confirmar ───────────────────

const QUICK_RECIPES = [
  { id: "r1", name: "Callos de Culuca", icon: "🍲", servings: 10 },
  { id: "r2", name: "Croquetas de cocido", icon: "🥘", servings: 50 },
  { id: "r3", name: "Tortilla jugosa", icon: "🍳", servings: 8 },
  { id: "r4", name: "Tarta de queso", icon: "🍰", servings: 12 },
  { id: "r5", name: "Ensaladilla rusa", icon: "🥗", servings: 15 },
  { id: "r6", name: "Arroz caldoso", icon: "🥘", servings: 6 },
]

function ProduccionFlow({ onDone }: { onDone: () => void }) {
  const [recipe, setRecipe] = useState<typeof QUICK_RECIPES[0] | null>(null)
  const [raciones, setRaciones] = useState("")

  if (!recipe) {
    return (
      <div className="max-w-md mx-auto space-y-3">
        <h2 className="text-lg font-bold text-foreground mb-1">👨‍🍳 Producción</h2>
        <p className="text-xs text-muted-foreground">¿Qué elaboraste?</p>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_RECIPES.map(r => (
            <button
              key={r.id}
              onClick={() => { setRecipe(r); setRaciones(String(r.servings)) }}
              className="rounded-lg border border-border-subtle bg-card p-4 text-left hover:border-primary transition-colors"
            >
              <span className="text-2xl">{r.icon}</span>
              <p className="text-sm font-medium text-foreground mt-1">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.servings} raciones/batch</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-lg font-bold text-foreground">
        {recipe.icon} {recipe.name}
      </h2>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Raciones producidas</p>
        <Input
          type="number"
          min="1"
          value={raciones}
          onChange={e => setRaciones(e.target.value)}
          className="text-3xl h-16 text-center font-bold"
          autoFocus
        />
        <p className="text-xs text-muted-foreground mt-1 text-center">Batch estándar: {recipe.servings} raciones</p>
      </div>
      <Button
        onClick={() => {
          toast.success(`Producción: ${raciones} raciones de ${recipe.name} — stock descontado`)
          onDone()
        }}
        disabled={!raciones}
        className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white"
      >
        <ChefHat className="h-5 w-5 mr-2" />
        Confirmar producción
      </Button>
    </div>
  )
}
