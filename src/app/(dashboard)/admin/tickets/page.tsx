"use client";

import Image from "next/image";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { TableSkeleton } from "@/components/page-skeleton";
import {
  useFeedbackTickets,
  useUpdateTicket,
  useDeleteTicket,
  useOpenTicketCount,
} from "@/features/feedback/hooks/use-feedback";
import {
  TYPE_CONFIG,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  TICKET_STATUS,
  TICKET_TYPE,
  type FeedbackTicket,
  type TicketType,
  type TicketStatus,
  type TicketPriority,
} from "@/features/feedback/schemas/feedback.schema";

export default function AdminTicketsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");

  const filters: Record<string, string> = {};
  if (statusFilter !== "all") filters.status = statusFilter;
  if (typeFilter !== "all") filters.type = typeFilter;

  const { data: tickets, isLoading } = useFeedbackTickets(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const { data: openCount } = useOpenTicketCount();
  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();

  function openDetail(ticket: FeedbackTicket) {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditNotes(ticket.admin_notes ?? "");
  }

  async function handleSave() {
    if (!selectedTicket) return;
    await updateTicket.mutateAsync({
      ticketId: selectedTicket.id,
      input: { status: editStatus as TicketStatus, admin_notes: editNotes },
    });
    setSelectedTicket(null);
  }

  async function handleDelete() {
    if (!selectedTicket) return;
    await deleteTicket.mutateAsync(selectedTicket.id);
    setSelectedTicket(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Tickets de feedback</h1>
        {openCount != null && openCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {openCount}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value={TICKET_STATUS.OPEN}>Abierto</SelectItem>
            <SelectItem value={TICKET_STATUS.IN_PROGRESS}>En progreso</SelectItem>
            <SelectItem value={TICKET_STATUS.RESOLVED}>Resuelto</SelectItem>
            <SelectItem value={TICKET_STATUS.NEEDS_INFO}>Necesita info</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value={TICKET_TYPE.BUG}>Bug</SelectItem>
            <SelectItem value={TICKET_TYPE.DESIGN}>Diseño</SelectItem>
            <SelectItem value={TICKET_TYPE.FEATURE}>Funcionalidad</SelectItem>
            <SelectItem value={TICKET_TYPE.OTHER}>Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton cols={6} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets && tickets.length > 0 ? (
                tickets.map((ticket) => {
                  const typeConf = TYPE_CONFIG[ticket.type as TicketType];
                  const statusConf = STATUS_CONFIG[ticket.status as TicketStatus];
                  const priorityConf = PRIORITY_CONFIG[ticket.priority as TicketPriority];

                  return (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(ticket)}
                    >
                      <TableCell>
                        {typeConf && (
                          <span className={typeConf.color}>
                            {typeConf.emoji} {typeConf.label}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {ticket.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ticket.created_by_name ?? ticket.created_by_email ?? "—"}
                      </TableCell>
                      <TableCell>
                        {priorityConf && (
                          <span className={`text-sm font-medium ${priorityConf.color}`}>
                            {priorityConf.label}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {statusConf && (
                          <Badge
                            variant="secondary"
                            className={`${statusConf.bgColor} ${statusConf.color}`}
                          >
                            {statusConf.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(parseISO(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay tickets con estos filtros
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail panel (Dialog used as side panel) */}
      <Dialog
        open={selectedTicket !== null}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
      >
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">{selectedTicket.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Type + Priority */}
                <div className="flex items-center gap-3">
                  {TYPE_CONFIG[selectedTicket.type as TicketType] && (
                    <Badge
                      variant="outline"
                      className={TYPE_CONFIG[selectedTicket.type as TicketType].color}
                    >
                      {TYPE_CONFIG[selectedTicket.type as TicketType].emoji}{" "}
                      {TYPE_CONFIG[selectedTicket.type as TicketType].label}
                    </Badge>
                  )}
                  {PRIORITY_CONFIG[selectedTicket.priority as TicketPriority] && (
                    <span
                      className={cn(
                        "text-sm font-medium",
                        PRIORITY_CONFIG[selectedTicket.priority as TicketPriority].color
                      )}
                    >
                      Prioridad: {PRIORITY_CONFIG[selectedTicket.priority as TicketPriority].label}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <p className="text-sm mt-1">{selectedTicket.description}</p>
                </div>

                {/* User + Date */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {selectedTicket.created_by_name ?? selectedTicket.created_by_email ?? "—"}
                  </span>
                  <span>
                    {format(parseISO(selectedTicket.created_at), "dd/MM/yyyy HH:mm", {
                      locale: es,
                    })}
                  </span>
                </div>

                {/* Screenshot */}
                {selectedTicket.screenshot_url && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Captura de pantalla</Label>
                    <a
                      href={selectedTicket.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-1"
                    >
                      <Image
                        src={selectedTicket.screenshot_url}
                        alt="Screenshot del ticket"
                        width={800}
                        height={480}
                        unoptimized
                        className="rounded-md border max-h-60 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    </a>
                  </div>
                )}

                {/* Status select */}
                <div className="space-y-1">
                  <Label htmlFor="ticket-status">Estado</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v ?? "")}>
                    <SelectTrigger id="ticket-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TICKET_STATUS.OPEN}>Abierto</SelectItem>
                      <SelectItem value={TICKET_STATUS.IN_PROGRESS}>En progreso</SelectItem>
                      <SelectItem value={TICKET_STATUS.RESOLVED}>Resuelto</SelectItem>
                      <SelectItem value={TICKET_STATUS.NEEDS_INFO}>Necesita info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Admin notes */}
                <div className="space-y-1">
                  <Label htmlFor="admin-notes">Notas del administrador</Label>
                  <textarea
                    id="admin-notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Escribe una respuesta o nota interna..."
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar ticket
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar este ticket?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. El ticket será eliminado permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button onClick={handleSave} disabled={updateTicket.isPending}>
                  {updateTicket.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
