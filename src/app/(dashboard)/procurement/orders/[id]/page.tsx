"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  usePurchaseOrder,
  useOrderLines,
  useAddOrderLine,
  useSendPurchaseOrder,
  useReceiveGoods,
} from "@/features/procurement/hooks/use-procurement";
import { OrderStatusBadge } from "@/features/procurement/components/OrderStatusBadge";
import { OrderStatusProgress } from "@/features/procurement/components/order-status-progress";
import { OrderShareDialog } from "@/features/procurement/components/order-share-dialog";
import { ReceiveGoodsForm, type ReceiveLine } from "@/features/procurement/components/receive-goods-form";
import { ProductCombobox } from "@/components/product-combobox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Send, PackageCheck, Share2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/format";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: order, isLoading } = usePurchaseOrder(id);
  const { data: lines } = useOrderLines(id);
  const addLine = useAddOrderLine(id);
  const sendOrder = useSendPurchaseOrder();
  const receiveGoods = useReceiveGoods();

  const [lineDialog, setLineDialog] = useState(false);
  const [receiveDialog, setReceiveDialog] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  // Receive goods form state
  const [receiveFormLines, setReceiveFormLines] = useState<ReceiveLine[]>([]);

  if (isLoading) return <p className="text-muted-foreground">Cargando...</p>;
  if (!order) return <p className="text-destructive">Pedido no encontrado</p>;

  const orderWithSupplier = order as typeof order & { supplier_name?: string };
  const canSend = order.status === "draft" || order.status === "approved";
  const canAddLines = order.status === "draft" || order.status === "approved";
  const canReceive = order.status === "sent" || order.status === "confirmed_by_supplier" || order.status === "partially_received";

  function handleAddLine() {
    if (!selectedProduct || !qty || !price) return;
    addLine.mutate(
      { product_id: selectedProduct.id, quantity_ordered: parseFloat(qty), unit_price: parseFloat(price) },
      {
        onSuccess: () => {
          setLineDialog(false);
          setSelectedProduct(null);
          setQty("");
          setPrice("");
        },
      }
    );
  }

  function openReceiveDialog() {
    const linesWithNames = (lines ?? []) as Array<typeof lines extends (infer T)[] | undefined ? T & { product_name?: string } : never>;
    const initial: ReceiveLine[] = linesWithNames.map((line) => ({
      orderLineId: line.id,
      productName: line.product_name ?? line.product_id.slice(0, 8),
      quantityOrdered: line.quantity_ordered,
      quantityPending: line.quantity_ordered - (line.quantity_received ?? 0),
      expectedPrice: line.unit_price,
      quantityReceived: String(line.quantity_ordered - (line.quantity_received ?? 0)),
      unitCost: String(line.unit_price),
      lotNumber: "",
      expiryDate: "",
      incidentType: "ok",
      incidentNotes: "",
    }));
    setReceiveFormLines(initial);
    setReceiveDialog(true);
  }

  function handleReceiveGoods(submittedLines: ReceiveLine[]) {
    const parsed = submittedLines
      .filter((l) => l.incidentType !== "not_received" && parseFloat(l.quantityReceived) > 0)
      .map((l) => ({
        order_line_id: l.orderLineId,
        quantity_received: parseFloat(l.quantityReceived),
        unit_cost: parseFloat(l.unitCost),
        lot_number: l.lotNumber || undefined,
        expiry_date: l.expiryDate || undefined,
        incident_type: l.incidentType,
        incident_notes: l.incidentNotes || undefined,
      }));

    // Also include not_received lines with qty 0 for tracking
    const notReceived = submittedLines
      .filter((l) => l.incidentType === "not_received")
      .map((l) => ({
        order_line_id: l.orderLineId,
        quantity_received: 0,
        unit_cost: parseFloat(l.unitCost),
        incident_type: "not_received" as const,
        incident_notes: l.incidentNotes || undefined,
      }));

    const allLines = [...parsed, ...notReceived];
    if (allLines.length === 0) return;

    receiveGoods.mutate(
      { orderId: id, lines: allLines },
      { onSuccess: () => setReceiveDialog(false) }
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/procurement/orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Pedidos
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <OrderStatusBadge status={order.status} />
            {order.total_amount != null && (
              <span className="text-muted-foreground text-sm">Total: {formatCurrency(order.total_amount)}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-1 h-4 w-4" />
            Compartir
          </Button>
          {canReceive && (
            <Button variant="outline" onClick={openReceiveDialog}>
              <PackageCheck className="mr-1 h-4 w-4" />
              Recibir mercancia
            </Button>
          )}
          {canSend && (
            <Button onClick={() => sendOrder.mutate(id)} disabled={sendOrder.isPending}>
              <Send className="mr-1 h-4 w-4" />
              {sendOrder.isPending ? "Enviando..." : "Enviar pedido"}
            </Button>
          )}
        </div>
      </div>

      {/* Status progress stepper */}
      <div className="rounded-lg bg-card p-5 flex items-center justify-center">
        <OrderStatusProgress status={order.status} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Detalles</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proveedor</span>
              <span className="font-medium">
                {orderWithSupplier.supplier_name ?? order.supplier_id.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entrega esperada</span>
              <span>{formatDate(order.expected_delivery_date)}</span>
            </div>
            {order.sent_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Enviado</span>
                <span>{formatDate(order.sent_at)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span>{formatDate(order.created_at)}</span>
            </div>
          </CardContent>
        </Card>
        {order.notes && (
          <Card>
            <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lineas ({lines?.length ?? 0})</CardTitle>
              <CardDescription>Productos incluidos en el pedido</CardDescription>
            </div>
            {canAddLines && (
              <Dialog open={lineDialog} onOpenChange={setLineDialog}>
                <DialogTrigger render={<Button size="sm" />}>
                  <Plus className="mr-1 h-4 w-4" />
                  Anadir linea
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Anadir linea de pedido</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Producto</Label>
                      <ProductCombobox
                        value={selectedProduct?.id ?? null}
                        onSelect={(p) => setSelectedProduct(p ? { id: p.id, name: p.name } : null)}
                        placeholder="Buscar producto..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cantidad</Label>
                        <Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio unitario</Label>
                        <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                      </div>
                    </div>
                    <Button onClick={handleAddLine} disabled={addLine.isPending || !selectedProduct} className="w-full">
                      {addLine.isPending ? "Anadiendo..." : "Anadir"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {lines && lines.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Pedido</TableHead>
                  <TableHead className="text-right">Precio ud.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Recibido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(lines as Array<typeof lines[number] & { product_name?: string }>).map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">
                      {line.product_name ?? line.product_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{line.quantity_ordered}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(line.unit_price)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(line.quantity_ordered * line.unit_price)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.quantity_received ?? 0}
                      {line.quantity_received > 0 && line.quantity_received >= line.quantity_ordered && (
                        <span className="ml-1 text-emerald-500">✓</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">Sin lineas. Anade productos al pedido.</p>
          )}
        </CardContent>
      </Card>

      {/* Receive Goods Sheet */}
      <Sheet open={receiveDialog} onOpenChange={setReceiveDialog}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Recibir mercancia</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ReceiveGoodsForm
              lines={receiveFormLines}
              onSubmit={handleReceiveGoods}
              isPending={receiveGoods.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Share dialog */}
      <OrderShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        order={{
          orderNumber: order.order_number,
          date: new Date(order.created_at).toLocaleDateString("es"),
          expectedDelivery: order.expected_delivery_date ?? undefined,
          notes: order.notes ?? undefined,
        }}
        supplier={{
          name: orderWithSupplier.supplier_name ?? "Proveedor",
        }}
        restaurant={{
          name: "Culuca Cociña-Bar",
        }}
        lines={(lines ?? []).map((line: { product_name?: string; product_id: string; quantity_ordered: number; unit_price: number }) => ({
          productName: line.product_name ?? line.product_id.slice(0, 8),
          quantity: line.quantity_ordered,
          unit: "ud",
          unitPrice: line.unit_price,
        }))}
        onShared={() => {
          if (canSend) sendOrder.mutate(id);
        }}
      />
    </div>
  );
}
