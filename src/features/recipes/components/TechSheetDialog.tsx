"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChefHat, FileText } from "lucide-react"
import { toast } from "sonner"
import { useRecipe, useRecipeIngredients } from "@/features/recipes/hooks/use-recipes"

interface TechSheetDialogProps {
  recipeId: string
  recipeName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Mock ingredient data with prices for the tech sheet display
interface TechSheetLine {
  id: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
  lineCost: number
}

function generateMockTechSheet(recipeName: string): {
  ingredients: TechSheetLine[]
  totalCost: number
  servings: number
  category: string
} {
  // Deterministic mock based on recipe name
  const mockIngredients: TechSheetLine[] = [
    { id: "1", name: "Aceite de oliva virgen extra", quantity: 0.05, unit: "L", unitPrice: 8.50, lineCost: 0.43 },
    { id: "2", name: "Cebolla", quantity: 0.15, unit: "kg", unitPrice: 1.20, lineCost: 0.18 },
    { id: "3", name: "Ajo", quantity: 0.02, unit: "kg", unitPrice: 5.00, lineCost: 0.10 },
    { id: "4", name: "Sal fina", quantity: 0.01, unit: "kg", unitPrice: 0.60, lineCost: 0.01 },
    { id: "5", name: "Pimienta negra", quantity: 0.005, unit: "kg", unitPrice: 28.00, lineCost: 0.14 },
    { id: "6", name: "Tomate triturado", quantity: 0.40, unit: "kg", unitPrice: 1.80, lineCost: 0.72 },
    { id: "7", name: "Pimiento rojo", quantity: 0.20, unit: "kg", unitPrice: 2.50, lineCost: 0.50 },
    { id: "8", name: "Patata", quantity: 0.30, unit: "kg", unitPrice: 0.90, lineCost: 0.27 },
  ]

  const totalCost = mockIngredients.reduce((sum, i) => sum + i.lineCost, 0)

  return {
    ingredients: mockIngredients,
    totalCost,
    servings: 4,
    category: "principal",
  }
}

function fmt(n: number) {
  return `${n.toFixed(2)} \u20ac`
}

function foodCostColor(pct: number): string {
  if (pct <= 30) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800"
  if (pct <= 35) return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800"
  return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
}

export function TechSheetDialog({ recipeId, recipeName, open, onOpenChange }: TechSheetDialogProps) {
  const { data: recipe } = useRecipe(recipeId)

  const sheet = generateMockTechSheet(recipeName)
  const costPerServing = sheet.servings > 0 ? sheet.totalCost / sheet.servings : 0

  // Use real recipe data if available, fallback to mock
  const servings = recipe?.servings ?? sheet.servings
  const category = recipe?.category ?? sheet.category
  const totalCost = recipe?.total_cost ?? sheet.totalCost
  const costRation = servings > 0 ? totalCost / servings : 0

  // Mock selling price for food cost % calculation
  const sellingPrice = 12.00
  const foodCostPct = sellingPrice > 0 ? (costRation / sellingPrice) * 100 : 0

  function handleExportPDF() {
    toast.info("Función disponible próximamente")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ChefHat className="h-5 w-5 text-primary" />
            Ficha técnica
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {recipeName} · <span className="capitalize">{category}</span> · {servings} raciones
          </p>
        </DialogHeader>

        {/* Ingredients table */}
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Ingrediente</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-center">Unidad</TableHead>
                <TableHead className="text-right">Precio/ud</TableHead>
                <TableHead className="text-right">Coste línea</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheet.ingredients.map((ing) => (
                <TableRow key={ing.id}>
                  <TableCell className="font-medium">{ing.name}</TableCell>
                  <TableCell className="text-right">{ing.quantity}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{ing.unit}</TableCell>
                  <TableCell className="text-right">{fmt(ing.unitPrice)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(ing.lineCost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-4 py-3">
          <div className="flex flex-wrap gap-6 text-sm">
            <span>
              <span className="text-muted-foreground">Coste total: </span>
              <span className="font-semibold">{fmt(totalCost)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Coste/ración: </span>
              <span className="font-semibold">{fmt(costRation)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Food cost: </span>
              <Badge variant="outline" className={cn("text-xs", foodCostColor(foodCostPct))}>
                {foodCostPct.toFixed(1)}%
              </Badge>
            </span>
          </div>
        </div>

        {/* Export button */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
