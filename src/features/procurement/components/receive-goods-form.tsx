"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PackageCheck, AlertTriangle, Check } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ───────────────────────────────────────────────────────────────────

export type IncidentType = "ok" | "not_received" | "wrong_quantity" | "wrong_price" | "damaged"

export interface ReceiveLine {
  orderLineId: string
  productName: string
  quantityOrdered: number
  quantityPending: number
  expectedPrice: number
  quantityReceived: string
  unitCost: string
  lotNumber: string
  expiryDate: string
  incidentType: IncidentType
  incidentNotes: string
}

const INCIDENT_OPTIONS: { value: IncidentType; label: string }[] = [
  { value: "ok", label: "OK" },
  { value: "not_received", label: "No recibido" },
  { value: "wrong_quantity", label: "Cantidad incorrecta" },
  { value: "wrong_price", label: "Precio incorrecto" },
  { value: "damaged", label: "Producto dañado" },
]

// ── Props ───────────────────────────────────────────────────────────────────

interface ReceiveGoodsFormProps {
  lines: ReceiveLine[]
  onSubmit: (lines: ReceiveLine[]) => void
  isPending?: boolean
}

// ── Component ───────────────────────────────────────────────────────────────

export function ReceiveGoodsForm({ lines: initialLines, onSubmit, isPending }: ReceiveGoodsFormProps) {
  const [lines, setLines] = useState<ReceiveLine[]>(initialLines)

  function updateLine(index: number, update: Partial<ReceiveLine>) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...update } : l))
    )
  }

  const hasIncidents = lines.some((l) => l.incidentType !== "ok")
  const incidentCount = lines.filter((l) => l.incidentType !== "ok").length

  return (
    <div className="space-y-4">
      {lines.map((line, i) => {
        const hasIncident = line.incidentType !== "ok"
        const priceChanged =
          line.unitCost && parseFloat(line.unitCost) !== line.expectedPrice

        return (
          <div
            key={line.orderLineId}
            className={cn(
              "rounded-lg border p-4 space-y-3 transition-colors",
              hasIncident
                ? "border-[var(--alert-critical)] bg-[var(--alert-critical)]/5"
                : "border-border bg-card"
            )}
          >
            {/* Product header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasIncident ? (
                  <AlertTriangle className="h-4 w-4 text-[var(--alert-critical)] shrink-0" />
                ) : (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {line.productName}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Pedido: {line.quantityOrdered} · Pendiente: {line.quantityPending}
              </span>
            </div>

            {/* Main inputs row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Recibido</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={line.quantityReceived}
                  onChange={(e) => updateLine(i, { quantityReceived: e.target.value })}
                  className={cn(
                    "h-9",
                    line.quantityReceived &&
                      parseFloat(line.quantityReceived) !== line.quantityPending &&
                      "border-amber-500/50"
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Precio ud.
                  {priceChanged && (
                    <span className="ml-1 text-amber-400">
                      (era {line.expectedPrice.toFixed(2)})
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={line.unitCost}
                  onChange={(e) => updateLine(i, { unitCost: e.target.value })}
                  className={cn("h-9", priceChanged && "border-amber-500/50")}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lote</Label>
                <Input
                  value={line.lotNumber}
                  placeholder="Opcional"
                  onChange={(e) => updateLine(i, { lotNumber: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Caducidad</Label>
                <Input
                  type="date"
                  value={line.expiryDate}
                  onChange={(e) => updateLine(i, { expiryDate: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>

            {/* Incident selector */}
            <div className="flex items-start gap-3">
              <div className="w-48 shrink-0 space-y-1">
                <Label className="text-xs">Incidencia</Label>
                <Select
                  value={line.incidentType}
                  onValueChange={(v) =>
                    updateLine(i, {
                      incidentType: v as IncidentType,
                      incidentNotes: v === "ok" ? "" : line.incidentNotes,
                    })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasIncident && (
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Notas incidencia</Label>
                  <Input
                    value={line.incidentNotes}
                    onChange={(e) => updateLine(i, { incidentNotes: e.target.value })}
                    placeholder="Describe el problema..."
                    className="h-9"
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Summary + submit */}
      <div className="flex items-center justify-between pt-2">
        {hasIncidents && (
          <span className="text-xs text-[var(--alert-critical)]">
            {incidentCount} {incidentCount === 1 ? "incidencia" : "incidencias"} reportadas
          </span>
        )}
        <Button
          onClick={() => onSubmit(lines)}
          disabled={isPending}
          className={cn("ml-auto gap-2", hasIncidents && "bg-amber-600 hover:bg-amber-700")}
        >
          <PackageCheck className="h-4 w-4" />
          {isPending
            ? "Procesando..."
            : hasIncidents
            ? "Confirmar con incidencias"
            : "Confirmar recepcion"}
        </Button>
      </div>
    </div>
  )
}
