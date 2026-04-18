"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  ChefHat,
  Package,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DemoBanner } from "@/components/demo-banner"

// ── Demo pilot restaurants ──────────────────────────────────────────────────
// RO-APPSEC-PII-001: this page is a client component, so anything here is
// shipped in the public JS bundle. DO NOT put real owner names, phone
// numbers, emails, or internal notes in this file — use fictional
// placeholders (555-xxx phones, generic names). Real pilot data must be
// fetched from the server with RBAC gating, never hardcoded.
interface PilotRestaurant {
  id: string
  name: string
  owner: string
  phone: string
  status: "onboarding" | "active" | "churned"
  startDate: string
  completionPct: number
  steps: {
    restaurant: boolean
    menu: boolean | "pending_review"
    suppliers: boolean | "pending_review"
    appcc: boolean
    firstOrder: boolean
  }
  notes: string
}

const MOCK_PILOTS: PilotRestaurant[] = [
  {
    id: "p1",
    name: "Restaurante Demo 1",
    owner: "Propietario Ejemplo",
    phone: "+34 900 000 001",
    status: "active",
    startDate: "2026-04-01",
    completionPct: 85,
    steps: { restaurant: true, menu: true, suppliers: true, appcc: true, firstOrder: false },
    notes: "Datos ficticios de demostración.",
  },
  {
    id: "p2",
    name: "Restaurante Demo 2",
    owner: "Propietario Ejemplo",
    phone: "+34 900 000 002",
    status: "onboarding",
    startDate: "2026-04-05",
    completionPct: 40,
    steps: { restaurant: true, menu: "pending_review", suppliers: false, appcc: false, firstOrder: false },
    notes: "Datos ficticios de demostración.",
  },
  {
    id: "p3",
    name: "Restaurante Demo 3",
    owner: "Propietario Ejemplo",
    phone: "+34 900 000 003",
    status: "onboarding",
    startDate: "2026-04-08",
    completionPct: 20,
    steps: { restaurant: true, menu: false, suppliers: false, appcc: false, firstOrder: false },
    notes: "Datos ficticios de demostración.",
  },
  {
    id: "p4",
    name: "Restaurante Demo 4",
    owner: "Propietario Ejemplo",
    phone: "+34 900 000 004",
    status: "active",
    startDate: "2026-04-03",
    completionPct: 95,
    steps: { restaurant: true, menu: true, suppliers: true, appcc: true, firstOrder: true },
    notes: "Datos ficticios de demostración.",
  },
  {
    id: "p5",
    name: "Restaurante Demo 5",
    owner: "Propietario Ejemplo",
    phone: "+34 900 000 005",
    status: "onboarding",
    startDate: "2026-04-10",
    completionPct: 55,
    steps: { restaurant: true, menu: true, suppliers: "pending_review", appcc: false, firstOrder: false },
    notes: "Datos ficticios de demostración.",
  },
]

function StepIcon({ done }: { done: boolean | "pending_review" }) {
  if (done === "pending_review") return <AlertTriangle className="h-4 w-4 text-[var(--alert-warning)]" />
  if (done) return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  return <Clock className="h-4 w-4 text-muted-foreground" />
}

const STATUS_CONFIG = {
  onboarding: { label: "En setup", color: "bg-[var(--alert-warning)]/15 text-[var(--alert-warning)] border-0" },
  active: { label: "Activo", color: "bg-emerald-500/15 text-emerald-400 border-0" },
  churned: { label: "Abandonado", color: "bg-[var(--alert-critical)]/15 text-[var(--alert-critical)] border-0" },
}

export default function SetupStatusPage() {
  const [selectedPilot, setSelectedPilot] = useState<PilotRestaurant | null>(null)

  const activeCount = MOCK_PILOTS.filter(p => p.status === "active").length
  const onboardingCount = MOCK_PILOTS.filter(p => p.status === "onboarding").length
  const pendingReview = MOCK_PILOTS.filter(p =>
    Object.values(p.steps).includes("pending_review")
  ).length
  const avgCompletion = Math.round(MOCK_PILOTS.reduce((s, p) => s + p.completionPct, 0) / MOCK_PILOTS.length)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          PANEL FOUNDER
        </p>
        <h1 className="text-3xl font-bold text-foreground">Estado de pilotos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Seguimiento de restaurantes en piloto gratuito
        </p>
      </div>

      <DemoBanner module="Setup" />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Activos</p>
          <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
        </div>
        <div className="rounded-lg bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">En setup</p>
          <p className="text-2xl font-bold text-[var(--alert-warning)]">{onboardingCount}</p>
        </div>
        <div className="rounded-lg bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendiente revisar</p>
          <p className="text-2xl font-bold text-primary">{pendingReview}</p>
        </div>
        <div className="rounded-lg bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">% Setup medio</p>
          <p className="text-2xl font-bold text-blue-400">{avgCompletion}%</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border-subtle hover:bg-transparent">
              <TableHead className="text-muted-foreground">Restaurante</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-muted-foreground text-center">
                <span title="Datos restaurante"><ChefHat className="h-3.5 w-3.5 inline" /></span>
              </TableHead>
              <TableHead className="text-muted-foreground text-center">
                <span title="Carta importada"><FileText className="h-3.5 w-3.5 inline" /></span>
              </TableHead>
              <TableHead className="text-muted-foreground text-center">
                <span title="Proveedores"><Package className="h-3.5 w-3.5 inline" /></span>
              </TableHead>
              <TableHead className="text-muted-foreground text-center">
                <span title="APPCC"><ShieldCheck className="h-3.5 w-3.5 inline" /></span>
              </TableHead>
              <TableHead className="text-muted-foreground text-center">
                <span title="Primer pedido"><Users className="h-3.5 w-3.5 inline" /></span>
              </TableHead>
              <TableHead className="text-muted-foreground">Setup</TableHead>
              <TableHead className="text-muted-foreground"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_PILOTS.map(pilot => {
              const statusCfg = STATUS_CONFIG[pilot.status]
              return (
                <TableRow
                  key={pilot.id}
                  className="border-border-subtle hover:bg-card-hover cursor-pointer"
                  onClick={() => setSelectedPilot(pilot)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{pilot.name}</p>
                      <p className="text-xs text-muted-foreground">{pilot.owner}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                  </TableCell>
                  <TableCell className="text-center"><StepIcon done={pilot.steps.restaurant} /></TableCell>
                  <TableCell className="text-center"><StepIcon done={pilot.steps.menu} /></TableCell>
                  <TableCell className="text-center"><StepIcon done={pilot.steps.suppliers} /></TableCell>
                  <TableCell className="text-center"><StepIcon done={pilot.steps.appcc} /></TableCell>
                  <TableCell className="text-center"><StepIcon done={pilot.steps.firstOrder} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-accent rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            pilot.completionPct >= 80 ? "bg-emerald-500" :
                            pilot.completionPct >= 50 ? "bg-[var(--alert-warning)]" : "bg-primary"
                          )}
                          style={{ width: `${pilot.completionPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{pilot.completionPct}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedPilot} onOpenChange={() => setSelectedPilot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedPilot?.name}</DialogTitle>
          </DialogHeader>
          {selectedPilot && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Propietario</p>
                  <p className="text-foreground">{selectedPilot.owner}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Teléfono</p>
                  <p className="text-foreground">{selectedPilot.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inicio piloto</p>
                  <p className="text-foreground">{selectedPilot.startDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Setup</p>
                  <p className="text-foreground">{selectedPilot.completionPct}%</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase">Pasos de onboarding</p>
                {([
                  ["restaurant", "Datos restaurante"],
                  ["menu", "Carta importada"],
                  ["suppliers", "Proveedores / albaranes"],
                  ["appcc", "APPCC configurado"],
                  ["firstOrder", "Primer pedido enviado"],
                ] as const).map(([key, label]) => {
                  const val = selectedPilot.steps[key]
                  return (
                    <div key={key} className="flex items-center justify-between py-1 border-b border-border-subtle last:border-0">
                      <span className="text-sm text-foreground">{label}</span>
                      <div className="flex items-center gap-2">
                        <StepIcon done={val} />
                        {val === "pending_review" && (
                          <Badge className="bg-[var(--alert-warning)]/15 text-[var(--alert-warning)] border-0 text-xs">Revisar</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedPilot.notes && (
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Notas</p>
                  <p className="text-sm text-foreground">{selectedPilot.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
