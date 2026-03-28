import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  review_pending: { label: "En revisión", variant: "outline" },
  approved: { label: "Aprobada", variant: "default" },
  deprecated: { label: "Deprecada", variant: "destructive" },
  archived: { label: "Archivada", variant: "secondary" },
};

export function RecipeStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
