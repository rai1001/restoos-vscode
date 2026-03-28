"use client";

import {
  usePurchaseRequests,
  useCreatePurchaseRequest,
  useApprovePurchaseRequest,
} from "@/features/procurement/hooks/use-procurement";
import { RequestStatusBadge } from "@/features/procurement/components/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, CheckCircle, ClipboardList } from "lucide-react";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";

export default function PurchaseRequestsPage() {
  const { data: requests, isLoading } = usePurchaseRequests();
  const createRequest = useCreatePurchaseRequest();
  const approveRequest = useApprovePurchaseRequest();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes de compra</h1>
          <p className="text-muted-foreground mt-1">{requests?.length ?? 0} solicitudes</p>
        </div>
        <Button onClick={() => createRequest.mutate({})} disabled={createRequest.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          {createRequest.isPending ? "Creando..." : "Nueva solicitud"}
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.request_number}</TableCell>
                  <TableCell>
                    <RequestStatusBadge status={req.status} />
                  </TableCell>
                  <TableCell>{new Date(req.created_at).toLocaleDateString("es")}</TableCell>
                  <TableCell>
                    {req.status === "pending_approval" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveRequest.mutate(req.id)}
                        disabled={approveRequest.isPending}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Aprobar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <EmptyState icon={ClipboardList} title="Sin solicitudes de compra" description="Las solicitudes se generan desde operaciones o manualmente" />
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
