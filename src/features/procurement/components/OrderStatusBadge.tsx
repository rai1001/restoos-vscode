import { Badge } from "@/components/ui/badge";

const PO_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  pending_approval: { label: "Pendiente", variant: "outline" },
  approved: { label: "Aprobado", variant: "default" },
  sent: { label: "Enviado", variant: "default" },
  confirmed_by_supplier: { label: "Confirmado", variant: "default" },
  partially_received: { label: "Parcial", variant: "outline" },
  received: { label: "Recibido", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const config = PO_STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

const PR_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  pending_approval: { label: "Pendiente", variant: "outline" },
  approved: { label: "Aprobada", variant: "default" },
  consolidated: { label: "Consolidada", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

export function RequestStatusBadge({ status }: { status: string }) {
  const config = PR_STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
