"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Printer,
  Eye,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  usePrepBatches,
  getExpiryLevel,
} from "@/features/labeling/hooks/use-prep-batches";
import {
  STATIONS,
  BATCH_STATUS,
  type PrepBatch,
  type PrepAlert,
  type BatchStatus,
} from "@/features/labeling/schemas/labeling.schema";

// ── Alert card ────────────────────────────────────────────────────────────────

const ALERT_CONFIG: Record<
  string,
  { emoji: string; border: string; bg: string; label: (a: PrepAlert) => string }
> = {
  expired: {
    emoji: "\uD83D\uDD34",
    border: "border-l-red-500",
    bg: "bg-red-950/20",
    label: (a) =>
      `CADUCADO: ${a.prep_batches?.prep_name} — vencio el ${
        a.prep_batches ? format(parseISO(a.prep_batches.expiry_date), "dd/MM/yyyy", { locale: es }) : ""
      }`,
  },
  expiry_24h: {
    emoji: "\uD83D\uDFE0",
    border: "border-l-primary",
    bg: "bg-[var(--alert-warning)]/20",
    label: (a) =>
      `Caduca HOY: ${a.prep_batches?.prep_name} — ${
        a.prep_batches ? format(parseISO(a.prep_batches.expiry_date), "HH:mm") : ""
      }`,
  },
  expiry_48h: {
    emoji: "\uD83D\uDFE1",
    border: "border-l-yellow-500",
    bg: "bg-yellow-950/20",
    label: (a) => `Caduca manana: ${a.prep_batches?.prep_name}`,
  },
  expiry_72h: {
    emoji: "\uD83D\uDD35",
    border: "border-l-blue-500",
    bg: "bg-blue-950/20",
    label: (a) => `Caduca en 3 dias: ${a.prep_batches?.prep_name}`,
  },
};

function AlertCard({
  alert,
  onDismiss,
}: {
  alert: PrepAlert;
  onDismiss: (id: string) => void;
}) {
  const cfg = ALERT_CONFIG[alert.alert_type];
  if (!cfg) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md px-3 py-2.5",
        cfg.border,
        cfg.bg
      )}
    >
      <span className="text-sm text-foreground">
        {cfg.emoji} {cfg.label(alert)}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5"
        onClick={() => onDismiss(alert.id)}
      >
        Descartar
      </Button>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  active: {
    label: "Activo",
    cls: "bg-green-900/30 text-green-400",
  },
  consumed: {
    label: "Consumido",
    cls: "bg-white/5 text-muted-foreground",
  },
  expired: {
    label: "Caducado",
    cls: "bg-red-900/30 text-red-400",
  },
  discarded: {
    label: "Desechado",
    cls: "bg-white/5 text-muted-foreground",
  },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { label: status, cls: "bg-white/5 text-muted-foreground" };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider", s.cls)}>
      {s.label}
    </span>
  );
}

// ── Consume dialog ────────────────────────────────────────────────────────────

function ConsumeDialog({
  batch,
  open,
  onOpenChange,
  onConfirm,
}: {
  batch: PrepBatch;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (qty: number) => void;
}) {
  const [qty, setQty] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">Consumir: {batch.prep_name}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Disponible: {batch.quantity} {batch.unit}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Cuanto consumes? ({batch.unit})
          </label>
          <Input
            type="number"
            min={0.01}
            max={batch.quantity}
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={`Max ${batch.quantity}`}
            className="bg-background border-white/10 text-foreground"
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="border-white/10 text-muted-foreground hover:bg-white/5" />}>
            Cancelar
          </DialogClose>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => {
              const val = parseFloat(qty);
              if (val > 0 && val <= batch.quantity) {
                onConfirm(val);
                onOpenChange(false);
              }
            }}
          >
            Confirmar consumo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail dialog ─────────────────────────────────────────────────────────────

function DetailDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: PrepBatch;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">{batch.prep_name}</DialogTitle>
          <DialogDescription className="text-muted-foreground">Lote: {batch.batch_code}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="text-muted-foreground">Cantidad</div>
          <div className="text-foreground">
            {batch.quantity} {batch.unit}
          </div>
          <div className="text-muted-foreground">Consumido</div>
          <div className="text-foreground">
            {batch.consumed_qty} {batch.unit}
          </div>
          <div className="text-muted-foreground">Elaboracion</div>
          <div className="text-foreground">{format(parseISO(batch.elaboration_date), "dd/MM/yyyy HH:mm")}</div>
          <div className="text-muted-foreground">Caducidad</div>
          <div className="text-foreground">{format(parseISO(batch.expiry_date), "dd/MM/yyyy HH:mm")}</div>
          <div className="text-muted-foreground">Vida util</div>
          <div className="text-foreground">{batch.shelf_life_days} dias</div>
          <div className="text-muted-foreground">Ubicacion</div>
          <div className="text-foreground">{batch.location ?? "—"}</div>
          <div className="text-muted-foreground">Partida</div>
          <div className="text-foreground">{batch.station ?? "—"}</div>
          <div className="text-muted-foreground">Chef</div>
          <div className="text-foreground">{batch.chef_name ?? "—"}</div>
          <div className="text-muted-foreground">Estado</div>
          <div>
            <StatusBadge status={batch.status} />
          </div>
          <div className="text-muted-foreground">Alergenos</div>
          <div className="text-foreground">{batch.allergens.length > 0 ? batch.allergens.join(", ") : "Ninguno"}</div>
          {batch.notes && (
            <>
              <div className="text-muted-foreground">Notas</div>
              <div className="text-foreground">{batch.notes}</div>
            </>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="border-white/10 text-muted-foreground hover:bg-white/5" />}>
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrepInventoryPage() {
  const {
    batches,
    alerts,
    alertCount,
    updateBatchStatus,
    dismissAlert,
    filters,
    setFilters,
  } = usePrepBatches();

  // Local filter UI state synced to hook
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "all">(
    (filters.status as BatchStatus | "all") ?? "all"
  );
  const [stationFilter, setStationFilter] = useState(filters.station ?? "");
  const [search, setSearch] = useState(filters.search ?? "");

  useEffect(() => {
    setFilters({
      status: statusFilter,
      station: stationFilter || undefined,
      search: search || undefined,
    });
  }, [statusFilter, stationFilter, search, setFilters]);

  // Alert panel
  const [alertsOpen, setAlertsOpen] = useState(true);

  // Dialogs
  const [consumeBatch, setConsumeBatch] = useState<PrepBatch | null>(null);
  const [detailBatch, setDetailBatch] = useState<PrepBatch | null>(null);
  const [discardBatch, setDiscardBatch] = useState<PrepBatch | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              CONTROL DE PREPARACIONES
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              Control de Preparaciones
            </h1>
          </div>
          {alertCount > 0 && (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
              {alertCount}
            </span>
          )}
        </div>
        <Link href="/labeling">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
            <Plus className="h-4 w-4" />
            Nueva etiqueta
          </Button>
        </Link>
      </div>

      {/* Alert panel */}
      {alerts.length > 0 && (
        <div className="rounded-lg bg-card">
          <button
            onClick={() => setAlertsOpen(!alertsOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
                Alertas de caducidad ({alerts.length})
              </span>
            </div>
            {alertsOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {alertsOpen && (
            <div className="flex flex-col gap-2 border-t border-white/5 px-4 py-3">
              {alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onDismiss={dismissAlert}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as BatchStatus | "all")}
        >
          <SelectTrigger className="w-36 bg-card border-white/10 text-foreground">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="consumed">Consumido</SelectItem>
            <SelectItem value="expired">Caducado</SelectItem>
            <SelectItem value="discarded">Desechado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={stationFilter}
          onValueChange={(v) => setStationFilter(v === "__all__" || !v ? "" : v)}
        >
          <SelectTrigger className="w-40 bg-card border-white/10 text-foreground">
            <SelectValue placeholder="Partida" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="__all__">Todas las partidas</SelectItem>
            {STATIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o lote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-white/10 text-foreground placeholder:text-muted-foreground/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Lote</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Preparacion</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground text-right">Cantidad</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Elaboracion</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Caduca</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Partida</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Ubicacion</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Estado</TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-widest text-muted-foreground text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow className="border-white/5">
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No hay preparaciones que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => {
                const level = getExpiryLevel(batch.expiry_date);
                const rowTint =
                  batch.status === "expired" || level === "expired"
                    ? "bg-red-900/20"
                    : level === "expiry_24h" || level === "expiry_48h"
                    ? "bg-yellow-900/20"
                    : batch.status === "active"
                    ? "bg-green-900/20"
                    : "";
                return (
                  <TableRow key={batch.id} className={cn("border-white/5 hover:bg-white/5", rowTint)}>
                    <TableCell className="font-mono text-xs text-foreground">
                      {batch.batch_code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {batch.prep_name}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {batch.quantity} {batch.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(batch.elaboration_date), "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(batch.expiry_date), "dd/MM/yy HH:mm")}
                    </TableCell>
                    <TableCell className="text-foreground">{batch.station ?? "—"}</TableCell>
                    <TableCell className="text-foreground">{batch.location ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={batch.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {batch.status === BATCH_STATUS.ACTIVE && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Consumir"
                              className="text-muted-foreground hover:text-foreground hover:bg-white/5"
                              onClick={() => setConsumeBatch(batch)}
                            >
                              <UtensilsCrossed className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Desechar"
                              className="hover:bg-white/5"
                              onClick={() => setDiscardBatch(batch)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reimprimir"
                          className="text-muted-foreground hover:text-foreground hover:bg-white/5"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Ver detalles"
                          className="text-muted-foreground hover:text-foreground hover:bg-white/5"
                          onClick={() => setDetailBatch(batch)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Consume dialog */}
      {consumeBatch && (
        <ConsumeDialog
          batch={consumeBatch}
          open={!!consumeBatch}
          onOpenChange={(v) => {
            if (!v) setConsumeBatch(null);
          }}
          onConfirm={(qty) => {
            const newConsumed = consumeBatch.consumed_qty + qty;
            const remaining = consumeBatch.quantity - qty;
            updateBatchStatus(
              consumeBatch.id,
              remaining <= 0 ? "consumed" : "active",
              newConsumed
            );
            setConsumeBatch(null);
          }}
        />
      )}

      {/* Detail dialog */}
      {detailBatch && (
        <DetailDialog
          batch={detailBatch}
          open={!!detailBatch}
          onOpenChange={(v) => {
            if (!v) setDetailBatch(null);
          }}
        />
      )}

      {/* Discard confirmation dialog */}
      {discardBatch && (
        <AlertDialog open={!!discardBatch} onOpenChange={(v) => { if (!v) setDiscardBatch(null); }}>
          <AlertDialogContent className="bg-card border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">
                Desechar {discardBatch.prep_name}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Se marcara el lote {discardBatch.batch_code} como
                desechado. Esta accion no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDiscardBatch(null)} className="border-white/10 text-muted-foreground hover:bg-white/5">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  updateBatchStatus(discardBatch.id, "discarded");
                  setDiscardBatch(null);
                }}
              >
                Desechar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
