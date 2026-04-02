"use client"

import { useState, useRef, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { MOCK_RECIPES } from "@/lib/mock-data"

interface SalesRow {
  date: string
  item: string
  quantity: number
  amount: number
  matchedRecipeId: string | null
  matchedRecipeName: string | null
  matchConfidence: "high" | "low" | "none"
}

function fuzzyMatch(input: string, candidates: Array<{ id: string; name: string }>): {
  id: string; name: string; confidence: "high" | "low" | "none"
} | null {
  const lower = input.toLowerCase().trim()
  // Exact match
  const exact = candidates.find(c => c.name.toLowerCase() === lower)
  if (exact) return { ...exact, confidence: "high" }
  // Partial match (name contains input or input contains name)
  const partial = candidates.find(c =>
    c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase().split(" ")[0] ?? "")
  )
  if (partial) return { ...partial, confidence: "low" }
  return null
}

function parseCSV(text: string): Array<{ date: string; item: string; quantity: number; amount: number }> {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return []

  const header = lines[0]!.toLowerCase()
  // Detect separator
  const sep = header.includes("\t") ? "\t" : header.includes(";") ? ";" : ","

  const headers = header.split(sep).map(h => h.trim().replace(/"/g, ""))

  // Try to find column indices
  const dateIdx = headers.findIndex(h => h.includes("fecha") || h.includes("date"))
  const itemIdx = headers.findIndex(h => h.includes("plato") || h.includes("item") || h.includes("producto") || h.includes("articulo") || h.includes("descripcion"))
  const qtyIdx = headers.findIndex(h => h.includes("cantidad") || h.includes("qty") || h.includes("uds") || h.includes("unidades"))
  const amtIdx = headers.findIndex(h => h.includes("importe") || h.includes("total") || h.includes("amount") || h.includes("pvp") || h.includes("precio"))

  if (itemIdx === -1) return []

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(sep).map(c => c.trim().replace(/"/g, ""))
    return {
      date: dateIdx >= 0 ? cols[dateIdx] ?? "" : new Date().toISOString().slice(0, 10),
      item: cols[itemIdx] ?? "",
      quantity: qtyIdx >= 0 ? parseFloat(cols[qtyIdx] ?? "1") || 1 : 1,
      amount: amtIdx >= 0 ? parseFloat((cols[amtIdx] ?? "0").replace(",", ".")) || 0 : 0,
    }
  }).filter(r => r.item)
}

export function CSVImportSales({ onImportComplete }: { onImportComplete?: (rows: SalesRow[]) => void }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<SalesRow[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"upload" | "review" | "done">("upload")
  const fileRef = useRef<HTMLInputElement>(null)

  const recipes = useMemo(() =>
    MOCK_RECIPES.map(r => ({ id: r.id, name: r.name })),
    []
  )

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)

      const salesRows: SalesRow[] = parsed.map(row => {
        const match = fuzzyMatch(row.item, recipes)
        return {
          ...row,
          matchedRecipeId: match?.id ?? null,
          matchedRecipeName: match?.name ?? null,
          matchConfidence: match?.confidence ?? "none",
        }
      })

      setRows(salesRows)
      setStep("review")
      setLoading(false)

      const matched = salesRows.filter(r => r.matchConfidence !== "none").length
      toast.success(`${salesRows.length} ventas importadas — ${matched} mapeadas automáticamente`)
    }
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ""
  }

  function updateMapping(idx: number, recipeId: string) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const recipe = recipes.find(rc => rc.id === recipeId)
      return {
        ...r,
        matchedRecipeId: recipeId || null,
        matchedRecipeName: recipe?.name ?? null,
        matchConfidence: recipeId ? "high" : "none",
      }
    }))
  }

  function handleConfirm() {
    const mapped = rows.filter(r => r.matchedRecipeId)
    const totalQty = mapped.reduce((s, r) => s + r.quantity, 0)

    // In real mode: call consume_recipe_by_sale for each mapped row
    // For now: mock success
    toast.success(`${mapped.length} ventas procesadas — ${totalQty} raciones descontadas del stock teórico`)
    setStep("done")
    onImportComplete?.(rows)

    setTimeout(() => {
      setOpen(false)
      setRows([])
      setStep("upload")
    }, 2000)
  }

  const matchedCount = rows.filter(r => r.matchConfidence !== "none").length
  const unmatchedCount = rows.length - matchedCount

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setRows([]); setStep("upload") } }}>
      <DialogTrigger
        render={<Button variant="outline" className="border-border-subtle text-foreground" />}
      >
        <FileSpreadsheet className="h-4 w-4 mr-1.5" />
        Importar ventas CSV
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar ventas del TPV</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sube el CSV de ventas de tu TPV. Columnas esperadas: fecha, plato/artículo, cantidad, importe.
              Separadores: coma, punto y coma o tabulador.
            </p>
            <div
              className="border-2 border-dashed border-border-subtle rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />
              {loading ? (
                <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin" />
              ) : (
                <>
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-foreground">Arrastra o haz clic para subir CSV</p>
                  <p className="text-xs text-muted-foreground mt-1">Exportado de tu TPV (Cashlogy, ICG, Sighore, etc.)</p>
                </>
              )}
            </div>

            {/* Example format */}
            <div className="rounded-md bg-background p-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">Ejemplo de formato CSV:</p>
              <pre className="text-xs text-foreground font-mono">
{`fecha;plato;cantidad;importe
2026-03-30;Callos de Culuca;3;42.00
2026-03-30;Tortilla jugosa;5;45.00
2026-03-30;Tarta de queso;4;24.00`}
              </pre>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/15 text-emerald-400 border-0">
                {matchedCount} mapeadas
              </Badge>
              {unmatchedCount > 0 && (
                <Badge className="bg-yellow-500/15 text-yellow-400 border-0">
                  {unmatchedCount} sin mapear
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                Asigna receta a las ventas no mapeadas
              </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border-subtle">
              <Table>
                <TableHeader>
                  <TableRow className="border-border-subtle">
                    <TableHead className="text-muted-foreground text-xs">Venta TPV</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Cant.</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Importe</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Receta RestoOS</TableHead>
                    <TableHead className="text-muted-foreground text-xs w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx} className="border-border-subtle">
                      <TableCell className="text-sm text-foreground">{row.item}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.amount.toFixed(2)}€</TableCell>
                      <TableCell>
                        <select
                          className="w-full h-7 rounded border border-input bg-background px-2 text-xs"
                          value={row.matchedRecipeId ?? ""}
                          onChange={e => updateMapping(idx, e.target.value)}
                        >
                          <option value="">— Sin mapear —</option>
                          {recipes.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        {row.matchConfidence === "high" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                        {row.matchConfidence === "low" && <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRows([]); setStep("upload") }} className="border-border-subtle">
                Reimportar
              </Button>
              <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90 text-white">
                Confirmar y descontar stock ({matchedCount} ventas)
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <p className="text-foreground font-medium">Ventas procesadas</p>
            <p className="text-sm text-muted-foreground">
              El stock teórico se ha actualizado con las ventas importadas
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
