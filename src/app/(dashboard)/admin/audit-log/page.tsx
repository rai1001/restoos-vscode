"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/db/client"
import { useActiveHotel } from "@/lib/auth/hooks"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileEdit, Plus, Trash2, CheckCircle2, Send, Eye, Loader2 } from "lucide-react"
import { EmptyState } from "@/components/empty-state"

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

const supabase = createClient()

function useAuditLogs() {
  const { hotelId } = useActiveHotel()
  return useQuery({
    queryKey: ["audit-logs", hotelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("hotel_id", hotelId!)
        .order("performed_at", { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        timestamp: new Date(row.performed_at as string).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }),
        action: (row.action as string) ?? "view",
        entity: (row.entity_type as string) ?? "",
        entityName: "",
        changes: row.after_json ? JSON.stringify(row.after_json).slice(0, 80) : undefined,
        user: (row.performed_by as string)?.slice(0, 8) ?? "Sistema",
        role: "",
      })) as AuditEntry[]
    },
    enabled: !!hotelId,
    staleTime: 30_000,
  })
}

export default function AuditLogPage() {
  const { data: auditData, isLoading } = useAuditLogs()
  const entries = auditData ?? []
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
          {entries.length} acciones últimas 48h
        </Badge>
        <Badge className="bg-emerald-500/15 text-emerald-400 border-0">
          {entries.filter(a => a.action === "create").length} creaciones
        </Badge>
        <Badge className="bg-blue-500/15 text-blue-400 border-0">
          {entries.filter(a => a.action === "update").length} ediciones
        </Badge>
        <Badge className="bg-[var(--alert-warning)]/15 text-[var(--alert-warning)] border-0">
          {entries.filter(a => a.action === "approve").length} aprobaciones
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
            {entries.map(entry => {
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
