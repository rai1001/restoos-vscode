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
import { ArrowLeft, Plus, Send, PackageCheck } from "lucide-react";
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
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  // Receive goods form state
  const [receiveLines, setReceiveLines] = useState<Array<{
    order_line_id: string;
    product_id: string;
    quantity_received: string;
    unit_cost: string;
    lot_number: string;
    expiry_date: string;
  }>>([]);

  if (isLoading) return <p className="text-muted-foreground">Cargando...</p>;
  if (!order) return <p className="text-destructive">Pedido no encontrado</p>;

  const canSend = order.status === "draft" || order.status === "approved";
  const canAddLines = order.status === "draft" || order.status === "approved";
  const canReceive = order.status === "sent" || order.status === "confirmed_by_supplier" || order.status === "partially_received";

  function handleAddLine() {
    if (!productId || !qty || !price) return;
    addLine.mutate(
      { product_id: productId, quantity_ordered: parseFloat(qty), unit_price: parseFloat(price) },
      {
        onSuccess: () => {
          setLineDialog(false);
          setProductId("");
          setQty("");
          setPrice("");
        },
      }
    );
  }

  function openReceiveDialog() {
    const initial = (lines ?? []).map((line) => ({
      order_line_id: line.id,
      product_id: line.product_id,
      quantity_received: String(line.quantity_ordered - (line.quantity_received ?? 0)),
      unit_cost: String(line.unit_price),
      lot_number: "",
      expiry_date: "",
    }));
    setReceiveLines(initial);
    setReceiveDialog(true);
  }

  function handleReceiveGoods() {
    const parsed = receiveLines
      .filter((l) => parseFloat(l.quantity_received) > 0)
      .map((l) => ({
        order_line_id: l.order_line_id,
        quantity_received: parseFloat(l.quantity_received),
        unit_cost: parseFloat(l.unit_cost),
        lot_number: l.lot_number || undefined,
        expiry_date: l.expiry_date || undefined,
      }));
    if (parsed.length === 0) return;
    receiveGoods.mutate(
      { orderId: id, lines: parsed },
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

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Detalles</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proveedor</span>
              <span className="font-mono text-xs">{order.supplier_id.slice(0, 8)}...</span>
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
                      <Label>ID Producto</Label>
                      <Input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="UUID" />
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
                    <Button onClick={handleAddLine} disabled={addLine.isPending} className="w-full">
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
                  <TableHead>Pedido</TableHead>
                  <TableHead>Precio ud.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Recibido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono text-xs">{line.product_id.slice(0, 8)}...</TableCell>
                    <TableCell>{line.quantity_ordered}</TableCell>
                    <TableCell>{formatCurrency(line.unit_price)}</TableCell>
                    <TableCell>{formatCurrency(line.quantity_ordered * line.unit_price)}</TableCell>
                    <TableCell>
                      {line.quantity_received ?? 0}
                      {line.quantity_received > 0 && line.quantity_received >= line.quantity_ordered && (
                        <span className="ml-1 text-green-600">✓</span>
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

      {/* Receive Goods Dialog */}
      <Dialog open={receiveDialog} onOpenChange={setReceiveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recibir mercancia</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {receiveLines.map((rl, i) => (
              <div key={rl.order_line_id} className="grid grid-cols-5 gap-2 rounded border p-3">
                <div className="col-span-5">
                  <Label className="text-xs text-muted-foreground">Producto: {rl.product_id.slice(0, 8)}...</Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cantidad</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={rl.quantity_received}
                    onChange={(e) => {
                      const updated = [...receiveLines];
                      updated[i] = { ...rl, quantity_received: e.target.value };
                      setReceiveLines(updated);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Coste ud.</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rl.unit_cost}
                    onChange={(e) => {
                      const updated = [...receiveLines];
                      updated[i] = { ...rl, unit_cost: e.target.value };
                      setReceiveLines(updated);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lote</Label>
                  <Input
                    value={rl.lot_number}
                    placeholder="Opt."
                    onChange={(e) => {
                      const updated = [...receiveLines];
                      updated[i] = { ...rl, lot_number: e.target.value };
                      setReceiveLines(updated);
                    }}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Caducidad</Label>
                  <Input
                    type="date"
                    value={rl.expiry_date}
                    onChange={(e) => {
                      const updated = [...receiveLines];
                      updated[i] = { ...rl, expiry_date: e.target.value };
                      setReceiveLines(updated);
                    }}
                  />
                </div>
              </div>
            ))}
            <Button
              onClick={handleReceiveGoods}
              disabled={receiveGoods.isPending}
              className="w-full"
            >
              <PackageCheck className="mr-2 h-4 w-4" />
              {receiveGoods.isPending ? "Procesando..." : "Confirmar recepcion"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
