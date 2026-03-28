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
  pendiente:   { label: "PENDIENTE",   className: "bg-orange-500/15 text-orange-400 border-0 uppercase tracking-widest text-[10px]" },
  cancelado:   { label: "CANCELADO",   className: "bg-red-500/15 text-red-400 border-0 uppercase tracking-widest text-[10px]" },
  completado:  { label: "COMPLETADO",  className: "bg-[#A78B7D]/15 text-[#A78B7D] border-0 uppercase tracking-widest text-[10px]" },
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
    <span className="inline-flex items-center rounded bg-[#F97316]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#F97316]">
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
      <DialogContent className="max-w-md bg-[#1A1A1A] border-[#333] text-[#E5E2E1]">
        <DialogHeader>
          <DialogTitle className="text-[#E5E2E1]">Asignar turno</DialogTitle>
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
              <Label htmlFor="dlg-event" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Evento</Label>
              <Select required>
                <SelectTrigger id="dlg-event" className="bg-[#111] border-[#333] text-[#E5E2E1]">
                  <SelectValue placeholder="Seleccionar evento..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#333]">
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
              <Label htmlFor="dlg-staff" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Empleado</Label>
              <Select required>
                <SelectTrigger id="dlg-staff" className="bg-[#111] border-[#333] text-[#E5E2E1]">
                  <SelectValue placeholder="Seleccionar empleado..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#333]">
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
              <Label htmlFor="dlg-role" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Rol en el evento</Label>
              <Select required>
                <SelectTrigger id="dlg-role" className="bg-[#111] border-[#333] text-[#E5E2E1]">
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#333]">
                  {(Object.keys(ROLE_LABELS) as StaffRole[]).map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Horarios */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dlg-start" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Inicio de turno</Label>
                <Input id="dlg-start" type="datetime-local" required className="bg-[#111] border-[#333] text-[#E5E2E1]" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-end" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Fin de turno</Label>
                <Input id="dlg-end" type="datetime-local" required className="bg-[#111] border-[#333] text-[#E5E2E1]" />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="dlg-notes" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Notas (opcional)</Label>
              <textarea
                id="dlg-notes"
                rows={3}
                placeholder="Indicaciones especiales..."
                className="w-full rounded-md bg-[#111] border border-[#333] text-[#E5E2E1] placeholder:text-[#A78B7D]/50 px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-[#F97316] focus-visible:outline-none resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="border-[#333] bg-transparent text-[#E5E2E1] hover:bg-[#1A1A1A]">
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#F97316] hover:bg-[#EA680C] text-white border-0">Asignar</Button>
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
      <div className="rounded-lg bg-[#1A1A1A] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#333] hover:bg-transparent">
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Empleado</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Rol</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Turno</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D] text-right">Horas</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Estado</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map(shift => (
              <TableRow key={shift.id} className="border-b border-[#222] hover:bg-[#222]/50">
                <TableCell className="font-medium text-[#E5E2E1]">
                  {shift.staff?.name ?? shift.staff_id}
                </TableCell>
                <TableCell>
                  <RoleBadge role={shift.role} />
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-[#A78B7D]">
                  {formatTime(shift.shift_start)} – {formatTime(shift.shift_end)}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-[#E5E2E1]">
                  {shiftHours(shift.shift_start, shift.shift_end)}h
                </TableCell>
                <TableCell>
                  <ShiftStatusBadge status={shift.status} />
                </TableCell>
                <TableCell className="text-[#A78B7D] text-sm max-w-[180px] truncate">
                  {shift.notes ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center gap-4 px-1 text-xs text-[#A78B7D]">
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
                  ? "bg-[#F97316]/10 border-l-2 border-l-[#F97316]"
                  : "bg-[#1A1A1A] hover:bg-[#222]"
              )}
            >
              <p className="text-sm font-medium leading-tight text-[#E5E2E1]">{ev.name}</p>
              <p className="mt-1 text-xs flex items-center gap-1 text-[#A78B7D]">
                <CalendarDays className="h-3 w-3" />
                {formatDate(ev.date)}
              </p>
            </button>
          )
        })}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 border-[#333] bg-transparent text-[#E5E2E1] hover:bg-[#1A1A1A]"
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
          <SelectTrigger className="w-52 bg-[#1A1A1A] border-[#333] text-[#E5E2E1]">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1A] border-[#333]">
            <SelectItem value="all">Todos los roles</SelectItem>
            {(Object.keys(ROLE_LABELS) as StaffRole[]).map(r => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-[#A78B7D]">{filtered.length} empleados</span>
      </div>

      <div className="rounded-lg bg-[#1A1A1A] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#333] hover:bg-transparent">
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Nombre</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Rol</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Email</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Telefono</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D] text-right">Tarifa / h</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(member => (
              <TableRow key={member.id} className="border-b border-[#222] hover:bg-[#222]/50">
                <TableCell className="font-medium text-[#E5E2E1]">{member.name}</TableCell>
                <TableCell>
                  <RoleBadge role={member.role} />
                </TableCell>
                <TableCell className="text-sm text-[#A78B7D]">
                  {member.email ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-[#A78B7D]">
                  {member.phone ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm text-[#E5E2E1]">
                  {member.hourly_rate != null ? `${member.hourly_rate} \u20AC` : "—"}
                </TableCell>
                <TableCell>
                  {member.is_active ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] uppercase tracking-widest">
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-[#A78B7D]/15 text-[#A78B7D] border-0 text-[10px] uppercase tracking-widest">
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
        <div className="bg-[#111] px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">
          Empleado
        </div>
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "bg-[#111] px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-widest",
              i === 0 ? "text-[#F97316]" : "text-[#A78B7D]"
            )}
          >
            <div>
              {d.toLocaleDateString("es-ES", { weekday: "short" })}
            </div>
            <div className={cn("text-sm font-bold", i === 0 ? "text-[#F97316]" : "text-[#E5E2E1]")}>
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
              className="grid border-b border-[#222] hover:bg-[#222]/30 transition-colors"
              style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}
            >
              {/* Name column */}
              <div className="px-3 py-2.5 border-r border-[#222] bg-[#1A1A1A]">
                <p className="text-sm font-medium truncate text-[#E5E2E1]">{member.name}</p>
                <p className="text-xs text-[#A78B7D]">{ROLE_LABELS[member.role]}</p>
              </div>

              {/* Day cells */}
              {days.map((_, dayIdx) => {
                const dayShifts = staffMap?.get(dayIdx) ?? []
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "px-1 py-1.5 min-h-[52px] border-r border-[#222] last:border-r-0 space-y-0.5",
                      dayIdx === 0 && "bg-[#F97316]/5"
                    )}
                  >
                    {dayShifts.map(shift => (
                      <div
                        key={shift.id}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight truncate",
                          EVENT_COLORS[shift.event_id] ?? "bg-[#A78B7D]/15 text-[#A78B7D]"
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
              EVENT_COLORS[ev.id] ?? "bg-[#A78B7D]/15 text-[#A78B7D]"
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
        <div key={s.event_id} className="rounded-lg bg-[#1A1A1A] p-5">
          <p className="text-sm font-semibold leading-tight line-clamp-2 text-[#E5E2E1]">
            {s.event_name}
          </p>
          <p className="flex items-center gap-1 text-xs mt-1 text-[#A78B7D]">
            <CalendarDays className="h-3 w-3" />
            {formatDate(s.event_date)}
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-[#A78B7D]">
                <Users2 className="h-3.5 w-3.5" />
                {s.total_shifts} turnos
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {s.confirmed} conf.
              </span>
              {s.pending > 0 && (
                <span className="flex items-center gap-1 text-xs text-orange-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {s.pending} pend.
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-[#A78B7D]">
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
          <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316] mb-1">
            BRIGADA Y PERSONAL
          </p>
          <h1 className="text-3xl font-bold text-[#E5E2E1]">Planificacion de Personal</h1>
          <p className="text-[#A78B7D] text-sm mt-1">
            Gestion de turnos y plantilla por evento
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#F97316] hover:bg-[#EA680C] text-white border-0">
          <Plus className="mr-2 h-4 w-4" />
          Asignar turno
        </Button>
      </div>

      {/* Summary cards */}
      <SummaryCards />

      {/* Tabs */}
      <Tabs defaultValue="por-evento">
        <TabsList className="bg-[#111] border border-[#333]">
          <TabsTrigger value="por-evento" className="data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-[#F97316] text-[#A78B7D]">Por Evento</TabsTrigger>
          <TabsTrigger value="plantilla" className="data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-[#F97316] text-[#A78B7D]">Plantilla</TabsTrigger>
          <TabsTrigger value="semana" className="data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-[#F97316] text-[#A78B7D]">Vista Semana</TabsTrigger>
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
