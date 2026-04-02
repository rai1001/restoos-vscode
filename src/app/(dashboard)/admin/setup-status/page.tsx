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

// ── Mock pilot restaurants ──────────────────────────────────────────────────
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
    name: "Culuca Cociña-Bar",
    owner: "Chisco Jiménez",
    phone: "+34 600 123 456",
    status: "active",
    startDate: "2026-04-01",
    completionPct: 85,
    steps: { restaurant: true, menu: true, suppliers: true, appcc: true, firstOrder: false },
    notes: "Contacto directo. 3 restaurantes en el grupo. Potencial upsell AutoChef.",
  },
  {
    id: "p2",
    name: "O Filandón",
    owner: "Marcos Rodríguez",
    phone: "+34 600 234 567",
    status: "onboarding",
    startDate: "2026-04-05",
    completionPct: 40,
    steps: { restaurant: true, menu: "pending_review", suppliers: false, appcc: false, firstOrder: false },
    notes: "Carta subida por foto, pendiente validar platos. Cocina gallega tradicional.",
  },
  {
    id: "p3",
    name: "La Penela",
    owner: "Sandra Costa",
    phone: "+34 600 345 678",
    status: "onboarding",
    startDate: "2026-04-08",
    completionPct: 20,
    steps: { restaurant: true, menu: false, suppliers: false, appcc: false, firstOrder: false },
    notes: "Solo completó datos básicos. Llamar para seguimiento.",
  },
  {
    id: "p4",
    name: "Taberna do Ensanche",
    owner: "Pablo Vázquez",
    phone: "+34 600 456 789",
    status: "active",
    startDate: "2026-04-03",
    completionPct: 95,
    steps: { restaurant: true, menu: true, suppliers: true, appcc: true, firstOrder: true },
    notes: "Primer restaurante con pedido real enviado. Todo OK.",
  },
  {
    id: "p5",
    name: "Mesón do Porto",
    owner: "Ana Rivas",
    phone: "+34 600 567 890",
    status: "onboarding",
    startDate: "2026-04-10",
    completionPct: 55,
    steps: { restaurant: true, menu: true, suppliers: "pending_review", appcc: false, firstOrder: false },
    notes: "Albaranes subidos, pendiente revisar productos y precios duplicados.",
  },
]

function StepIcon({ done }: { done: boolean | "pending_review" }) {
  if (done === "pending_review") return <AlertTriangle className="h-4 w-4 text-yellow-400" />
  if (done) return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  return <Clock className="h-4 w-4 text-muted-foreground" />
}

const STATUS_CONFIG = {
  onboarding: { label: "En setup", color: "bg-yellow-500/15 text-yellow-400 border-0" },
  active: { label: "Activo", color: "bg-emerald-500/15 text-emerald-400 border-0" },
  churned: { label: "Abandonado", color: "bg-red-500/15 text-red-400 border-0" },
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

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg bg-card border-l-4 border-l-emerald-500 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Activos</p>
          <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
        </div>
        <div className="rounded-lg bg-card border-l-4 border-l-yellow-500 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">En setup</p>
          <p className="text-2xl font-bold text-yellow-400">{onboardingCount}</p>
        </div>
        <div className="rounded-lg bg-card border-l-4 border-l-primary p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendiente revisar</p>
          <p className="text-2xl font-bold text-primary">{pendingReview}</p>
        </div>
        <div className="rounded-lg bg-card border-l-4 border-l-blue-500 p-4">
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
                            pilot.completionPct >= 50 ? "bg-yellow-500" : "bg-primary"
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
                          <Badge className="bg-yellow-500/15 text-yellow-400 border-0 text-xs">Revisar</Badge>
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
