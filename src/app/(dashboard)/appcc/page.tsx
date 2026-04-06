"use client"

import { useState, useMemo, Fragment } from "react"
import { toast } from "sonner"
import {
  ShieldCheck, ChevronLeft, ChevronRight, Plus, CheckCircle2,
  AlertTriangle, XCircle, BarChart3, ThermometerSun, Droplets,
  Truck, User, Bug, FlameKindling, HelpCircle, Lock, FileCheck,
  AlertCircle, Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useAppccRecords,
  useAppccTemplates,
  useAppccDailySummary,
  useAppccDailyClosure,
  useCreateRecord,
  useCreateTemplate,
  useUpdateTemplate,
  useValidateDayClosure,
  useAppccIncidents,
  useResolveIncident,
} from "@/features/appcc/use-appcc"
import type { CheckType, CheckFrequency, CheckStatus, CheckTemplate, DailyCheckSummary } from "@/features/appcc/types"

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
      <Badge className="bg-[var(--alert-ok)]/10 text-[var(--alert-ok)] border-0">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        OK
      </Badge>
    )
  }
  if (status === "alerta") {
    return (
      <Badge className="bg-[var(--alert-warning)]/10 text-[var(--alert-warning)] border-0">
        <AlertTriangle className="mr-1 h-3 w-3" />
        Alerta
      </Badge>
    )
  }
  return (
    <Badge className="bg-[var(--alert-critical)]/10 text-[var(--alert-critical)] border-0">
      <XCircle className="mr-1 h-3 w-3" />
      Crítico
    </Badge>
  )
}

function LimitsCell({ template }: { template: CheckTemplate }) {
  const { min_value, max_value, unit } = template
  if (min_value === null && max_value === null) return <span className="text-muted-foreground">—</span>
  if (min_value !== null && max_value !== null)
    return <span>{min_value} – {max_value} {unit}</span>
  if (min_value !== null)
    return <span>≥ {min_value} {unit}</span>
  return <span>≤ {max_value} {unit}</span>
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportRecordsCSV(records: Array<{ template?: { name: string; check_type: string; unit: string | null; min_value: number | null; max_value: number | null } | null; value: number | null; status: string; checked_by_name: string; recorded_at: string; notes: string | null; corrective_action: string | null }>, date: string) {
  const header = "Control,Tipo,Valor,Unidad,Min,Max,Estado,Registrado por,Hora,Notas,Acción correctiva"
  const rows = records.map(r => {
    const t = r.template
    return [
      t?.name ?? "",
      t?.check_type ?? "",
      r.value ?? "",
      t?.unit ?? "",
      t?.min_value ?? "",
      t?.max_value ?? "",
      r.status,
      r.checked_by_name,
      r.recorded_at.slice(11, 16),
      (r.notes ?? "").replace(/,/g, ";"),
      (r.corrective_action ?? "").replace(/,/g, ";"),
    ].join(",")
  })
  const csv = [header, ...rows].join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `appcc-${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
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

  const createRecord = useCreateRecord()

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null
  const needsValue = selectedTemplate?.unit !== null
  const numericValue = parseFloat(value)
  const isOutOfRange = needsValue && !isNaN(numericValue) && selectedTemplate !== null && (
    (selectedTemplate.min_value !== null && numericValue < selectedTemplate.min_value) ||
    (selectedTemplate.max_value !== null && numericValue > selectedTemplate.max_value)
  )

  function resetForm() {
    setValue("")
    setNotes("")
    setCorrectiveAction("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTemplate) return
    if (needsValue && value.trim() === "") {
      toast.error("Introduce el valor medido")
      return
    }
    if (isOutOfRange && correctiveAction.trim() === "") {
      toast.error("La acción correctiva es obligatoria cuando el valor está fuera de rango")
      return
    }

    createRecord.mutate(
      {
        template_id: selectedTemplate.id,
        check_date: selectedDate,
        value: needsValue ? numericValue : null,
        notes: notes.trim() || null,
        corrective_action: correctiveAction.trim() || null,
      },
      {
        onSuccess: (data) => {
          toast.success(`Registro guardado: "${selectedTemplate.name}"`, {
            description: data?.status !== "ok"
              ? "Valor fuera de rango — incidencia registrada."
              : "Control registrado correctamente.",
          })
          resetForm()
          onOpenChange(false)
        },
        onError: (err) => {
          toast.error("Error al guardar registro", {
            description: err instanceof Error ? err.message : "Error desconocido",
          })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nuevo registro APPCC</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="template-select" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Plantilla de control</Label>
            <select
              id="template-select"
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value)
                setValue("")
                setCorrectiveAction("")
              }}
              className={cn(
                "flex h-8 w-full rounded-lg border border-white/10 bg-background px-2.5 py-1 text-sm text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary",
              )}
            >
              {templates.filter((t) => t.is_active).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({CHECK_TYPE_LABELS[t.check_type]})
                </option>
              ))}
            </select>
            {selectedTemplate?.description && (
              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
            )}
          </div>

          {needsValue && (
            <div className="space-y-1.5">
              <Label htmlFor="record-value" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Valor medido
                {selectedTemplate?.unit && (
                  <span className="ml-1 text-muted-foreground/70">({selectedTemplate.unit})</span>
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
                    "bg-background border-white/10 text-foreground",
                    isOutOfRange && "border-[var(--alert-critical)] focus-visible:ring-red-400/50"
                  )}
                />
                {selectedTemplate?.unit && (
                  <span className="text-sm text-muted-foreground shrink-0">{selectedTemplate.unit}</span>
                )}
              </div>
              {selectedTemplate && (selectedTemplate.min_value !== null || selectedTemplate.max_value !== null) && (
                <p className={cn("text-xs", isOutOfRange ? "text-[var(--alert-critical)] font-medium" : "text-muted-foreground")}>
                  {isOutOfRange ? "Valor fuera del rango permitido — " : "Rango: "}
                  <LimitsCell template={selectedTemplate} />
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="record-notes" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Notas <span className="text-muted-foreground/70">(opcional)</span></Label>
            <textarea
              id="record-notes"
              rows={2}
              placeholder="Observaciones adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(
                "flex min-h-[60px] w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground",
                "placeholder:text-muted-foreground/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary",
                "resize-none"
              )}
            />
          </div>

          {isOutOfRange && (
            <div className="space-y-1.5">
              <Label htmlFor="record-corrective" className="text-xs font-medium uppercase tracking-widest text-[var(--alert-critical)]">
                Acción correctiva <span className="font-normal">(requerida)</span>
              </Label>
              <textarea
                id="record-corrective"
                rows={2}
                placeholder="Describe la acción correctiva tomada..."
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                className={cn(
                  "flex min-h-[60px] w-full rounded-lg border border-[var(--alert-critical)] bg-background px-3 py-2 text-sm text-foreground",
                  "placeholder:text-muted-foreground/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:border-[var(--alert-critical)]",
                  "resize-none"
                )}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-muted-foreground hover:bg-white/5">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={createRecord.isPending}
            >
              {createRecord.isPending ? "Guardando..." : "Guardar registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Validate Dialog ──────────────────────────────────────────────────────────

function ValidateDialog({ open, onOpenChange, date }: { open: boolean; onOpenChange: (o: boolean) => void; date: string }) {
  const [notes, setNotes] = useState("")
  const validate = useValidateDayClosure()

  function handleValidate() {
    validate.mutate(
      { date, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Cierre APPCC validado", { description: formatDisplayDate(date) })
          setNotes("")
          onOpenChange(false)
        },
        onError: (err) => {
          toast.error("Error al validar", {
            description: err instanceof Error ? err.message : "Error desconocido",
          })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">Validar cierre APPCC</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Al validar confirmas que has revisado todos los registros del día {formatDisplayDate(date)}.
          Esta acción quedará registrada con tu nombre y fecha.
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Notas de validación (opcional)</Label>
          <textarea
            rows={2}
            placeholder="Observaciones del responsable..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex min-h-[60px] w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-muted-foreground hover:bg-white/5">
            Cancelar
          </Button>
          <Button onClick={handleValidate} className="bg-[var(--alert-ok)] hover:bg-[var(--alert-ok)] text-white" disabled={validate.isPending}>
            <FileCheck className="mr-2 h-4 w-4" />
            {validate.isPending ? "Validando..." : "Validar y firmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Records Tab ───────────────────────────────────────────────────────────────

function RecordsTab({ date }: { date: string }) {
  const { records, isLoading } = useAppccRecords(date)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) {
    return <p className="text-muted-foreground text-sm py-4">Cargando registros...</p>
  }

  if (records.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No hay registros para este día"
        description="Pulsa «Nuevo registro» para empezar a documentar los controles APPCC."
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/5 hover:bg-transparent">
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Control</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Tipo</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Valor</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Límites</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Estado</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Registrado por</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Hora</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => {
          const template = record.template
          if (!template) return null
          const TypeIcon = CHECK_TYPE_ICONS[template.check_type as CheckType]
          const isExpanded = expandedId === record.id
          const hasDetails = record.notes !== null || record.corrective_action !== null

          return (
            <Fragment key={record.id}>
              <TableRow
                className={cn(
                  "border-white/5 hover:bg-white/5",
                  hasDetails && "cursor-pointer select-none",
                  record.status === "critico" && "bg-[var(--alert-critical)]/10",
                  record.status === "alerta" && "bg-[var(--alert-warning)]/10"
                )}
                onClick={() => {
                  if (hasDetails) setExpandedId(isExpanded ? null : record.id)
                }}
              >
                <TableCell className="font-medium text-foreground">
                  <span className="flex items-center gap-2">
                    {template.name}
                    {hasDetails && (
                      <span className="text-xs text-muted-foreground">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {TypeIcon && <TypeIcon className="h-3.5 w-3.5" />}
                    {CHECK_TYPE_LABELS[template.check_type as CheckType]}
                  </span>
                </TableCell>
                <TableCell>
                  {record.value !== null
                    ? <span className="font-mono text-foreground">{record.value} {template.unit}</span>
                    : <span className="text-[var(--alert-ok)]">OK</span>
                  }
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <LimitsCell template={template as CheckTemplate} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={record.status as CheckStatus} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {record.checked_by_name}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {record.recorded_at.slice(11, 16)}
                </TableCell>
              </TableRow>

              {isExpanded && (
                <TableRow key={`${record.id}-detail`} className="bg-white/5 border-white/5">
                  <TableCell colSpan={7} className="py-3 px-4">
                    <div className="space-y-2 text-sm">
                      {record.notes && (
                        <div className="text-foreground">
                          <span className="font-medium text-muted-foreground">Notas: </span>
                          {record.notes}
                        </div>
                      )}
                      {record.corrective_action && (
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-[var(--alert-critical)] mt-0.5 shrink-0" />
                          <div className="text-foreground">
                            <span className="font-medium text-[var(--alert-critical)]">Acción correctiva: </span>
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

// ─── New Template Dialog ──────────────────────────────────────────────────────

function NewTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("")
  const [checkType, setCheckType] = useState<CheckType>("temperatura")
  const [frequency, setFrequency] = useState<CheckFrequency>("diario")
  const [description, setDescription] = useState("")
  const [minValue, setMinValue] = useState("")
  const [maxValue, setMaxValue] = useState("")
  const [unit, setUnit] = useState("")

  const createTemplate = useCreateTemplate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error("Nombre obligatorio"); return }

    createTemplate.mutate(
      {
        name: name.trim(),
        check_type: checkType,
        frequency,
        description: description.trim() || null,
        min_value: minValue ? parseFloat(minValue) : null,
        max_value: maxValue ? parseFloat(maxValue) : null,
        unit: unit.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(`Plantilla "${name}" creada`)
          setName(""); setDescription(""); setMinValue(""); setMaxValue(""); setUnit("")
          onOpenChange(false)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Error"),
      }
    )
  }

  const selectClass = cn(
    "flex h-8 w-full rounded-lg border border-white/10 bg-background px-2.5 py-1 text-sm text-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nueva plantilla APPCC</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Cámara frigorífica #3" className="bg-background border-white/10 text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Tipo</Label>
              <select value={checkType} onChange={e => setCheckType(e.target.value as CheckType)} className={selectClass}>
                {Object.entries(CHECK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Frecuencia</Label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as CheckFrequency)} className={selectClass}>
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Min</Label>
              <Input type="number" step="0.1" value={minValue} onChange={e => setMinValue(e.target.value)} placeholder="—" className="bg-background border-white/10 text-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Max</Label>
              <Input type="number" step="0.1" value={maxValue} onChange={e => setMaxValue(e.target.value)} placeholder="—" className="bg-background border-white/10 text-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Unidad</Label>
              <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="°C, %, pH" className="bg-background border-white/10 text-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Descripción (opcional)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción del control..." className="bg-background border-white/10 text-foreground" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-muted-foreground hover:bg-white/5">Cancelar</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-white" disabled={createTemplate.isPending}>
              {createTemplate.isPending ? "Creando..." : "Crear plantilla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Templates Tab ─────────────────────────────────────────────────────────────

function TemplatesTab() {
  const { templates, isLoading } = useAppccTemplates()
  const updateTemplate = useUpdateTemplate()

  function toggleActive(template: CheckTemplate) {
    updateTemplate.mutate(
      { templateId: template.id, updates: { is_active: !template.is_active } },
      {
        onSuccess: () => {
          toast.success(
            template.is_active
              ? `"${template.name}" desactivada`
              : `"${template.name}" activada`
          )
        },
      }
    )
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm py-4">Cargando plantillas...</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/5 hover:bg-transparent">
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Nombre</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Tipo</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Frecuencia</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Límites</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Activa</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map((t) => {
          const TypeIcon = CHECK_TYPE_ICONS[t.check_type as CheckType]
          return (
            <TableRow key={t.id} className="border-white/5 hover:bg-white/5">
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {TypeIcon && <TypeIcon className="h-3.5 w-3.5" />}
                  {CHECK_TYPE_LABELS[t.check_type as CheckType]}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {FREQUENCY_LABELS[t.frequency as CheckFrequency]}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <LimitsCell template={t} />
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => toggleActive(t)}
                  disabled={updateTemplate.isPending}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    t.is_active ? "bg-primary" : "bg-white/10"
                  )}
                  role="switch"
                  aria-checked={t.is_active}
                >
                  <span
                    className={cn(
                      "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                      t.is_active ? "translate-x-4" : "translate-x-0"
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
  const { summaries, isLoading } = useAppccDailySummary(14)

  const maxTotal = useMemo(
    () => Math.max(...summaries.map((s: DailyCheckSummary) => s.total_checks), 1),
    [summaries]
  )

  if (isLoading) {
    return <p className="text-muted-foreground text-sm py-4">Cargando histórico...</p>
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground text-sm">Sin datos históricos todavía.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Registros últimos 14 días</p>
        <div className="flex items-end gap-1.5 h-24">
          {summaries.map((s: DailyCheckSummary) => {
            const totalPct = (s.total_checks / maxTotal) * 100
            const okPct = s.total_checks > 0 ? (s.ok_count / s.total_checks) * 100 : 0
            const alertPct = s.total_checks > 0 ? (s.alert_count / s.total_checks) * 100 : 0
            const criticalPct = s.total_checks > 0 ? (s.critical_count / s.total_checks) * 100 : 0

            return (
              <div key={s.closure_date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm overflow-hidden flex flex-col-reverse"
                  style={{ height: `${Math.max(totalPct, 8)}%` }}
                  title={`${s.closure_date}: ${s.ok_count} OK, ${s.alert_count} alertas, ${s.critical_count} críticos`}
                >
                  {criticalPct > 0 && <div className="w-full bg-[var(--alert-critical)]" style={{ height: `${criticalPct}%` }} />}
                  {alertPct > 0 && <div className="w-full bg-[var(--alert-warning)]" style={{ height: `${alertPct}%` }} />}
                  {okPct > 0 && <div className="w-full bg-[var(--alert-ok)]" style={{ height: `${okPct}%` }} />}
                </div>
                <span className="text-[10px] text-muted-foreground">{formatShortDate(s.closure_date)}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--alert-ok)]" /> OK</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--alert-warning)]" /> Alerta</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--alert-critical)]" /> Crítico</span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Fecha</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Total</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">OK</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Alertas</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Críticos</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Completado</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...summaries].reverse().map((s: DailyCheckSummary) => (
            <TableRow key={s.closure_date} className="border-white/5 hover:bg-white/5">
              <TableCell className="font-medium text-foreground">
                {new Date(s.closure_date).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })}
              </TableCell>
              <TableCell className="text-foreground">{s.total_checks}</TableCell>
              <TableCell><span className="text-[var(--alert-ok)] font-medium">{s.ok_count}</span></TableCell>
              <TableCell>
                {s.alert_count > 0
                  ? <span className="text-[var(--alert-warning)] font-medium">{s.alert_count}</span>
                  : <span className="text-muted-foreground">0</span>
                }
              </TableCell>
              <TableCell>
                {s.critical_count > 0
                  ? <span className="text-[var(--alert-critical)] font-medium">{s.critical_count}</span>
                  : <span className="text-muted-foreground">0</span>
                }
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", s.completion_pct >= 100 ? "bg-[var(--alert-ok)]" : "bg-primary")}
                      style={{ width: `${Math.min(s.completion_pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{Math.round(s.completion_pct)}%</span>
                </div>
              </TableCell>
              <TableCell>
                {s.status === "validated" ? (
                  <Badge className="bg-[var(--alert-ok)]/10 text-[var(--alert-ok)] border-0">
                    <Lock className="mr-1 h-3 w-3" /> Validado
                  </Badge>
                ) : s.status === "completed" ? (
                  <Badge className="bg-blue-900/30 text-blue-400 border-0">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Completado
                  </Badge>
                ) : (
                  <Badge className="bg-white/5 text-muted-foreground border-0">Abierto</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Incidents Tab ────────────────────────────────────────────────────────────

function IncidentsTab() {
  const { incidents, isLoading } = useAppccIncidents({ status: "open" })
  const resolveIncident = useResolveIncident()
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolveAction, setResolveAction] = useState("")

  if (isLoading) {
    return <p className="text-muted-foreground text-sm py-4">Cargando incidencias...</p>
  }

  if (incidents.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--alert-ok)]/30 mb-3" />
        <p className="text-muted-foreground text-sm">Sin incidencias abiertas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {incidents.map((inc) => (
        <div key={inc.id} className={cn(
          "rounded-lg bg-card p-4",
          inc.severity === "critical" ? "border-l-red-500" :
          inc.severity === "high" ? "border-l-primary" :
          inc.severity === "medium" ? "border-l-yellow-500" : "border-l-blue-500"
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className={cn(
                  "h-4 w-4",
                  inc.severity === "critical" ? "text-[var(--alert-critical)]" :
                  inc.severity === "high" ? "text-[var(--alert-warning)]" : "text-[var(--alert-warning)]"
                )} />
                <span className="font-medium text-foreground">{inc.title}</span>
                <Badge className="bg-white/5 text-muted-foreground border-0 text-xs">{inc.severity}</Badge>
              </div>
              {inc.description && <p className="text-sm text-muted-foreground">{inc.description}</p>}
              <p className="text-xs text-muted-foreground/60">
                {inc.incident_date} — Reportado por {inc.reported_by_name}
              </p>
            </div>
            {resolvingId !== inc.id && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-muted-foreground hover:bg-white/5 shrink-0"
                onClick={() => setResolvingId(inc.id)}
              >
                Resolver
              </Button>
            )}
          </div>

          {resolvingId === inc.id && (
            <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
              <textarea
                rows={2}
                placeholder="Acción correctiva aplicada..."
                value={resolveAction}
                onChange={(e) => setResolveAction(e.target.value)}
                className="flex min-h-[50px] w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-[var(--alert-ok)] hover:bg-[var(--alert-ok)] text-white"
                  disabled={!resolveAction.trim() || resolveIncident.isPending}
                  onClick={() => {
                    resolveIncident.mutate(
                      { incidentId: inc.id, action: resolveAction.trim() },
                      {
                        onSuccess: () => {
                          toast.success("Incidencia resuelta")
                          setResolvingId(null)
                          setResolveAction("")
                        },
                      }
                    )
                  }}
                >
                  Confirmar resolución
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => { setResolvingId(null); setResolveAction("") }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AppccPage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayStr())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [validateDialogOpen, setValidateDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("registros")

  const { records } = useAppccRecords(selectedDate)
  const { templates } = useAppccTemplates()
  const { closure } = useAppccDailyClosure(selectedDate)

  const stats = useMemo(() => {
    const ok = records.filter((r) => r.status === "ok").length
    const alerts = records.filter((r) => r.status === "alerta").length
    const critical = records.filter((r) => r.status === "critico").length
    const total = records.length
    const pct = closure?.completion_pct ?? (total > 0 ? 100 : 0)
    return { ok, alerts, critical, total, pct: Math.round(pct) }
  }, [records, closure])

  const isToday = selectedDate === todayStr()
  const isFuture = selectedDate > todayStr()
  const isValidated = closure?.status === "validated"
  const activeTemplates = templates.filter((t) => t.is_active)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            SEGURIDAD ALIMENTARIA
          </p>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-6 w-6 text-primary" />
            APPCC / Control de puntos críticos
          </h1>
          <p className="text-muted-foreground mt-1">
            Registros de seguridad alimentaria — {formatDisplayDate(selectedDate)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Export CSV */}
          {stats.total > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportRecordsCSV(records, selectedDate)}
              className="border-white/10 text-muted-foreground hover:bg-white/5"
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          )}
          {/* Validate button — only for today or past, when not yet validated */}
          {!isFuture && !isValidated && stats.total > 0 && (
            <Button
              variant="outline"
              onClick={() => setValidateDialogOpen(true)}
              className="border-[var(--alert-ok)] text-[var(--alert-ok)] hover:bg-[var(--alert-ok)]/10"
            >
              <FileCheck className="mr-2 h-4 w-4" />
              Validar día
            </Button>
          )}
          {isValidated && (
            <Badge className="bg-[var(--alert-ok)]/10 text-[var(--alert-ok)] border-0 h-9 px-3">
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Validado por {closure?.validated_by_name}
            </Badge>
          )}
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white"
            disabled={isFuture || isValidated}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo registro
          </Button>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          className="border-white/10 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Día anterior</span>
        </Button>
        <div className="min-w-[140px] text-center text-sm font-medium text-foreground">
          {isToday ? "Hoy" : formatShortDate(selectedDate)}
          {!isToday && (
            <span className="ml-1 text-xs text-muted-foreground">({selectedDate})</span>
          )}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          className="border-white/10 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          disabled={isToday}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Día siguiente</span>
        </Button>
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(todayStr())} className="text-xs text-primary hover:bg-white/5">
            Hoy
          </Button>
        )}
      </div>

      {/* KPI summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--alert-ok)]" /> Controles OK
          </p>
          <div>
            <span className={cn("text-3xl font-bold", stats.ok > 0 ? "text-[var(--alert-ok)]" : "text-foreground")}>{stats.ok}</span>
            <span className="text-muted-foreground text-sm ml-1">/ {stats.total}</span>
          </div>
        </div>

        <div className="rounded-lg bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-4 w-4 text-[var(--alert-warning)]" /> Alertas
          </p>
          <span className={cn("text-3xl font-bold", stats.alerts > 0 ? "text-[var(--alert-warning)]" : "text-muted-foreground")}>
            {stats.alerts}
          </span>
        </div>

        <div className="rounded-lg bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2">
            <XCircle className="h-4 w-4 text-[var(--alert-critical)]" /> Críticos
          </p>
          <span className={cn("text-3xl font-bold", stats.critical > 0 ? "text-[var(--alert-critical)]" : "text-muted-foreground")}>
            {stats.critical}
          </span>
        </div>

        <div className="rounded-lg bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Completado
          </p>
          <div className="space-y-2">
            <span className="text-3xl font-bold text-foreground">{isFuture ? "—" : `${stats.pct}%`}</span>
            {!isFuture && (
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", stats.pct >= 100 ? "bg-[var(--alert-ok)]" : "bg-primary")}
                  style={{ width: `${Math.min(stats.pct, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border-white/5">
          <TabsTrigger value="registros" className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground">Registros del día</TabsTrigger>
          <TabsTrigger value="incidencias" className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground">
            Incidencias
          </TabsTrigger>
          <TabsTrigger value="plantillas" className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground">Plantillas</TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="mt-4">
          <div className="rounded-lg bg-card">
            <div className="p-4 pb-3">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                Registros — {formatDisplayDate(selectedDate)}
              </p>
              <p className="text-sm text-muted-foreground">
                {isValidated && (
                  <span className="text-[var(--alert-ok)] font-medium">
                    Día validado por {closure?.validated_by_name}.{" "}
                  </span>
                )}
                {stats.critical > 0 && (
                  <span className="text-[var(--alert-critical)] font-medium">
                    {stats.critical} registro(s) con valor crítico.{" "}
                  </span>
                )}
                {!isValidated && records.length > 0 && "Haz clic en una fila para ver detalles."}
              </p>
            </div>
            <RecordsTab date={selectedDate} />
          </div>
        </TabsContent>

        <TabsContent value="incidencias" className="mt-4">
          <div className="rounded-lg bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Incidencias abiertas</p>
            <p className="text-sm text-muted-foreground mb-4">
              No conformidades que requieren acción correctiva.
            </p>
            <IncidentsTab />
          </div>
        </TabsContent>

        <TabsContent value="plantillas" className="mt-4">
          <div className="rounded-lg bg-card">
            <div className="p-4 pb-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Plantillas de control</p>
                <p className="text-sm text-muted-foreground">
                  Configura los puntos de control que se registran. Desactiva los que no apliquen.
                </p>
              </div>
              <Button size="sm" onClick={() => setTemplateDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-white shrink-0">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Nueva
              </Button>
            </div>
            <TemplatesTab />
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <div className="rounded-lg bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Histórico de controles</p>
            <p className="text-sm text-muted-foreground mb-4">
              Resumen de los últimos 14 días de registros APPCC.
            </p>
            <HistoryTab />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NewRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        templates={activeTemplates}
        selectedDate={selectedDate}
      />
      <ValidateDialog
        open={validateDialogOpen}
        onOpenChange={setValidateDialogOpen}
        date={selectedDate}
      />
      <NewTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
      />
    </div>
  )
}
