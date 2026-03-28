"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";
import { useMyTickets } from "@/features/feedback/hooks/use-feedback";
import {
  TYPE_CONFIG,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  type TicketType,
  type TicketStatus,
  type TicketPriority,
} from "@/features/feedback/schemas/feedback.schema";

export default function MyTicketsPage() {
  const { data: tickets, isLoading } = useMyTickets();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mis tickets de feedback</h1>
        <TableSkeleton rows={4} cols={3} />
      </div>
    );
  }

  const sorted = [...(tickets ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis tickets de feedback</h1>
        <p className="text-muted-foreground mt-1">
          {sorted.length} {sorted.length === 1 ? "ticket" : "tickets"}
        </p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No has enviado ningún ticket"
          description="Cuando envíes un ticket de feedback aparecerá aquí."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((ticket) => {
            const typeConf = TYPE_CONFIG[ticket.type as TicketType];
            const statusConf = STATUS_CONFIG[ticket.status as TicketStatus];
            const priorityConf = PRIORITY_CONFIG[ticket.priority as TicketPriority];

            return (
              <Card key={ticket.id}>
                <CardContent className="p-4 space-y-2">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {typeConf && (
                        <Badge variant="outline" className={typeConf.color}>
                          {typeConf.emoji} {typeConf.label}
                        </Badge>
                      )}
                      <span className="font-semibold">{ticket.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {priorityConf && (
                        <span className={`text-xs font-medium ${priorityConf.color}`}>
                          {priorityConf.label}
                        </span>
                      )}
                      {statusConf && (
                        <Badge
                          variant="secondary"
                          className={`${statusConf.bgColor} ${statusConf.color}`}
                        >
                          {statusConf.label}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground">{ticket.description}</p>

                  {/* Date */}
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>

                  {/* Admin response */}
                  {ticket.admin_notes && (
                    <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary mb-1">
                        Respuesta del equipo:
                      </p>
                      <p className="text-sm">{ticket.admin_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
