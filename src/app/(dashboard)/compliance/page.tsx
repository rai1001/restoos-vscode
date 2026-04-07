"use client"

import { useState } from "react"
import { DemoBanner } from "@/components/demo-banner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Download,
  ShieldCheck,
  ChefHat,
  Loader2,
  CheckCircle2,
  Wheat,
} from "lucide-react"
import { toast } from "sonner"

// ── 14 alérgenos oficiales EU ───────────────────────────────────────────────

const ALLERGENS = [
  { id: "gluten", label: "Gluten", icon: "🌾" },
  { id: "crustaceos", label: "Crustáceos", icon: "🦐" },
  { id: "huevos", label: "Huevos", icon: "🥚" },
  { id: "pescado", label: "Pescado", icon: "🐟" },
  { id: "cacahuetes", label: "Cacahuetes", icon: "🥜" },
  { id: "soja", label: "Soja", icon: "🫘" },
  { id: "lacteos", label: "Lácteos", icon: "🥛" },
  { id: "frutos_secos", label: "Frutos secos", icon: "🌰" },
  { id: "apio", label: "Apio", icon: "🥬" },
  { id: "mostaza", label: "Mostaza", icon: "🟡" },
  { id: "sesamo", label: "Sésamo", icon: "⚪" },
  { id: "sulfitos", label: "Sulfitos", icon: "🍷" },
  { id: "altramuces", label: "Altramuces", icon: "🫛" },
  { id: "moluscos", label: "Moluscos", icon: "🦪" },
]

// Mock allergen matrix
const MENU_ALLERGENS: Array<{ dish: string; category: string; allergens: string[] }> = [
  { dish: "Callos de Culuca", category: "Principal", allergens: ["gluten", "lacteos"] },
  { dish: "Ensaladilla rusa", category: "Entrante", allergens: ["huevos", "pescado", "mostaza"] },
  { dish: "Tortilla jugosa", category: "Entrante", allergens: ["huevos", "lacteos"] },
  { dish: "Lacón Burger", category: "Principal", allergens: ["gluten", "lacteos", "huevos", "mostaza", "sesamo"] },
  { dish: "Raxo con chips", category: "Principal", allergens: ["sulfitos"] },
  { dish: "Arroz caldoso con calamares", category: "Principal", allergens: ["moluscos", "pescado", "crustaceos"] },
  { dish: "Croquetas de cocido", category: "Entrante", allergens: ["gluten", "lacteos", "huevos"] },
  { dish: "Tarta de queso", category: "Postre", allergens: ["lacteos", "huevos", "gluten"] },
  { dish: "Arroz con leche", category: "Postre", allergens: ["lacteos"] },
  { dish: "Gazpacho andaluz", category: "Entrante", allergens: [] },
  { dish: "Pulpo á feira", category: "Principal", allergens: ["moluscos"] },
  { dish: "Pimientos de Padrón", category: "Entrante", allergens: [] },
]

// Mock recipes for tech sheets
const MOCK_TECH_SHEETS = [
  { id: "r1", name: "Callos de Culuca", category: "Principal", servings: 10, prepTime: 45, cookTime: 120, costPerServing: 2.80, allergens: ["gluten", "lacteos"], ingredients: ["Callos de ternera 2kg", "Chorizo 500g", "Morcilla 300g", "Garbanzos 400g", "Pimentón 20g", "Laurel 3 hojas"] },
  { id: "r2", name: "Croquetas de cocido", category: "Entrante", servings: 50, prepTime: 90, cookTime: 5, costPerServing: 1.23, allergens: ["gluten", "lacteos", "huevos"], ingredients: ["Leche 1.5L", "Harina 200g", "Mantequilla 150g", "Jamón picado 300g", "Caldo cocido 500ml", "Pan rallado 400g", "Huevos 4ud"] },
  { id: "r3", name: "Tortilla jugosa", category: "Entrante", servings: 8, prepTime: 15, cookTime: 10, costPerServing: 1.50, allergens: ["huevos", "lacteos"], ingredients: ["Huevos 12ud", "Patata 1kg", "Cebolla 300g", "Aceite oliva 200ml", "Sal"] },
  { id: "r4", name: "Tarta de queso", category: "Postre", servings: 12, prepTime: 15, cookTime: 45, costPerServing: 0.95, allergens: ["lacteos", "huevos", "gluten"], ingredients: ["Queso crema 500g", "Nata 200ml", "Huevos 4ud", "Azúcar 150g", "Harina 30g", "Vainilla"] },
]

export default function CompliancePage() {
  const [exportingAppcc, setExportingAppcc] = useState(false)
  const [exportingAllergens, setExportingAllergens] = useState(false)

  async function exportAppcc() {
    setExportingAppcc(true)
    await new Promise(r => setTimeout(r, 1500))
    toast.success("Informe APPCC generado — 30 días, 240 registros, 0 críticos sin resolver")
    setExportingAppcc(false)
  }

  async function exportAllergens() {
    setExportingAllergens(true)
    await new Promise(r => setTimeout(r, 1000))
    toast.success("Tabla alérgenos exportada — 12 platos × 14 alérgenos")
    setExportingAllergens(false)
  }

  return (
    <div className="space-y-8">
      <DemoBanner module="Alérgenos y fichas técnicas" />

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          CUMPLIMIENTO NORMATIVO
        </p>
        <h1 className="text-3xl font-bold text-foreground">Pack de Cumplimiento</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Documentación lista para inspección sanitaria — APPCC, fichas técnicas y alérgenos
        </p>
      </div>

      {/* Quick export cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-card border border-border-subtle p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Informe APPCC</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Último mes: 30 días registrados, 240 controles, 100% completados
          </p>
          <Button
            onClick={exportAppcc}
            disabled={exportingAppcc}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {exportingAppcc ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            Exportar PDF
          </Button>
        </div>

        <div className="rounded-lg bg-card border border-border-subtle p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Wheat className="h-5 w-5 text-[var(--alert-warning)]" />
            <h3 className="text-sm font-semibold text-foreground">Tabla alérgenos</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {MENU_ALLERGENS.length} platos × 14 alérgenos. Obligatorio en sala.
          </p>
          <Button
            onClick={exportAllergens}
            disabled={exportingAllergens}
            className="w-full bg-[var(--alert-warning)] hover:bg-[var(--alert-warning)] text-white"
          >
            {exportingAllergens ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            Exportar PDF
          </Button>
        </div>

        <div className="rounded-lg bg-card border border-border-subtle p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-foreground">Fichas técnicas</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {MOCK_TECH_SHEETS.length} fichas con ingredientes, alérgenos y proceso
          </p>
          <Button
            onClick={() => toast.success("4 fichas técnicas exportadas en PDF")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Exportar todo
          </Button>
        </div>
      </div>

      {/* Allergen matrix */}
      <div className="rounded-lg bg-card border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-foreground">
            Tabla de alérgenos de la carta
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reglamento UE 1169/2011 — 14 alérgenos de declaración obligatoria
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium sticky left-0 bg-card min-w-[180px]">Plato</th>
                {ALLERGENS.map(a => (
                  <th key={a.id} className="px-1.5 py-2 text-center min-w-[32px]" title={a.label}>
                    <span className="text-base">{a.icon}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MENU_ALLERGENS.map((dish, idx) => (
                <tr key={idx} className="border-b border-border-subtle hover:bg-card-hover">
                  <td className="px-3 py-2 sticky left-0 bg-card">
                    <span className="text-foreground font-medium">{dish.dish}</span>
                    <span className="text-muted-foreground ml-1.5">{dish.category}</span>
                  </td>
                  {ALLERGENS.map(a => (
                    <td key={a.id} className="px-1.5 py-2 text-center">
                      {dish.allergens.includes(a.id) ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--alert-critical)]/20 text-[var(--alert-critical)] text-[10px] font-bold">✓</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tech sheets preview */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Fichas técnicas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MOCK_TECH_SHEETS.map(sheet => (
            <div key={sheet.id} className="rounded-lg bg-card border border-border-subtle p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">{sheet.name}</h4>
                <Badge className="bg-primary/15 text-primary border-0 text-xs">{sheet.category}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Raciones</p>
                  <p className="text-foreground font-medium">{sheet.servings}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tiempo</p>
                  <p className="text-foreground font-medium">{sheet.prepTime + sheet.cookTime} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coste/ración</p>
                  <p className="text-foreground font-medium">{sheet.costPerServing.toFixed(2)}€</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {sheet.allergens.map(a => {
                  const allergen = ALLERGENS.find(al => al.id === a)
                  return (
                    <Badge key={a} className="bg-[var(--alert-critical)]/10 text-[var(--alert-critical)] border-0 text-xs">
                      {allergen?.icon} {allergen?.label}
                    </Badge>
                  )
                })}
                {sheet.allergens.length === 0 && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-0.5" /> Sin alérgenos
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {sheet.ingredients.join(" · ")}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-primary hover:text-primary"
                onClick={() => toast.success(`Ficha técnica "${sheet.name}" exportada`)}
              >
                <FileText className="h-3 w-3 mr-1" />
                Descargar ficha PDF
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
