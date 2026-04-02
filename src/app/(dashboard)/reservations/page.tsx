"use client"

import { useState, useMemo } from "react"
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  LayoutList,
  Clock,
  Users,
  Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  useReservationsCalendar,
  useReservationsWeek,
  useReservations,
} from "@/features/reservations/hooks/use-reservations"
import type { Reservation } from "@/features/reservations/schemas/reservation.schema"
import { useTables } from "@/features/reservations/hooks/use-reservations"
import { NewReservationDialog } from "@/features/reservations/components/NewReservationDialog"

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

const DAY_NAMES = ["L", "M", "X", "J", "V", "S", "D"]
const DAY_NAMES_LONG = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  confirmed: { label: "Confirmada", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  seated: { label: "En mesa", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  completed: { label: "Completada", color: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400" },
  no_show: { label: "No show", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

const SOURCE_LABELS: Record<string, string> = {
  phone: "Teléfono",
  walk_in: "Walk-in",
  web: "Web",
  app: "App",
  thefork: "TheFork",
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function getMondayOfCurrentWeek(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = (day + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - diff)
  return monday.toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y}`
}

function todayKey(): string {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
}

function getTableName(tableId: string | undefined, tables: Array<{ id: string; name: string }>): string {
  if (!tableId) return "—"
  const table = tables.find((t) => t.id === tableId)
  return table ? table.name : "—"
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return null
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        cfg.color,
      )}
    >
      {cfg.label}
    </span>
  )
}

function ReservationPill({
  reservation,
  onClick,
}: {
  reservation: Reservation
  onClick: (r: Reservation) => void
}) {
  const statusColors: Record<string, string> = {
    confirmed: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
    pending: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800",
    seated: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
    completed: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700",
    no_show: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    cancelled: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  }

  return (
    <button
      type="button"
      onClick={() => onClick(reservation)}
      className={cn(
        "block w-full text-left truncate rounded border px-1.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
        statusColors[reservation.status] ?? "bg-gray-50 text-gray-700 border-gray-200",
        reservation.is_vip && "border-l-2 border-l-amber-500",
      )}
      title={`${reservation.time} ${reservation.customer_name}`}
    >
      {reservation.time} {reservation.customer_name}
    </button>
  )
}

// ─── Reservation Detail Dialog ────────────────────────────────────────────────

function ReservationDetailDialog({
  reservation,
  open,
  onClose,
  tables,
}: {
  reservation: Reservation | null
  open: boolean
  onClose: () => void
  tables: Array<{ id: string; name: string }>
}) {
  if (!reservation) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{reservation.customer_name}</DialogTitle>
          <div className="flex flex-wrap gap-2 pt-1">
            <StatusBadge status={reservation.status} />
            {reservation.is_vip && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                VIP
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Time & Date */}
          <div className="flex items-start gap-3">
            <Clock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{reservation.time}</p>
              <p className="text-muted-foreground">{formatDate(reservation.date)}</p>
            </div>
          </div>

          {/* Pax */}
          <div className="flex items-start gap-3">
            <Users className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <p>{reservation.pax} {reservation.pax === 1 ? "persona" : "personas"}</p>
          </div>

          {/* Phone */}
          {reservation.customer_phone && (
            <div className="flex items-start gap-3">
              <Phone className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <p>{reservation.customer_phone}</p>
            </div>
          )}

          {/* Table */}
          <div className="flex items-start gap-3">
            <CalendarDays className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <p>{getTableName(reservation.table_id, tables)}</p>
          </div>

          {/* Notes */}
          {reservation.notes && (
            <div className="bg-muted/40 rounded-md p-3 text-xs">
              <p className="text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                Notas
              </p>
              <p>{reservation.notes}</p>
            </div>
          )}

          {/* Source */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Fuente:</span>
            <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-xs font-medium">
              {SOURCE_LABELS[reservation.source] ?? reservation.source}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Month View ─────────────────────────────────────────────────────────────

function MonthView({
  year,
  month,
  onSelectReservation,
  tables,
}: {
  year: number
  month: number
  onSelectReservation: (r: Reservation) => void
  tables: Array<{ id: string; name: string }>
}) {
  const { calendarDays, reservationsByDate } = useReservationsCalendar(year, month)
  const [dayPanel, setDayPanel] = useState<string | null>(null)
  const today = todayKey()

  const dayPanelReservations = dayPanel ? (reservationsByDate[dayPanel] ?? []) : []

  return (
    <div className="space-y-3">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-px">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-muted-foreground py-2 text-center text-xs font-semibold uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {calendarDays.map((cell, idx) => {
          const reservations = cell.date ? (reservationsByDate[cell.date] ?? []) : []
          const isToday = cell.date === today
          const isSelected = cell.date === dayPanel

          return (
            <div
              key={idx}
              onClick={() =>
                cell.isCurrentMonth && cell.date
                  ? setDayPanel(isSelected ? null : cell.date)
                  : undefined
              }
              className={cn(
                "bg-background flex min-h-[96px] flex-col gap-1 p-1.5",
                !cell.isCurrentMonth && "bg-muted/30",
                isToday && "bg-blue-50 dark:bg-blue-950/30",
                isSelected && "ring-2 ring-inset ring-blue-400",
                cell.isCurrentMonth && "cursor-pointer hover:bg-muted/20",
              )}
            >
              {cell.dayNum !== null && (
                <>
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center self-start rounded-full text-xs font-medium",
                      isToday
                        ? "bg-blue-600 text-white"
                        : cell.isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {cell.dayNum}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {reservations.slice(0, 3).map((r) => (
                      <ReservationPill
                        key={r.id}
                        reservation={r}
                        onClick={onSelectReservation}
                      />
                    ))}
                    {reservations.length > 3 && (
                      <span className="text-muted-foreground px-1 text-xs">
                        +{reservations.length - 3} más
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Day panel */}
      {dayPanel && dayPanelReservations.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">
                Reservas del {formatDate(dayPanel)}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDayPanel(null)}
              >
                Cerrar
              </Button>
            </div>
            <div className="space-y-2">
              {dayPanelReservations.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/30",
                    r.is_vip && "border-l-2 border-l-amber-500",
                  )}
                  onClick={() => onSelectReservation(r)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.customer_name}</p>
                    <p className="text-muted-foreground text-xs">
                      {r.time} · {r.pax} pax · {getTableName(r.table_id, tables)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={r.status} />
                    {r.is_vip && (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        VIP
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Week View ──────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  onSelectReservation,
  tables,
}: {
  weekStart: string
  onSelectReservation: (r: Reservation) => void
  tables: Array<{ id: string; name: string }>
}) {
  const { reservationsByDate } = useReservationsWeek(weekStart)
  const today = todayKey()

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = addDays(weekStart, i)
      const parts = dateStr.split("-")
      const m = parts[1] ?? "01"
      const d = parts[2] ?? "01"
      return {
        dateStr,
        label: `${DAY_NAMES_LONG[i] ?? ""} ${parseInt(d)}/${parseInt(m)}`,
        dayNum: parseInt(d),
      }
    })
  }, [weekStart])

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map(({ dateStr, label }) => {
        const reservations = (reservationsByDate[dateStr] ?? []).sort(
          (a, b) => a.time.localeCompare(b.time),
        )
        const isToday = dateStr === today

        return (
          <div key={dateStr} className="flex flex-col gap-2">
            {/* Column header */}
            <div
              className={cn(
                "rounded-md py-2 text-center text-xs font-semibold",
                isToday
                  ? "bg-blue-600 text-white"
                  : "bg-muted/50 text-muted-foreground",
              )}
            >
              {label}
            </div>

            {/* Reservations */}
            <div
              className={cn(
                "min-h-[300px] rounded-md border p-2 space-y-2",
                isToday && "border-blue-200 bg-blue-50/40 dark:bg-blue-950/20",
              )}
            >
              {reservations.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-xs">
                  Sin reservas
                </p>
              ) : (
                reservations.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => onSelectReservation(r)}
                    className={cn(
                      "cursor-pointer rounded border bg-card p-2 shadow-sm transition-colors hover:bg-muted/30",
                      r.is_vip && "border-l-2 border-l-amber-500",
                    )}
                  >
                    <p className="text-xs font-semibold leading-tight truncate">
                      {r.time}
                    </p>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {r.customer_name}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{r.pax}</span>
                      <span className="mx-0.5">·</span>
                      <span>{getTableName(r.table_id, tables)}</span>
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── List View ──────────────────────────────────────────────────────────────

function ListView({
  onSelectReservation,
  tables,
}: {
  onSelectReservation: (r: Reservation) => void
  tables: Array<{ id: string; name: string }>
}) {
  const { reservations: allReservations } = useReservations()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filtered = useMemo(() => {
    return allReservations
      .filter((r) => r.customer_name.toLowerCase().includes(search.toLowerCase()))
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .sort((a, b) => {
        const dateComp = a.date.localeCompare(b.date)
        if (dateComp !== 0) return dateComp
        return a.time.localeCompare(b.time)
      })
  }, [allReservations, search, statusFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar por cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-input bg-background h-9 flex-1 rounded-md border px-3 text-sm min-w-[200px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="all">Todos los estados</option>
          {Object.keys(STATUS_CONFIG).map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s]!.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-4 py-3 text-left font-medium">Cliente</th>
              <th className="px-4 py-3 text-left font-medium">Hora</th>
              <th className="px-4 py-3 text-right font-medium">Pax</th>
              <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Mesa</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Fuente</th>
              <th className="hidden px-4 py-3 text-center font-medium lg:table-cell">VIP</th>
              <th className="hidden px-4 py-3 text-left font-medium xl:table-cell">Notas</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-muted-foreground py-12 text-center"
                >
                  No se encontraron reservas
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="max-w-[180px] px-4 py-3">
                    <p className="truncate font-medium">{r.customer_name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatDate(r.date)}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{r.time}</td>
                  <td className="px-4 py-3 text-right">{r.pax}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">
                    {getTableName(r.table_id, tables)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-xs font-medium">
                      {SOURCE_LABELS[r.source] ?? r.source}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-center lg:table-cell">
                    {r.is_vip ? (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        VIP
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="hidden max-w-[200px] px-4 py-3 xl:table-cell">
                    <p className="truncate text-xs text-muted-foreground">
                      {r.notes ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectReservation(r)}
                    >
                      Ver
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ReservationsPage() {
  const { tables } = useTables()
  const today = new Date()

  const [view, setView] = useState<"mes" | "semana" | "lista">("mes")
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [weekStart, setWeekStart] = useState(getMondayOfCurrentWeek)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newDialogOpen, setNewDialogOpen] = useState(false)

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }
  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }
  const goToday = () => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth() + 1)
    setWeekStart(getMondayOfCurrentWeek())
  }

  // Week navigation
  const prevWeek = () => setWeekStart((ws) => addDays(ws, -7))
  const nextWeek = () => setWeekStart((ws) => addDays(ws, 7))

  // Compute week end label
  const weekEndStr = addDays(weekStart, 6)
  const wsParts = weekStart.split("-")
  const weParts = weekEndStr.split("-")
  const wsY = wsParts[0] ?? ""
  const wsM = wsParts[1] ?? "01"
  const wsD = wsParts[2] ?? "01"
  const weY = weParts[0] ?? ""
  const weM = weParts[1] ?? "01"
  const weD = weParts[2] ?? "01"
  const weekLabel =
    wsM === weM
      ? `${parseInt(wsD)} – ${parseInt(weD)} de ${MONTH_NAMES[parseInt(wsM) - 1] ?? ""} ${wsY}`
      : `${parseInt(wsD)} ${MONTH_NAMES[parseInt(wsM) - 1] ?? ""} – ${parseInt(weD)} ${MONTH_NAMES[parseInt(weM) - 1] ?? ""} ${wsY !== weY ? wsY : ""} ${weY}`

  function openReservation(r: Reservation) {
    setSelectedReservation(r)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reservas</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de reservas del restaurante
          </p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva reserva
        </Button>
      </div>

      {/* ── View Toggle + Navigation ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View toggle */}
        <div className="flex items-center rounded-lg border p-0.5">
          <Button
            variant={view === "mes" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-3"
            onClick={() => setView("mes")}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Mes
          </Button>
          <Button
            variant={view === "semana" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-3"
            onClick={() => setView("semana")}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            Semana
          </Button>
          <Button
            variant={view === "lista" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-3"
            onClick={() => setView("lista")}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Lista
          </Button>
        </div>

        {/* Month / week navigation (hidden in list view) */}
        {view !== "lista" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={view === "mes" ? prevMonth : prevWeek}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[220px] text-center text-sm font-semibold">
              {view === "mes"
                ? `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`
                : weekLabel}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={view === "mes" ? nextMonth : nextWeek}
              aria-label="Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={goToday}>
              Hoy
            </Button>
          </div>
        )}
      </div>

      {/* ── View Content ── */}
      {view === "mes" && (
        <MonthView
          year={currentYear}
          month={currentMonth}
          onSelectReservation={openReservation}
          tables={tables}
        />
      )}
      {view === "semana" && (
        <WeekView weekStart={weekStart} onSelectReservation={openReservation} tables={tables} />
      )}
      {view === "lista" && <ListView onSelectReservation={openReservation} tables={tables} />}

      {/* ── Reservation Detail Dialog ── */}
      <ReservationDetailDialog
        reservation={selectedReservation}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setSelectedReservation(null)
        }}
        tables={tables}
      />

      {/* ── New Reservation Dialog ── */}
      <NewReservationDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
      />
    </div>
  )
}
