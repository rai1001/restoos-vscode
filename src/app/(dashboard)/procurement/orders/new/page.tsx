"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCreateOrderWithLines } from "@/features/procurement/hooks/use-procurement";
import {
  SupplierProductSelector,
  type CartItem,
} from "@/features/procurement/components/supplier-product-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

export default function NewOrderPage() {
  const router = useRouter();
  const createOrder = useCreateOrderWithLines();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");

  const cartCount = Array.from(cart.values()).reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = Array.from(cart.values()).reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );

  const handleCartChange = useCallback((next: Map<string, CartItem>) => {
    setCart(next);
  }, []);

  async function handleSubmit() {
    if (!selectedSupplierId || cart.size === 0) return;

    const lines = Array.from(cart.values()).map((item) => ({
      product_id: item.productId,
      quantity_ordered: item.quantity,
      unit_price: item.unitPrice,
    }));

    const result = await createOrder.mutateAsync({
      supplierId: selectedSupplierId,
      expectedDelivery: expectedDelivery || undefined,
      notes: notes || undefined,
      lines,
    });

    if (result?.order_id) {
      router.push(`/procurement/orders/${result.order_id}`);
    } else {
      router.push("/procurement/orders");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/procurement/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Pedidos
            </Button>
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Nuevo Pedido
            </p>
            <h1 className="text-2xl font-bold">Selecciona productos</h1>
          </div>
        </div>

        {/* Delivery date + notes */}
        <div className="hidden items-center gap-4 md:flex">
          <div className="flex items-center gap-2">
            <Label htmlFor="delivery" className="text-xs text-muted-foreground whitespace-nowrap">
              Entrega
            </Label>
            <Input
              id="delivery"
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              className="h-8 w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="notes" className="text-xs text-muted-foreground whitespace-nowrap">
              Notas
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
              className="h-8 w-48"
            />
          </div>
        </div>
      </div>

      {/* Mobile: delivery + notes */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-center gap-2">
          <Label htmlFor="delivery-m" className="text-xs text-muted-foreground w-16">
            Entrega
          </Label>
          <Input
            id="delivery-m"
            type="date"
            value={expectedDelivery}
            onChange={(e) => setExpectedDelivery(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="notes-m" className="text-xs text-muted-foreground w-16">
            Notas
          </Label>
          <Input
            id="notes-m"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional"
            className="h-8"
          />
        </div>
      </div>

      {/* Supplier + Product selector */}
      <SupplierProductSelector
        cart={cart}
        onCartChange={handleCartChange}
        selectedSupplierId={selectedSupplierId}
        onSupplierChange={setSelectedSupplierId}
      />

      {/* Bottom action bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between border-t bg-card px-6 py-4 lg:static lg:inset-auto lg:z-auto lg:rounded-lg lg:border">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {cartCount} {cartCount === 1 ? "producto" : "productos"}
            </span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {cartSubtotal.toFixed(2)} € + IVA
            </span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={createOrder.isPending || cart.size === 0}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {createOrder.isPending ? "Creando..." : "Crear pedido"}
          </Button>
        </div>
      )}
    </div>
  );
}
