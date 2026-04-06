"use client"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileEdit, Plus, Trash2, CheckCircle2, Send, Eye } from "lucide-react"

interface AuditEntry {
  id: string
  timestamp: string
  user: string
  role: string
  action: "create" | "update" | "delete" | "approve" | "send" | "view"
  entity: string
  entityName: string
  changes?: string
}

const ACTION_CONFIG: Record<AuditEntry["action"], { label: string; icon: typeof FileEdit; color: string }> = {
  create: { label: "Creado", icon: Plus, color: "text-emerald-400" },
  update: { label: "Editado", icon: FileEdit, color: "text-blue-400" },
  delete: { label: "Eliminado", icon: Trash2, color: "text-[var(--alert-critical)]" },
  approve: { label: "Aprobado", icon: CheckCircle2, color: "text-[var(--alert-warning)]" },
  send: { label: "Enviado", icon: Send, color: "text-purple-400" },
  view: { label: "Visto", icon: Eye, color: "text-muted-foreground" },
}

// Deterministic mock data
const MOCK_AUDIT: AuditEntry[] = [
  { id: "a1", timestamp: "2026-03-31 14:32", user: "Chisco Jiménez", role: "head_chef", action: "update", entity: "Receta", entityName: "Callos de Culuca", changes: "Cantidad tocino: 200g → 180g" },
  { id: "a2", timestamp: "2026-03-31 14:15", user: "Chisco Jiménez", role: "head_chef", action: "approve", entity: "Receta", entityName: "Croquetas de cocido", changes: "Estado: review_pending → approved" },
  { id: "a3", timestamp: "2026-03-31 13:50", user: "María López", role: "cook", action: "create", entity: "Merma", entityName: "Tomate fresco — 1.5kg", changes: "Motivo: caducado" },
  { id: "a4", timestamp: "2026-03-31 12:20", user: "Chisco Jiménez", role: "head_chef", action: "send", entity: "Pedido", entityName: "PO-2026-042 → Pescadería O Porto", changes: "3 productos, total 185€" },
  { id: "a5", timestamp: "2026-03-31 11:45", user: "Pablo García", role: "procurement", action: "create", entity: "Pedido", entityName: "PO-2026-042", changes: "Borrador: salmón, pulpo, calamar" },
  { id: "a6", timestamp: "2026-03-31 11:30", user: "Chisco Jiménez", role: "head_chef", action: "approve", entity: "Pedido", entityName: "PO-2026-041 → Carnicería Rial", changes: "Estado: pending_approval → approved" },
  { id: "a7", timestamp: "2026-03-31 10:00", user: "María López", role: "cook", action: "create", entity: "APPCC", entityName: "Registro diario 31-mar", changes: "8/8 controles OK" },
  { id: "a8", timestamp: "2026-03-31 09:30", user: "Pablo García", role: "procurement", action: "create", entity: "Entrada", entityName: "Albarán Frutas García", changes: "5 productos, 87€" },
  { id: "a9", timestamp: "2026-03-30 18:15", user: "Chisco Jiménez", role: "head_chef", action: "update", entity: "Receta", entityName: "Tortilla jugosa", changes: "Precio venta: 8.50€ → 9.00€" },
  { id: "a10", timestamp: "2026-03-30 16:40", user: "Chisco Jiménez", role: "head_chef", action: "update", entity: "Producto", entityName: "Aceite oliva virgen extra", changes: "Proveedor preferido: Distribuciones Gallaecia" },
  { id: "a11", timestamp: "2026-03-30 14:20", user: "María López", role: "cook", action: "create", entity: "Producción", entityName: "Croquetas de cocido × 50 raciones" },
  { id: "a12", timestamp: "2026-03-30 10:00", user: "María López", role: "cook", action: "create", entity: "APPCC", entityName: "Registro diario 30-mar", changes: "7/8 controles OK, 1 alerta" },
]

export default function AuditLogPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          ADMINISTRACIÓN
        </p>
        <h1 className="text-3xl font-bold text-foreground">Registro de cambios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Quién hizo qué, cuándo y qué cambió — trazabilidad completa
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-sm">
        <Badge className="bg-card text-muted-foreground border border-border-subtle">
          {MOCK_AUDIT.length} acciones últimas 48h
        </Badge>
        <Badge className="bg-emerald-500/15 text-emerald-400 border-0">
          {MOCK_AUDIT.filter(a => a.action === "create").length} creaciones
        </Badge>
        <Badge className="bg-blue-500/15 text-blue-400 border-0">
          {MOCK_AUDIT.filter(a => a.action === "update").length} ediciones
        </Badge>
        <Badge className="bg-[var(--alert-warning)]/15 text-[var(--alert-warning)] border-0">
          {MOCK_AUDIT.filter(a => a.action === "approve").length} aprobaciones
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border-subtle hover:bg-transparent">
              <TableHead className="text-muted-foreground">Fecha/hora</TableHead>
              <TableHead className="text-muted-foreground">Usuario</TableHead>
              <TableHead className="text-muted-foreground">Acción</TableHead>
              <TableHead className="text-muted-foreground">Entidad</TableHead>
              <TableHead className="text-muted-foreground">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_AUDIT.map(entry => {
              const config = ACTION_CONFIG[entry.action]
              const Icon = config.icon
              return (
                <TableRow key={entry.id} className="border-border-subtle">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{entry.timestamp}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-foreground">{entry.user}</p>
                      <p className="text-xs text-muted-foreground">{entry.role}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-1.5 ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{config.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-foreground">{entry.entityName}</p>
                      <p className="text-xs text-muted-foreground">{entry.entity}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                    {entry.changes ?? "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
