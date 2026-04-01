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
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { WASTE_REASON_LABELS, type WasteReason } from "../waste-types"
import { useVoiceInput } from "@/hooks/use-voice-input"
import { parseInventoryVoice } from "@/lib/voice-parser"
import { VoiceMicButton } from "@/components/voice-mic-button"
import { cn } from "@/lib/utils"

// Mock products for the select
const MOCK_PRODUCTS = [
  { id: "p1", name: "Lomo de ternera",        unit: "kg", cost: 18.50 },
  { id: "p2", name: "Salmón fresco",           unit: "kg", cost: 22.00 },
  { id: "p3", name: "Leche entera",            unit: "L",  cost: 1.20  },
  { id: "p4", name: "Harina de trigo",         unit: "kg", cost: 0.85  },
  { id: "p5", name: "Aceite de oliva virgen",  unit: "L",  cost: 4.50  },
  { id: "p6", name: "Tomates cherry",          unit: "kg", cost: 3.20  },
  { id: "p7", name: "Mantequilla",             unit: "kg", cost: 8.90  },
  { id: "p8", name: "Nata para montar",        unit: "L",  cost: 2.40  },
]

interface WasteRecordFormProps {
  onSuccess?: () => void
}

export function WasteRecordForm({ onSuccess }: WasteRecordFormProps) {
  const [open, setOpen]               = useState(false)
  const [productId, setProductId]     = useState("")
  const [quantity, setQuantity]       = useState("")
  const [reason, setReason]           = useState<WasteReason | "">("")
  const [costPerUnit, setCostPerUnit] = useState("")
  const [notes, setNotes]             = useState("")
  const [loading, setLoading]         = useState(false)

  const voice = useVoiceInput({
    lang: "es-ES",
    onResult: (transcript) => {
      const parsed = parseInventoryVoice(transcript)
      const filled: string[] = []

      if (parsed.quantity !== undefined) {
        setQuantity(String(parsed.quantity))
        filled.push("cantidad")
      }
      if (parsed.product_name) {
        // Try to match product by name (case-insensitive partial match)
        const match = MOCK_PRODUCTS.find(p =>
          p.name.toLowerCase().includes(parsed.product_name!.toLowerCase()) ||
          parsed.product_name!.toLowerCase().includes(p.name.toLowerCase().split(" ")[0] ?? "")
        )
        if (match) {
          handleProductChange(match.id)
          filled.push("producto")
        }
      }
      if (parsed.reason) {
        const validReason = parsed.reason as WasteReason
        if (validReason in WASTE_REASON_LABELS) {
          setReason(validReason)
          filled.push("motivo")
        }
      }

      if (filled.length > 0) {
        toast.success(`Merma rellenada por voz: ${filled.join(", ")}`)
      } else {
        toast.info("No se detectaron campos. Prueba: '2 kilos de ternera por caducidad'")
      }
    },
    onError: (err) => toast.error(err),
  })

  const selectedProduct = MOCK_PRODUCTS.find(p => p.id === productId)
  const totalLoss =
    parseFloat(quantity || "0") *
    parseFloat(costPerUnit || String(selectedProduct?.cost ?? 0))

  function handleProductChange(id: string) {
    setProductId(id)
    const product = MOCK_PRODUCTS.find(p => p.id === id)
    if (product) setCostPerUnit(String(product.cost))
  }

  function resetForm() {
    setProductId("")
    setQuantity("")
    setReason("")
    setCostPerUnit("")
    setNotes("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || !quantity || !reason) {
      toast.error("Rellena todos los campos obligatorios")
      return
    }
    setLoading(true)
    await new Promise<void>(r => setTimeout(r, 600)) // TODO: Supabase RPC recordWaste
    toast.success(`Merma registrada — Pérdida: ${totalLoss.toFixed(2)} €`)
    setOpen(false)
    resetForm()
    onSuccess?.()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
          />
        }
      >
        <Trash2 className="h-4 w-4 mr-1.5" />
        Registrar merma
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar merma</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Voice input */}
          {voice.isSupported && (
            <div className={cn(
              "rounded-md border p-3 transition-all",
              voice.status === "listening"
                ? "border-red-300 bg-red-50 dark:bg-red-950/20"
                : "border-dashed"
            )}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-xs font-medium">Dictar merma</p>
                  <p className="text-xs text-muted-foreground">Ej: &ldquo;2 kilos de ternera por caducidad&rdquo;</p>
                  {voice.transcript && (
                    <p className="text-xs italic mt-1 text-muted-foreground">&ldquo;{voice.transcript}&rdquo;</p>
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

          {/* Product */}
          <div className="space-y-1.5">
            <Label>Producto *</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={productId}
              onChange={e => handleProductChange(e.target.value)}
              required
            >
              <option value="">Seleccionar producto...</option>
              {MOCK_PRODUCTS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity + Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Cantidad *{" "}
                {selectedProduct && (
                  <span className="text-muted-foreground font-normal">
                    ({selectedProduct.unit})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Coste / unidad (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={costPerUnit}
                onChange={e => setCostPerUnit(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Motivo *</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={reason}
              onChange={e => setReason(e.target.value as WasteReason)}
              required
            >
              <option value="">Seleccionar motivo...</option>
              {(Object.entries(WASTE_REASON_LABELS) as [WasteReason, string][]).map(
                ([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <textarea
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones adicionales..."
              rows={2}
            />
          </div>

          {/* Total loss preview */}
          {totalLoss > 0 && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Pérdida total estimada: {totalLoss.toFixed(2)} €
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
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "Registrando..." : "Registrar merma"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
