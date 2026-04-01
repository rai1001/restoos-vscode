"use client"

import { useState, useMemo, Fragment } from "react"
import { toast } from "sonner"
import { ShieldCheck, ChevronLeft, ChevronRight, Plus, CheckCircle2, AlertTriangle, XCircle, BarChart3, ThermometerSun, Droplets, Truck, User, Bug, FlameKindling, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppccRecords, useAppccTemplates, useAppccDailySummary } from "@/features/appcc/use-appcc"
import type { CheckType, CheckFrequency, CheckStatus, CheckTemplate } from "@/features/appcc/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
  })
}

const CHECK_TYPE_LABELS: Record<CheckType, string> = {
  temperatura: "Temperatura",
  limpieza: "Limpieza",
  recepcion: "Recepción",
  higiene_personal: "Higiene personal",
  control_plagas: "Control plagas",
  aceite_fritura: "Aceite fritura",
  otro: "Otro",
}

const CHECK_TYPE_ICONS: Record<CheckType, React.ComponentType<{ className?: string }>> = {
  temperatura: ThermometerSun,
  limpieza: Droplets,
  recepcion: Truck,
  higiene_personal: User,
  control_plagas: Bug,
  aceite_fritura: FlameKindling,
  otro: HelpCircle,
}

const FREQUENCY_LABELS: Record<CheckFrequency, string> = {
  diario: "Diario",
  semanal: "Semanal",
  mensual: "Mensual",
  por_recepcion: "Por recepción",
}

function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === "ok") {
    return (
      <Badge className="bg-green-900/30 text-green-400 border-0">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        OK
      </Badge>
    )
  }
  if (status === "alerta") {
    return (
      <Badge className="bg-yellow-900/30 text-yellow-400 border-0">
        <AlertTriangle className="mr-1 h-3 w-3" />
        Alerta
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-900/30 text-red-400 border-0">
      <XCircle className="mr-1 h-3 w-3" />
      Crítico
    </Badge>
  )
}

function LimitsCell({ template }: { template: CheckTemplate }) {
  const { min_value, max_value, unit } = template
  if (min_value === null && max_value === null) return <span className="text-[#A78B7D]">—</span>
  if (min_value !== null && max_value !== null)
    return <span>{min_value} – {max_value} {unit}</span>
  if (min_value !== null)
    return <span>≥ {min_value} {unit}</span>
  return <span>≤ {max_value} {unit}</span>
}

// ─── New Record Dialog ─────────────────────────────────────────────────────────

interface NewRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: CheckTemplate[]
  selectedDate: string
}

function NewRecordDialog({ open, onOpenChange, templates, selectedDate }: NewRecordDialogProps) {
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "")
  const [value, setValue] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [correctiveAction, setCorrectiveAction] = useState<string>("")

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null

  const needsValue = selectedTemplate?.unit !== null
  const numericValue = parseFloat(value)

  const isOutOfRange = needsValue && !isNaN(numericValue) && selectedTemplate !== null && (
    (selectedTemplate.min_value !== null && numericValue < selectedTemplate.min_value) ||
    (selectedTemplate.max_value !== null && numericValue > selectedTemplate.max_value)
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTemplate) return
    if (needsValue && value.trim() === "") {
      toast.error("Introduce el valor medido")
      return
    }
    toast.success(
      `Registro guardado para "${selectedTemplate.name}" — ${selectedDate}`,
      { description: isOutOfRange ? "Valor fuera de rango — revisa la acción correctiva." : "Control registrado correctamente." }
    )
    onOpenChange(false)
    // Reset form
    setValue("")
    setNotes("")
    setCorrectiveAction("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1A1A1A] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-[#E5E2E1]">Nuevo registro APPCC</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template selector */}
          <div className="space-y-1.5">
            <Label htmlFor="template-select" className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Plantilla de control</Label>
            <select
              id="template-select"
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value)
                setValue("")
                setCorrectiveAction("")
              }}
              className={cn(
                "flex h-8 w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-2.5 py-1 text-sm text-[#E5E2E1]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 focus-visible:border-[#F97316]",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({CHECK_TYPE_LABELS[t.check_type]})
                </option>
              ))}
            </select>
            {selectedTemplate?.description && (
              <p className="text-xs text-[#A78B7D]">{selectedTemplate.description}</p>
            )}
          </div>

          {/* Numeric value — only when template has a unit */}
          {needsValue && (
            <div className="space-y-1.5">
              <Label htmlFor="record-value" className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">
                Valor medido
                {selectedTemplate?.unit && (
                  <span className="ml-1 text-[#A78B7D]/70">({selectedTemplate.unit})</span>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="record-value"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={cn(
                    "bg-[#0A0A0A] border-white/10 text-[#E5E2E1]",
                    isOutOfRange && "border-red-400 focus-visible:ring-red-400/50"
                  )}
                />
                {selectedTemplate?.unit && (
                  <span className="text-sm text-[#A78B7D] shrink-0">{selectedTemplate.unit}</span>
                )}
              </div>
              {/* Limits hint */}
              {selectedTemplate && (selectedTemplate.min_value !== null || selectedTemplate.max_value !== null) && (
                <p className={cn(
                  "text-xs",
                  isOutOfRange ? "text-red-400 font-medium" : "text-[#A78B7D]"
                )}>
                  {isOutOfRange ? "⚠ Valor fuera del rango permitido — " : "Rango: "}
                  <LimitsCell template={selectedTemplate} />
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="record-notes" className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Notas <span className="text-[#A78B7D]/70">(opcional)</span></Label>
            <textarea
              id="record-notes"
              rows={2}
              placeholder="Observaciones adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(
                "flex min-h-[60px] w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E2E1]",
                "placeholder:text-[#A78B7D]/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 focus-visible:border-[#F97316]",
                "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              )}
            />
          </div>

          {/* Corrective action — shown when value is out of range */}
          {isOutOfRange && (
            <div className="space-y-1.5">
              <Label htmlFor="record-corrective" className="text-xs font-medium uppercase tracking-widest text-red-400">
                Acción correctiva <span className="font-normal">(requerida)</span>
              </Label>
              <textarea
                id="record-corrective"
                rows={2}
                placeholder="Describe la acción correctiva tomada..."
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                className={cn(
                  "flex min-h-[60px] w-full rounded-lg border border-red-500/30 bg-[#0A0A0A] px-3 py-2 text-sm text-[#E5E2E1]",
                  "placeholder:text-[#A78B7D]/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:border-red-400",
                  "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                )}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-[#A78B7D] hover:bg-white/5">
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#F97316] hover:bg-[#F97316]/90 text-white">
              Guardar registro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Records Tab ───────────────────────────────────────────────────────────────

function RecordsTab({ date }: { date: string }) {
  const { records, isLoading } = useAppccRecords(date)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) {
    return <p className="text-[#A78B7D] text-sm py-4">Cargando registros...</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/5 hover:bg-transparent">
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Control</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Tipo</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Valor</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Límites</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Estado</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Registrado por</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Hora</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => {
          const template = record.template
          if (!template) return null
          const TypeIcon = CHECK_TYPE_ICONS[template.check_type]
          const isExpanded = expandedId === record.id
          const hasDetails = record.notes !== null || record.corrective_action !== null

          return (
            <Fragment key={record.id}>
              <TableRow
                className={cn(
                  "border-white/5 hover:bg-white/5",
                  hasDetails && "cursor-pointer select-none",
                  record.status === "critico" && "bg-red-900/20",
                  record.status === "alerta" && "bg-yellow-900/20"
                )}
                onClick={() => {
                  if (hasDetails) setExpandedId(isExpanded ? null : record.id)
                }}
              >
                <TableCell className="font-medium text-[#E5E2E1]">
                  <span className="flex items-center gap-2">
                    {template.name}
                    {hasDetails && (
                      <span className="text-xs text-[#A78B7D]">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-[#A78B7D]">
                    <TypeIcon className="h-3.5 w-3.5" />
                    {CHECK_TYPE_LABELS[template.check_type]}
                  </span>
                </TableCell>
                <TableCell>
                  {record.value !== null
                    ? <span className="font-mono text-[#E5E2E1]">{record.value} {template.unit}</span>
                    : <span className="text-[#A78B7D]">—</span>
                  }
                </TableCell>
                <TableCell className="text-[#A78B7D]">
                  <LimitsCell template={template} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={record.status} />
                </TableCell>
                <TableCell className="text-[#A78B7D]">
                  {record.checked_by_name ?? record.checked_by}
                </TableCell>
                <TableCell className="text-[#A78B7D] font-mono text-xs">
                  {record.recorded_at.slice(11, 16)}
                </TableCell>
              </TableRow>

              {/* Expanded detail row */}
              {isExpanded && (
                <TableRow key={`${record.id}-detail`} className="bg-white/5 border-white/5">
                  <TableCell colSpan={7} className="py-3 px-4">
                    <div className="space-y-2 text-sm">
                      {record.notes && (
                        <div className="text-[#E5E2E1]">
                          <span className="font-medium text-[#A78B7D]">Notas: </span>
                          {record.notes}
                        </div>
                      )}
                      {record.corrective_action && (
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                          <div className="text-[#E5E2E1]">
                            <span className="font-medium text-red-400">Acción correctiva: </span>
                            {record.corrective_action}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}

// ─── Templates Tab ─────────────────────────────────────────────────────────────

function TemplatesTab() {
  const { templates } = useAppccTemplates()
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(templates.map((t) => [t.id, t.is_active]))
  )

  function toggleActive(id: string) {
    setActiveMap((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      const name = templates.find((t) => t.id === id)?.name ?? id
      toast.success(next[id] ? `"${name}" activada` : `"${name}" desactivada`)
      return next
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/5 hover:bg-transparent">
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Nombre</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Tipo</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Frecuencia</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Límites</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Activa</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map((t) => {
          const TypeIcon = CHECK_TYPE_ICONS[t.check_type]
          const isActive = activeMap[t.id] ?? t.is_active
          return (
            <TableRow key={t.id} className="border-white/5 hover:bg-white/5">
              <TableCell>
                <div>
                  <p className="font-medium text-[#E5E2E1]">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-[#A78B7D] mt-0.5">{t.description}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5 text-[#A78B7D]">
                  <TypeIcon className="h-3.5 w-3.5" />
                  {CHECK_TYPE_LABELS[t.check_type]}
                </span>
              </TableCell>
              <TableCell className="text-[#A78B7D]">
                {FREQUENCY_LABELS[t.frequency]}
              </TableCell>
              <TableCell className="text-[#A78B7D]">
                <LimitsCell template={t} />
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => toggleActive(t.id)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A]",
                    isActive ? "bg-[#F97316]" : "bg-white/10"
                  )}
                  role="switch"
                  aria-checked={isActive}
                >
                  <span
                    className={cn(
                      "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                      isActive ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

// ─── History Tab ───────────────────────────────────────────────────────────────

function HistoryTab() {
  const { summaries, isLoading } = useAppccDailySummary(7)

  const maxTotal = useMemo(
    () => Math.max(...summaries.map((s) => s.total), 1),
    [summaries]
  )

  if (isLoading) {
    return <p className="text-[#A78B7D] text-sm py-4">Cargando histórico...</p>
  }

  return (
    <div className="space-y-6">
      {/* Mini bar chart */}
      <div className="rounded-lg bg-[#1A1A1A] p-4">
        <p className="text-xs font-medium uppercase tracking-widest text-[#A78B7D] mb-3">Registros últimos 7 días</p>
        <div className="flex items-end gap-2 h-24">
          {summaries.map((s) => {
            const totalPct = (s.total / maxTotal) * 100
            const okPct = s.total > 0 ? (s.ok / s.total) * 100 : 0
            const alertPct = s.total > 0 ? (s.alerts / s.total) * 100 : 0
            const criticalPct = s.total > 0 ? (s.critical / s.total) * 100 : 0

            return (
              <div key={s.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm overflow-hidden flex flex-col-reverse"
                  style={{ height: `${Math.max(totalPct, 8)}%` }}
                  title={`${s.date}: ${s.ok} OK, ${s.alerts} alertas, ${s.critical} críticos`}
                >
                  {criticalPct > 0 && (
                    <div
                      className="w-full bg-red-500"
                      style={{ height: `${criticalPct}%` }}
                    />
                  )}
                  {alertPct > 0 && (
                    <div
                      className="w-full bg-yellow-500"
                      style={{ height: `${alertPct}%` }}
                    />
                  )}
                  {okPct > 0 && (
                    <div
                      className="w-full bg-green-500"
                      style={{ height: `${okPct}%` }}
                    />
                  )}
                </div>
                <span className="text-xs text-[#A78B7D]">{formatShortDate(s.date)}</span>
              </div>
            )
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-[#A78B7D]">
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" /> OK</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-500" /> Alerta</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500" /> Crítico</span>
        </div>
      </div>

      {/* Summary table */}
      <Table>
        <TableHeader>
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Fecha</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Total</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">OK</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Alertas</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Críticos</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Completado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...summaries].reverse().map((s) => (
            <TableRow key={s.date} className="border-white/5 hover:bg-white/5">
              <TableCell className="font-medium text-[#E5E2E1]">
                {new Date(s.date).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })}
              </TableCell>
              <TableCell className="text-[#E5E2E1]">{s.total}</TableCell>
              <TableCell>
                <span className="text-green-400 font-medium">{s.ok}</span>
              </TableCell>
              <TableCell>
                {s.alerts > 0
                  ? <span className="text-yellow-400 font-medium">{s.alerts}</span>
                  : <span className="text-[#A78B7D]">0</span>
                }
              </TableCell>
              <TableCell>
                {s.critical > 0
                  ? <span className="text-red-400 font-medium">{s.critical}</span>
                  : <span className="text-[#A78B7D]">0</span>
                }
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${s.completion_pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#A78B7D]">{s.completion_pct}%</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AppccPage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayStr())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("registros")

  const { records } = useAppccRecords(selectedDate)
  const { templates } = useAppccTemplates()

  // Summary stats for selected date
  const stats = useMemo(() => {
    const ok = records.filter((r) => r.status === "ok").length
    const alerts = records.filter((r) => r.status === "alerta").length
    const critical = records.filter((r) => r.status === "critico").length
    const total = records.length
    const pct = total > 0 ? Math.round(((ok + alerts + critical) / total) * 100) : 0
    return { ok, alerts, critical, total, pct }
  }, [records])

  const isToday = selectedDate === todayStr()
  const isFuture = selectedDate > todayStr()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#F97316]">
            SEGURIDAD ALIMENTARIA
          </p>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-[#E5E2E1]">
            <ShieldCheck className="h-6 w-6 text-[#F97316]" />
            APPCC / Control de puntos críticos
          </h1>
          <p className="text-[#A78B7D] mt-1">
            Registros de seguridad alimentaria — {formatDisplayDate(selectedDate)}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 bg-[#F97316] hover:bg-[#F97316]/90 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo registro
        </Button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          className="border-white/10 text-[#A78B7D] hover:bg-white/5 hover:text-[#E5E2E1]"
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Día anterior</span>
        </Button>
        <div className="min-w-[140px] text-center text-sm font-medium text-[#E5E2E1]">
          {isToday ? "Hoy" : formatShortDate(selectedDate)}
          {!isToday && (
            <span className="ml-1 text-xs text-[#A78B7D]">
              ({selectedDate})
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          className="border-white/10 text-[#A78B7D] hover:bg-white/5 hover:text-[#E5E2E1]"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          disabled={isToday}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Día siguiente</span>
        </Button>
        {!isToday && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(todayStr())}
            className="text-xs text-[#F97316] hover:bg-white/5"
          >
            Hoy
          </Button>
        )}
      </div>

      {/* KPI summary cards — dark styled with 4px border-l semantic colors */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-[#1A1A1A] border-l-4 border-l-green-500 p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-[#A78B7D] flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Controles OK
          </p>
          <div>
            <span className="text-3xl font-bold text-green-400">
              {stats.ok}
            </span>
            <span className="text-[#A78B7D] text-sm ml-1">/ {stats.total}</span>
          </div>
        </div>

        <div className="rounded-lg bg-[#1A1A1A] border-l-4 border-l-yellow-500 p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-[#A78B7D] flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Alertas
          </p>
          <div>
            <span className={cn(
              "text-3xl font-bold",
              stats.alerts > 0
                ? "text-yellow-400"
                : "text-[#A78B7D]"
            )}>
              {stats.alerts}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-[#1A1A1A] border-l-4 border-l-red-500 p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-[#A78B7D] flex items-center gap-1.5 mb-2">
            <XCircle className="h-4 w-4 text-red-500" />
            Críticos
          </p>
          <div>
            <span className={cn(
              "text-3xl font-bold",
              stats.critical > 0
                ? "text-red-400"
                : "text-[#A78B7D]"
            )}>
              {stats.critical}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-[#1A1A1A] border-l-4 border-l-[#F97316] p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-[#A78B7D] flex items-center gap-1.5 mb-2">
            <BarChart3 className="h-4 w-4 text-[#F97316]" />
            Completado
          </p>
          <div className="space-y-2">
            <span className="text-3xl font-bold text-[#E5E2E1]">{isFuture ? "—" : `${stats.pct}%`}</span>
            {!isFuture && (
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    stats.pct === 100 ? "bg-green-500" : "bg-[#F97316]"
                  )}
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1A1A1A] border-white/5">
          <TabsTrigger value="registros" className="data-[state=active]:bg-[#F97316] data-[state=active]:text-white text-[#A78B7D]">Registros del día</TabsTrigger>
          <TabsTrigger value="plantillas" className="data-[state=active]:bg-[#F97316] data-[state=active]:text-white text-[#A78B7D]">Plantillas</TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-[#F97316] data-[state=active]:text-white text-[#A78B7D]">
            Histórico 7 días
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="mt-4">
          <div className="rounded-lg bg-[#1A1A1A]">
            <div className="p-4 pb-3">
              <p className="text-xs font-medium uppercase tracking-widest text-[#A78B7D] mb-1">
                Registros — {formatDisplayDate(selectedDate)}
              </p>
              <p className="text-sm text-[#A78B7D]">
                {stats.critical > 0 && (
                  <span className="text-red-400 font-medium">
                    {stats.critical} registro(s) con valor crítico requieren acción correctiva.{" "}
                  </span>
                )}
                Haz clic en una fila para ver notas y acciones correctivas.
              </p>
            </div>
            <RecordsTab date={selectedDate} />
          </div>
        </TabsContent>

        <TabsContent value="plantillas" className="mt-4">
          <div className="rounded-lg bg-[#1A1A1A]">
            <div className="p-4 pb-3">
              <p className="text-xs font-medium uppercase tracking-widest text-[#A78B7D] mb-1">Plantillas de control</p>
              <p className="text-sm text-[#A78B7D]">
                Configura los puntos de control que se registran diariamente.
              </p>
            </div>
            <TemplatesTab />
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <div className="rounded-lg bg-[#1A1A1A] p-4">
            <p className="text-xs font-medium uppercase tracking-widest text-[#A78B7D] mb-1">Histórico de controles</p>
            <p className="text-sm text-[#A78B7D] mb-4">
              Resumen de los últimos 7 días de registros APPCC.
            </p>
            <HistoryTab />
          </div>
        </TabsContent>
      </Tabs>

      {/* New Record Dialog */}
      <NewRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        templates={templates}
        selectedDate={selectedDate}
      />
    </div>
  )
}
