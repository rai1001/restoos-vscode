"use client"

import { useState } from "react"
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
import { PackagePlus, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { MOCK_PRODUCTS, MOCK_SUPPLIERS } from "@/lib/mock-data"

interface EntryLine {
  id: string
  product_id: string
  quantity: string
  unit_cost: string
  expiry_date: string
}

function createEmptyLine(): EntryLine {
  return {
    id: crypto.randomUUID(),
    product_id: "",
    quantity: "",
    unit_cost: "",
    expiry_date: "",
  }
}

export function StockEntryForm({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState("")
  const [deliveryNote, setDeliveryNote] = useState("")
  const [lines, setLines] = useState<EntryLine[]>([createEmptyLine()])
  const [loading, setLoading] = useState(false)

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
        // Auto-fill unit cost from last known price
        if (field === "product_id") {
          const product = MOCK_PRODUCTS.find(p => p.id === value)
          if (product) {
            updated.unit_cost = ""
          }
        }
        return updated
      })
    )
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validLines.length === 0) {
      toast.error("Añade al menos una línea con producto, cantidad y precio")
      return
    }
    setLoading(true)
    // TODO: Supabase RPC receive_goods
    await new Promise<void>(r => setTimeout(r, 600))
    toast.success(
      `Entrada registrada — ${validLines.length} producto${validLines.length > 1 ? "s" : ""}, total ${totalAmount.toFixed(2)} €`
    )
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
                className="rounded-md border border-[#333] p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Línea {idx + 1}</span>
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
                    <Label className="text-xs">€/unidad *</Label>
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
