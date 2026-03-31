"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PackagePlus, Plus, Trash2, Camera, Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import { MOCK_PRODUCTS, MOCK_SUPPLIERS } from "@/lib/mock-data"

// Simulated last known prices (would come from supplier_offers in real app)
const LAST_KNOWN_PRICES: Record<string, number> = Object.fromEntries(
  MOCK_PRODUCTS.map(p => [p.id, Math.round((Math.random() * 20 + 2) * 100) / 100])
)
// Make prices deterministic by product index
MOCK_PRODUCTS.forEach((p, i) => {
  LAST_KNOWN_PRICES[p.id] = [4.50, 1.20, 8.90, 12.50, 22.00, 14.00, 3.20, 2.80, 18.50, 6.50, 38.00, 9.50, 1.80, 7.50, 16.00][i % 15]!
})

interface EntryLine {
  id: string
  product_id: string
  quantity: string
  unit_cost: string
  expiry_date: string
  priceVariation: number | null // % change vs last known
}

function createEmptyLine(): EntryLine {
  return {
    id: crypto.randomUUID(),
    product_id: "",
    quantity: "",
    unit_cost: "",
    expiry_date: "",
    priceVariation: null,
  }
}

function calcPriceVariation(productId: string, newPrice: number): number | null {
  const lastPrice = LAST_KNOWN_PRICES[productId]
  if (!lastPrice || lastPrice === 0 || !newPrice) return null
  return ((newPrice - lastPrice) / lastPrice) * 100
}

export function StockEntryForm({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState("")
  const [deliveryNote, setDeliveryNote] = useState("")
  const [lines, setLines] = useState<EntryLine[]>([createEmptyLine()])
  const [loading, setLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function addLine() {
    setLines(prev => [...prev, createEmptyLine()])
  }

  function removeLine(id: string) {
    if (lines.length <= 1) return
    setLines(prev => prev.filter(l => l.id !== id))
  }

  function updateLine(id: string, field: keyof EntryLine, value: string) {
    setLines(prev =>
      prev.map(l => {
        if (l.id !== id) return l
        const updated = { ...l, [field]: value }
        // Recalculate price variation when price or product changes
        if (field === "unit_cost" || field === "product_id") {
          const pid = field === "product_id" ? value : l.product_id
          const price = field === "unit_cost" ? parseFloat(value) : parseFloat(l.unit_cost)
          updated.priceVariation = pid && price ? calcPriceVariation(pid, price) : null
        }
        return updated
      })
    )
  }

  // OCR: scan delivery note with camera
  async function handleOCRUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setOcrLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/ocr-albaran", { method: "POST", body: formData })
      const data = await res.json()

      if (data.result) {
        const r = data.result
        // Fill supplier
        if (r.supplier_name) {
          const match = MOCK_SUPPLIERS.find(s =>
            s.name.toLowerCase().includes(r.supplier_name.toLowerCase().split(" ")[0] ?? "") ||
            r.supplier_name.toLowerCase().includes(s.name.toLowerCase().split(" ")[0] ?? "")
          )
          if (match) setSupplierId(match.id)
        }
        // Fill delivery note number
        if (r.invoice_number) setDeliveryNote(r.invoice_number)

        // Fill lines from OCR items
        if (r.items?.length > 0) {
          const newLines: EntryLine[] = r.items.map((item: { description: string; quantity: number; unit_price: number }) => {
            // Try to match product by name
            const productMatch = MOCK_PRODUCTS.find(p =>
              p.name.toLowerCase().includes(item.description.toLowerCase().split(" ")[0] ?? "") ||
              item.description.toLowerCase().includes(p.name.toLowerCase().split(" ")[0] ?? "")
            )
            const pid = productMatch?.id ?? ""
            const price = item.unit_price
            return {
              id: crypto.randomUUID(),
              product_id: pid,
              quantity: String(item.quantity),
              unit_cost: String(price),
              expiry_date: "",
              priceVariation: pid ? calcPriceVariation(pid, price) : null,
            }
          })
          setLines(newLines)
        }

        const matchedCount = r.items?.filter((item: { description: string }) =>
          MOCK_PRODUCTS.some(p =>
            p.name.toLowerCase().includes(item.description.toLowerCase().split(" ")[0] ?? "") ||
            item.description.toLowerCase().includes(p.name.toLowerCase().split(" ")[0] ?? "")
          )
        ).length ?? 0

        toast.success(
          `Albarán escaneado: ${r.items?.length ?? 0} productos, ${matchedCount} mapeados${data.mock ? " (datos demo)" : ""}`
        )
      }
    } catch {
      toast.error("Error al escanear el albarán")
    } finally {
      setOcrLoading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function resetForm() {
    setSupplierId("")
    setDeliveryNote("")
    setLines([createEmptyLine()])
  }

  const totalAmount = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity || "0")
    const cost = parseFloat(l.unit_cost || "0")
    return sum + qty * cost
  }, 0)

  const validLines = lines.filter(l => l.product_id && l.quantity && l.unit_cost)
  const linesWithAlert = lines.filter(l => l.priceVariation !== null && Math.abs(l.priceVariation) > 5)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validLines.length === 0) {
      toast.error("Añade al menos una línea con producto, cantidad y precio")
      return
    }
    setLoading(true)
    await new Promise<void>(r => setTimeout(r, 600))
    toast.success(
      `Entrada registrada — ${validLines.length} producto${validLines.length > 1 ? "s" : ""}, total ${totalAmount.toFixed(2)} €`
    )
    if (linesWithAlert.length > 0) {
      toast.warning(`${linesWithAlert.length} producto${linesWithAlert.length > 1 ? "s" : ""} con variación de precio >5%`)
    }
    setOpen(false)
    resetForm()
    onSuccess?.()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-[#F97316] hover:bg-[#EA680C] text-white border-0" />
        }
      >
        <PackagePlus className="h-4 w-4 mr-1.5" />
        Registrar Entrada
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar entrada de mercancía</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* OCR scan button */}
          <div
            className="border border-dashed border-[#333] rounded-lg p-3 text-center hover:border-[#F97316]/50 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleOCRUpload}
            />
            {ocrLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 text-[#F97316] animate-spin" />
                <span className="text-sm text-[#A78B7D]">Analizando albarán...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Camera className="h-4 w-4 text-[#F97316]" />
                <span className="text-sm text-[#E5E2E1]">Escanear albarán con cámara</span>
                <span className="text-xs text-[#A78B7D]">— rellena todo automáticamente</span>
              </div>
            )}
          </div>

          {/* Supplier + Delivery note */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
              >
                <option value="">Seleccionar proveedor...</option>
                {MOCK_SUPPLIERS.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Nº Albarán</Label>
              <Input
                value={deliveryNote}
                onChange={e => setDeliveryNote(e.target.value)}
                placeholder="ALB-2026-001"
              />
            </div>
          </div>

          {/* Price alerts summary */}
          {linesWithAlert.length > 0 && (
            <div className="rounded-md bg-yellow-950/20 border border-yellow-800/30 px-3 py-2">
              <p className="text-xs font-medium text-yellow-400">
                ⚠ {linesWithAlert.length} producto{linesWithAlert.length > 1 ? "s" : ""} con variación de precio &gt;5% vs último pedido
              </p>
            </div>
          )}

          {/* Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Líneas de producto</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Añadir línea
              </Button>
            </div>

            {lines.map((line, idx) => (
              <div
                key={line.id}
                className={`rounded-md border p-3 space-y-2 ${
                  line.priceVariation !== null && Math.abs(line.priceVariation) > 5
                    ? "border-yellow-700/50 bg-yellow-950/10"
                    : "border-[#333]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Línea {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    {line.priceVariation !== null && Math.abs(line.priceVariation) > 5 && (
                      <Badge className={`text-xs ${
                        line.priceVariation > 0
                          ? "bg-red-500/15 text-red-400 border-0"
                          : "bg-emerald-500/15 text-emerald-400 border-0"
                      }`}>
                        {line.priceVariation > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-0.5" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-0.5" />
                        )}
                        {line.priceVariation > 0 ? "+" : ""}{line.priceVariation.toFixed(1)}%
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length <= 1}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={line.product_id}
                  onChange={e => updateLine(line.id, "product_id", e.target.value)}
                >
                  <option value="">Seleccionar producto...</option>
                  {MOCK_PRODUCTS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Cantidad *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.quantity}
                      onChange={e => updateLine(line.id, "quantity", e.target.value)}
                      placeholder="0"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      €/unidad *
                      {line.product_id && LAST_KNOWN_PRICES[line.product_id] && (
                        <span className="text-[#A78B7D] font-normal ml-1">
                          (ant: {LAST_KNOWN_PRICES[line.product_id]!.toFixed(2)}€)
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unit_cost}
                      onChange={e => updateLine(line.id, "unit_cost", e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Caducidad</Label>
                    <Input
                      type="date"
                      value={line.expiry_date}
                      onChange={e => updateLine(line.id, "expiry_date", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total preview */}
          {totalAmount > 0 && (
            <div className="rounded-md bg-emerald-950/30 border border-emerald-800 px-3 py-2">
              <p className="text-sm font-semibold text-emerald-400">
                Total entrada: {totalAmount.toFixed(2)} € ({validLines.length} línea{validLines.length > 1 ? "s" : ""})
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || validLines.length === 0}
              className="bg-[#F97316] hover:bg-[#EA680C] text-white"
            >
              {loading ? "Registrando..." : "Registrar entrada"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
