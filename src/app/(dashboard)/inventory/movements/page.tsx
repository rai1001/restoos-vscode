"use client";

import { useStockMovements } from "@/features/inventory/hooks/use-inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ArrowRightLeft, SlidersHorizontal } from "lucide-react";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import { RoleGate } from "@/components/role-gate";

const MOVEMENT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  reception: { label: "Recepción", variant: "default" },
  reservation: { label: "Reserva", variant: "outline" },
  release: { label: "Liberación", variant: "secondary" },
  consumption: { label: "Consumo", variant: "secondary" },
  waste: { label: "Merma", variant: "destructive" },
  adjustment: { label: "Ajuste", variant: "outline" },
  transfer: { label: "Transferencia", variant: "outline" },
};

export default function MovementsPage() {
  const { data: movements, isLoading } = useStockMovements();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/inventory">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Inventario
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Movimientos de stock</h1>
            <p className="text-muted-foreground mt-1">{movements?.length ?? 0} movimientos</p>
          </div>
        </div>
        <RoleGate permission="inventory:adjust">
          <Button variant="outline">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Ajuste manual
          </Button>
        </RoleGate>
      </div>

      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Coste ud.</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements?.map((mov) => {
                const config = MOVEMENT_LABELS[mov.movement_type] ?? { label: mov.movement_type, variant: "outline" as const };
                return (
                  <TableRow key={mov.id}>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{mov.product_id.slice(0, 8)}...</TableCell>
                    <TableCell>{mov.quantity}</TableCell>
                    <TableCell>{mov.unit_cost != null ? `${mov.unit_cost.toFixed(2)} €` : "—"}</TableCell>
                    <TableCell className="text-xs">
                      {mov.reference_type ? `${mov.reference_type}` : "—"}
                    </TableCell>
                    <TableCell>{new Date(mov.created_at).toLocaleDateString("es")}</TableCell>
                  </TableRow>
                );
              })}
              {movements?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState icon={ArrowRightLeft} title="Sin movimientos" description="Los movimientos se registran al recibir mercancía, reservar o consumir stock" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
