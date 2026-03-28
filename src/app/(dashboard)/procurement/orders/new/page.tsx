"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreatePurchaseOrder } from "@/features/procurement/hooks/use-procurement";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewOrderPage() {
  const router = useRouter();
  const createOrder = useCreatePurchaseOrder();
  const [supplierId, setSupplierId] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) return;
    const result = await createOrder.mutateAsync({
      supplierId,
      expectedDelivery: expectedDelivery || undefined,
      notes: notes || undefined,
    });
    if (result?.order_id) {
      router.push(`/procurement/orders/${result.order_id}`);
    } else {
      router.push("/procurement/orders");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/procurement/orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Nuevo pedido</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del pedido</CardTitle>
          <CardDescription>Crea el pedido y luego añade líneas de productos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">ID Proveedor</Label>
              <Input
                id="supplier_id"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                placeholder="UUID del proveedor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_delivery">Fecha entrega esperada</Label>
              <Input
                id="expected_delivery"
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={createOrder.isPending || !supplierId}>
                {createOrder.isPending ? "Creando..." : "Crear pedido"}
              </Button>
              <Link href="/procurement/orders">
                <Button variant="outline">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
