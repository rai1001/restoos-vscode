"use client"

import { useState } from "react"
import { Users2, Plus, CalendarDays, Clock, Euro, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"
import { useStaffingSummaries, useStaffMembers, useEventShifts } from "@/features/staffing/use-staffing"
import { MOCK_SHIFTS, MOCK_EVENTS_FOR_STAFFING } from "@/features/staffing/staffing-mock-data"
import { ROLE_LABELS } from "@/features/staffing/types"
import type { ShiftStatus, StaffRole, EventShift } from "@/features/staffing/types"

// ─── helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function shiftHours(start: string, end: string): number {
  return Math.round(((new Date(end).getTime() - new Date(start).getTime()) / 3600000) * 10) / 10
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
}

// ─── status badge (dark-styled) ─────────────────────────────────────────────

const STATUS_CONFIG: Record<ShiftStatus, { label: string; className: string }> = {
  confirmado:  { label: "CONFIRMADO",  className: "bg-emerald-500/15 text-emerald-400 border-0 uppercase tracking-widest text-[10px]" },
  pendiente:   { label: "PENDIENTE",   className: "bg-primary/15 text-[var(--alert-warning)] border-0 uppercase tracking-widest text-[10px]" },
  cancelado:   { label: "CANCELADO",   className: "bg-red-500/15 text-red-400 border-0 uppercase tracking-widest text-[10px]" },
  completado:  { label: "COMPLETADO",  className: "bg-muted-foreground/15 text-muted-foreground border-0 uppercase tracking-widest text-[10px]" },
}

function ShiftStatusBadge({ status }: { status: ShiftStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={cn("font-medium", cfg.className)}>
      {cfg.label}
    </Badge>
  )
}

// ─── Role badge (dark-styled) ───────────────────────────────────────────────

function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <span className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
      {ROLE_LABELS[role]}
    </span>
  )
}

// ─── Assign shift dialog ─────────────────────────────────────────────────────

interface AssignDialogProps {
  open: boolean
  onClose: () => void
}

function AssignShiftDialog({ open, onClose }: AssignDialogProps) {
  const { staff } = useStaffMembers()
  const [toast, setToast] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setToast(true)
    setTimeout(() => {
      setToast(false)
      onClose()
    }, 1800)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border-subtle text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Asignar turno</DialogTitle>
        </DialogHeader>
        {toast ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-sm font-medium text-emerald-400">Turno asignado correctamente</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Evento */}
            <div className="space-y-1.5">
              <Label htmlFor="dlg-event" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Evento</Label>
              <Select required>
                <SelectTrigger id="dlg-event" className="bg-sidebar border-border-subtle text-foreground">
                  <SelectValue placeholder="Seleccionar evento..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border-subtle">
                  {MOCK_EVENTS_FOR_STAFFING.map(ev => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Empleado */}
            <div className="space-y-1.5">
              <Label htmlFor="dlg-staff" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Empleado</Label>
              <Select required>
                <SelectTrigger id="dlg-staff" className="bg-sidebar border-border-subtle text-foreground">
                  <SelectValue placeholder="Seleccionar empleado..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border-subtle">
                  {staff.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {ROLE_LABELS[s.role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rol */}
            <div className="space-y-1.5">
              <Label htmlFor="dlg-role" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rol en el evento</Label>
              <Select required>
                <SelectTrigger id="dlg-role" className="bg-sidebar border-border-subtle text-foreground">
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border-subtle">
                  {(Object.keys(ROLE_LABELS) as StaffRole[]).map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Horarios */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dlg-start" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Inicio de turno</Label>
                <Input id="dlg-start" type="datetime-local" required className="bg-sidebar border-border-subtle text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-end" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fin de turno</Label>
                <Input id="dlg-end" type="datetime-local" required className="bg-sidebar border-border-subtle text-foreground" />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="dlg-notes" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notas (opcional)</Label>
              <textarea
                id="dlg-notes"
                rows={3}
                placeholder="Indicaciones especiales..."
                className="w-full rounded-md bg-sidebar border border-border-subtle text-foreground placeholder:text-muted-foreground/50 px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="border-border-subtle bg-transparent text-foreground hover:bg-card">
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white border-0">Asignar</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Shifts table for a selected event ───────────────────────────────────────

function EventShiftsTable({ eventId }: { eventId: string }) {
  const { shifts } = useEventShifts(eventId)

  if (shifts.length === 0) {
    return (
      <EmptyState
        icon={Users2}
        title="Sin turnos asignados"
        description="Usa el boton Asignar turno para planificar el personal de este evento."
      />
    )
  }

  const totalHours = shifts.reduce((acc, s) => acc + shiftHours(s.shift_start, s.shift_end), 0)
  const totalCost = shifts.reduce((acc, s) => {
    if (!s.staff?.hourly_rate) return acc
    return acc + shiftHours(s.shift_start, s.shift_end) * s.staff.hourly_rate
  }, 0)

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border-subtle hover:bg-transparent">
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Empleado</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Rol</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Turno</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Horas</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Estado</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map(shift => (
              <TableRow key={shift.id} className="border-b border-card-hover hover:bg-card-hover/50">
                <TableCell className="font-medium text-foreground">
                  {shift.staff?.name ?? shift.staff_id}
                </TableCell>
                <TableCell>
                  <RoleBadge role={shift.role} />
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                  {formatTime(shift.shift_start)} – {formatTime(shift.shift_end)}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-foreground">
                  {shiftHours(shift.shift_start, shift.shift_end)}h
                </TableCell>
                <TableCell>
                  <ShiftStatusBadge status={shift.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[180px] truncate">
                  {shift.notes ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {Math.round(totalHours * 10) / 10} horas totales
        </span>
        <span className="flex items-center gap-1">
          <Euro className="h-3.5 w-3.5" />
          Total estimado: {formatCurrency(Math.round(totalCost))}
        </span>
      </div>
    </div>
  )
}

// ─── Tab: Por Evento ─────────────────────────────────────────────────────────

function TabPorEvento({ onAssign }: { onAssign: () => void }) {
  const { events } = useStaffingSummaries()
  const [selectedId, setSelectedId] = useState<string | null>(events[0]?.id ?? null)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      {/* Event list */}
      <div className="space-y-2">
        {events.map(ev => {
          const isActive = selectedId === ev.id
          return (
            <button
              key={ev.id}
              onClick={() => setSelectedId(ev.id)}
              className={cn(
                "w-full rounded-lg p-3 text-left transition-colors",
                isActive
                  ? "bg-primary/10 border-l-2 border-l-primary"
                  : "bg-card hover:bg-card-hover"
              )}
            >
              <p className="text-sm font-medium leading-tight text-foreground">{ev.name}</p>
              <p className="mt-1 text-xs flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {formatDate(ev.date)}
              </p>
            </button>
          )
        })}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 border-border-subtle bg-transparent text-foreground hover:bg-card"
          onClick={onAssign}
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Asignar turno
        </Button>
      </div>

      {/* Shifts panel */}
      <div>
        {selectedId ? (
          <EventShiftsTable eventId={selectedId} />
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Selecciona un evento"
            description="Elige un evento de la lista para ver los turnos asignados."
          />
        )}
      </div>
    </div>
  )
}

// ─── Tab: Plantilla ───────────────────────────────────────────────────────────

function TabPlantilla() {
  const { staff } = useStaffMembers()
  const [roleFilter, setRoleFilter] = useState<string | null>("all")

  const filtered = roleFilter === "all" || roleFilter === null
    ? staff
    : staff.filter(s => s.role === roleFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-52 bg-card border-border-subtle text-foreground">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border-subtle">
            <SelectItem value="all">Todos los roles</SelectItem>
            {(Object.keys(ROLE_LABELS) as StaffRole[]).map(r => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} empleados</span>
      </div>

      <div className="rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border-subtle hover:bg-transparent">
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Nombre</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Rol</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Email</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Telefono</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Tarifa / h</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(member => (
              <TableRow key={member.id} className="border-b border-card-hover hover:bg-card-hover/50">
                <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                <TableCell>
                  <RoleBadge role={member.role} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.email ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.phone ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm text-foreground">
                  {member.hourly_rate != null ? `${member.hourly_rate} \u20AC` : "—"}
                </TableCell>
                <TableCell>
                  {member.is_active ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] uppercase tracking-widest">
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted-foreground/15 text-muted-foreground border-0 text-[10px] uppercase tracking-widest">
                      Inactivo
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Tab: Vista Semana (CSS Grid Gantt) ───────────────────────────────────────

function TabVistaSemana() {
  const { staff } = useStaffMembers()

  // Build 7-day window starting today
  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return d
  })

  // Map: staffId → dayIndex (0–6) → shifts[]
  const grid = new Map<string, Map<number, EventShift[]>>()
  for (const s of staff) {
    const staffMap = new Map<number, EventShift[]>()
    days.forEach((_, i) => staffMap.set(i, []))
    grid.set(s.id, staffMap)
  }

  for (const shift of MOCK_SHIFTS) {
    const shiftDate = new Date(shift.shift_start)
    shiftDate.setHours(0, 0, 0, 0)
    const dayIdx = days.findIndex(d => d.getTime() === shiftDate.getTime())
    if (dayIdx === -1) continue
    const staffMap = grid.get(shift.staff_id)
    if (!staffMap) continue
    const existing = staffMap.get(dayIdx) ?? []
    staffMap.set(dayIdx, [...existing, shift])
  }

  const EVENT_COLORS: Record<string, string> = {
    ev1: "bg-violet-500/15 text-violet-400",
    ev2: "bg-blue-500/15 text-blue-400",
    ev3: "bg-amber-500/15 text-amber-400",
  }

  const activeStaff = staff.filter(s => s.is_active)

  return (
    <div className="overflow-x-auto">
      {/* Header row */}
      <div
        className="grid min-w-[700px] gap-px rounded-t-lg overflow-hidden"
        style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}
      >
        <div className="bg-sidebar px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Empleado
        </div>
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "bg-sidebar px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-widest",
              i === 0 ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div>
              {d.toLocaleDateString("es-ES", { weekday: "short" })}
            </div>
            <div className={cn("text-sm font-bold", i === 0 ? "text-primary" : "text-foreground")}>
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Staff rows */}
      <div className="min-w-[700px] rounded-b-lg overflow-hidden">
        {activeStaff.map(member => {
          const staffMap = grid.get(member.id)
          return (
            <div
              key={member.id}
              className="grid border-b border-card-hover hover:bg-card-hover/30 transition-colors"
              style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}
            >
              {/* Name column */}
              <div className="px-3 py-2.5 border-r border-card-hover bg-card">
                <p className="text-sm font-medium truncate text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[member.role]}</p>
              </div>

              {/* Day cells */}
              {days.map((_, dayIdx) => {
                const dayShifts = staffMap?.get(dayIdx) ?? []
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "px-1 py-1.5 min-h-[52px] border-r border-card-hover last:border-r-0 space-y-0.5",
                      dayIdx === 0 && "bg-primary/5"
                    )}
                  >
                    {dayShifts.map(shift => (
                      <div
                        key={shift.id}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight truncate",
                          EVENT_COLORS[shift.event_id] ?? "bg-muted-foreground/15 text-muted-foreground"
                        )}
                        title={`${shift.event_name ?? shift.event_id} · ${formatTime(shift.shift_start)}–${formatTime(shift.shift_end)}`}
                      >
                        {(shift.event_name?.split("–")[0]?.trim()) ?? shift.event_id}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {MOCK_EVENTS_FOR_STAFFING.map(ev => (
          <span
            key={ev.id}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-0.5 font-medium",
              EVENT_COLORS[ev.id] ?? "bg-muted-foreground/15 text-muted-foreground"
            )}
          >
            {ev.name}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards() {
  const { summaries } = useStaffingSummaries()

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {summaries.map(s => (
        <div key={s.event_id} className="rounded-lg bg-card p-5">
          <p className="text-sm font-semibold leading-tight line-clamp-2 text-foreground">
            {s.event_name}
          </p>
          <p className="flex items-center gap-1 text-xs mt-1 text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {formatDate(s.event_date)}
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users2 className="h-3.5 w-3.5" />
                {s.total_shifts} turnos
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {s.confirmed} conf.
              </span>
              {s.pending > 0 && (
                <span className="flex items-center gap-1 text-xs text-[var(--alert-warning)]">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {s.pending} pend.
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Euro className="h-3.5 w-3.5" />
              {formatCurrency(s.estimated_cost)} estimado
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffingPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            BRIGADA Y PERSONAL
          </p>
          <h1 className="text-3xl font-bold text-foreground">Planificacion de Personal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestion de turnos y plantilla por evento
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-white border-0">
          <Plus className="mr-2 h-4 w-4" />
          Asignar turno
        </Button>
      </div>

      {/* Summary cards */}
      <SummaryCards />

      {/* Tabs */}
      <Tabs defaultValue="por-evento">
        <TabsList className="bg-sidebar border border-border-subtle">
          <TabsTrigger value="por-evento" className="data-[state=active]:bg-card data-[state=active]:text-primary text-muted-foreground">Por Evento</TabsTrigger>
          <TabsTrigger value="plantilla" className="data-[state=active]:bg-card data-[state=active]:text-primary text-muted-foreground">Plantilla</TabsTrigger>
          <TabsTrigger value="semana" className="data-[state=active]:bg-card data-[state=active]:text-primary text-muted-foreground">Vista Semana</TabsTrigger>
        </TabsList>

        <TabsContent value="por-evento" className="mt-6">
          <TabPorEvento onAssign={() => setDialogOpen(true)} />
        </TabsContent>

        <TabsContent value="plantilla" className="mt-6">
          <TabPlantilla />
        </TabsContent>

        <TabsContent value="semana" className="mt-6">
          <TabVistaSemana />
        </TabsContent>
      </Tabs>

      {/* Assign dialog */}
      <AssignShiftDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
