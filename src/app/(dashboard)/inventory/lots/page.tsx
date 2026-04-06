"use client";

import { useSyncExternalStore } from "react";
import { useStockLots } from "@/features/inventory/hooks/use-inventory";
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
import { ArrowLeft, Package } from "lucide-react";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";

export default function LotsPage() {
  const { data: lots, isLoading } = useStockLots();
  const expiringThreshold = useSyncExternalStore(
    () => () => {},
    () => Date.now() + 3 * 86400000,
    () => Date.now() + 3 * 86400000,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Inventario
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Lotes de stock</h1>
          <p className="text-muted-foreground mt-1">{lots?.length ?? 0} lotes</p>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton cols={6} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Cantidad inicial</TableHead>
                <TableHead>Cantidad actual</TableHead>
                <TableHead>Coste ud.</TableHead>
                <TableHead>Caducidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots?.map((lot) => {
                const isLow = lot.current_quantity <= 0;
                const isExpiring = lot.expiry_date
                  ? new Date(lot.expiry_date) <= new Date(expiringThreshold)
                  : false;
                return (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono text-xs">{lot.product_id.slice(0, 8)}...</TableCell>
                    <TableCell>{lot.lot_number ?? "—"}</TableCell>
                    <TableCell>{lot.initial_quantity}</TableCell>
                    <TableCell>
                      <span className={isLow ? "text-[var(--alert-critical)] font-medium" : ""}>
                        {lot.current_quantity}
                      </span>
                    </TableCell>
                    <TableCell>{lot.unit_cost.toFixed(2)} €</TableCell>
                    <TableCell>
                      {lot.expiry_date ? (
                        <span className="flex items-center gap-1">
                          {lot.expiry_date}
                          {isExpiring && <Badge variant="destructive" className="text-xs">Próximo</Badge>}
                        </span>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {lots?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState icon={Package} title="Sin lotes" description="Los lotes se crean al recibir mercancía de un pedido" actionLabel="Ir a compras" actionHref="/procurement/orders" />
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
