"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { MOCK_TABLES } from "@/lib/resto-mock-data"
import { useCreateReservation } from "@/features/reservations/hooks/use-reservations"
import { toast } from "sonner"

interface NewReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const initialForm = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  date: todayStr(),
  time: "20:00",
  duration_min: 90,
  pax: 1,
  table_id: "",
  source: "phone" as "phone" | "walk_in" | "web" | "app" | "thefork",
  is_vip: false,
  notes: "",
}

export function NewReservationDialog({
  open,
  onOpenChange,
}: NewReservationDialogProps) {
  const [form, setForm] = useState(initialForm)
  const { mutate, isPending } = useCreateReservation()

  function resetForm() {
    setForm({
      ...initialForm,
      date: todayStr(),
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.customer_name.trim()) {
      toast.error("El nombre del cliente es obligatorio")
      return
    }
    if (form.pax < 1) {
      toast.error("Debe haber al menos 1 comensal")
      return
    }

    mutate(
      {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || undefined,
        customer_email: form.customer_email.trim() || undefined,
        date: form.date,
        time: form.time,
        duration_min: form.duration_min,
        pax: form.pax,
        table_id: form.table_id || undefined,
        source: form.source,
        status: "pending" as const,
        is_vip: form.is_vip,
        notes: form.notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Reserva creada")
          onOpenChange(false)
          resetForm()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva reserva</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre del cliente */}
          <div className="space-y-2">
            <Label htmlFor="customer_name">Nombre del cliente *</Label>
            <Input
              id="customer_name"
              value={form.customer_name}
              onChange={(e) =>
                setForm({ ...form, customer_name: e.target.value })
              }
              placeholder="Nombre completo"
              required
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="customer_phone">Teléfono</Label>
            <Input
              id="customer_phone"
              type="tel"
              value={form.customer_phone}
              onChange={(e) =>
                setForm({ ...form, customer_phone: e.target.value })
              }
              placeholder="+34 600 000 000"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="customer_email">Email</Label>
            <Input
              id="customer_email"
              type="email"
              value={form.customer_email}
              onChange={(e) =>
                setForm({ ...form, customer_email: e.target.value })
              }
              placeholder="cliente@email.com"
            />
          </div>

          {/* Fecha + Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>

          {/* Comensales + Duración */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pax">Comensales *</Label>
              <Input
                id="pax"
                type="number"
                min={1}
                value={form.pax}
                onChange={(e) =>
                  setForm({ ...form, pax: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_min">Duración (min)</Label>
              <Input
                id="duration_min"
                type="number"
                value={form.duration_min}
                onChange={(e) =>
                  setForm({ ...form, duration_min: Number(e.target.value) })
                }
              />
            </div>
          </div>

          {/* Fuente + Mesa */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fuente</Label>
              <Select
                value={form.source}
                onValueChange={(value) => { if (value) setForm({ ...form, source: value as typeof form.source }) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Teléfono</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="app">App</SelectItem>
                  <SelectItem value="thefork">TheFork</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mesa</Label>
              <Select
                value={form.table_id}
                onValueChange={(value) => {
                  if (value !== null) setForm({ ...form, table_id: value === "none" ? "" : value })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {MOCK_TABLES.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name} ({table.capacity} pax)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* VIP */}
          <div className="flex items-center gap-2">
            <input
              id="vip"
              type="checkbox"
              checked={form.is_vip}
              onChange={(e) => setForm({ ...form, is_vip: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="vip" className="cursor-pointer">
              VIP
            </Label>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Alergias, preferencias, celebraciones..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear reserva"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
