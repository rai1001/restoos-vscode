"use client";

import { useState, useCallback, useMemo } from "react";
import { useSuppliers, useSupplierOffers } from "@/features/catalog/hooks/use-suppliers";
import type { SupplierOfferWithProduct } from "@/features/catalog/hooks/use-suppliers";
import type { Supplier } from "@/features/catalog/schemas/catalog.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Search,
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Package,
} from "lucide-react";

// ── Cart item ───────────────────────────────────────────────────────────────
export interface CartItem {
  offerId: string;
  productId: string;
  productName: string;
  unitAbbreviation: string;
  unitPrice: number;
  quantity: number;
}

// ── Props ───────────────────────────────────────────────────────────────────
interface SupplierProductSelectorProps {
  cart: Map<string, CartItem>;
  onCartChange: (cart: Map<string, CartItem>) => void;
  selectedSupplierId: string | null;
  onSupplierChange: (supplierId: string) => void;
}

// ── Component ───────────────────────────────────────────────────────────────
export function SupplierProductSelector({
  cart,
  onCartChange,
  selectedSupplierId,
  onSupplierChange,
}: SupplierProductSelectorProps) {
  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers();
  const { data: offers = [], isLoading: loadingOffers } = useSupplierOffers(
    selectedSupplierId ?? undefined
  );
  const [searchQuery, setSearchQuery] = useState("");

  const activeSuppliers = useMemo(
    () => suppliers.filter((s: Supplier) => s.is_active),
    [suppliers]
  );

  const filteredOffers = useMemo(() => {
    if (!searchQuery.trim()) return offers;
    const q = searchQuery.toLowerCase();
    return offers.filter((o: SupplierOfferWithProduct) =>
      o.product_name.toLowerCase().includes(q)
    );
  }, [offers, searchQuery]);

  const selectedSupplier = useMemo(
    () => activeSuppliers.find((s: Supplier) => s.id === selectedSupplierId) ?? null,
    [activeSuppliers, selectedSupplierId]
  );

  const cartSubtotal = useMemo(() => {
    let total = 0;
    cart.forEach((item) => {
      total += item.unitPrice * item.quantity;
    });
    return total;
  }, [cart]);

  const cartCount = useMemo(() => {
    let count = 0;
    cart.forEach((item) => {
      count += item.quantity;
    });
    return count;
  }, [cart]);

  const updateCart = useCallback(
    (offerId: string, delta: number, offer?: SupplierOfferWithProduct) => {
      const next = new Map(cart);
      const existing = next.get(offerId);

      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          next.delete(offerId);
        } else {
          next.set(offerId, { ...existing, quantity: newQty });
        }
      } else if (offer && delta > 0) {
        next.set(offerId, {
          offerId: offer.id,
          productId: offer.product_id,
          productName: offer.product_name,
          unitAbbreviation: offer.unit_abbreviation,
          unitPrice: offer.price,
          quantity: delta,
        });
      }

      onCartChange(next);
    },
    [cart, onCartChange]
  );

  const setQuantity = useCallback(
    (offerId: string, qty: number, offer?: SupplierOfferWithProduct) => {
      const next = new Map(cart);
      if (qty <= 0) {
        next.delete(offerId);
      } else {
        const existing = next.get(offerId);
        if (existing) {
          next.set(offerId, { ...existing, quantity: qty });
        } else if (offer) {
          next.set(offerId, {
            offerId: offer.id,
            productId: offer.product_id,
            productName: offer.product_name,
            unitAbbreviation: offer.unit_abbreviation,
            unitPrice: offer.price,
            quantity: qty,
          });
        }
      }
      onCartChange(next);
    },
    [cart, onCartChange]
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ── Supplier list ──────────────────────────────────────────────── */}
      <div className="w-full shrink-0 lg:w-64">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Proveedor
        </p>
        {loadingSuppliers ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-card" />
            ))}
          </div>
        ) : (
          <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {activeSuppliers.map((supplier: Supplier) => (
              <button
                key={supplier.id}
                onClick={() => {
                  onSupplierChange(supplier.id);
                  setSearchQuery("");
                }}
                className={cn(
                  "flex w-full min-w-[180px] flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors lg:min-w-0",
                  selectedSupplierId === supplier.id
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-card hover:bg-card-hover"
                )}
              >
                <span className="text-sm font-semibold text-foreground">
                  {supplier.name}
                </span>
                {supplier.contact_name && (
                  <span className="text-xs text-muted-foreground">
                    {supplier.contact_name}
                  </span>
                )}
                {supplier.phone && (
                  <span className="text-xs text-muted-foreground">
                    {supplier.phone}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Product list ───────────────────────────────────────────────── */}
      <div className="flex-1">
        {!selectedSupplierId ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg bg-card">
            <Package className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Selecciona un proveedor para ver sus productos
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Productos de {selectedSupplier?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {offers.length} productos disponibles
                </p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar producto..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Products */}
            {loadingOffers ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-card" />
                ))}
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg bg-card">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Sin resultados" : "Este proveedor no tiene productos"}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredOffers.map((offer: SupplierOfferWithProduct) => {
                  const inCart = cart.get(offer.id);
                  return (
                    <div
                      key={offer.id}
                      className={cn(
                        "flex items-center gap-4 rounded-lg px-4 py-3 transition-colors",
                        inCart ? "bg-primary/5" : "bg-card hover:bg-card-hover"
                      )}
                    >
                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {offer.product_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {offer.price.toFixed(2)} € / {offer.unit_abbreviation}
                          {offer.is_preferred && (
                            <span className="ml-2 text-primary">Preferido</span>
                          )}
                        </p>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        {inCart ? (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCart(offer.id, -1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <Input
                              type="number"
                              min={0}
                              value={inCart.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setQuantity(offer.id, isNaN(val) ? 0 : val, offer);
                              }}
                              className="h-8 w-16 text-center tabular-nums"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCart(offer.id, 1, offer)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                const next = new Map(cart);
                                next.delete(offer.id);
                                onCartChange(next);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => updateCart(offer.id, 1, offer)}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Añadir
                          </Button>
                        )}
                      </div>

                      {/* Line total */}
                      {inCart && (
                        <div className="w-20 text-right">
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {(inCart.quantity * inCart.unitPrice).toFixed(2)} €
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Cart summary (sticky bottom on mobile, sidebar on lg) ─────── */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card p-4 lg:static lg:inset-auto lg:z-auto lg:w-72 lg:shrink-0 lg:rounded-lg lg:border lg:p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Resumen
            </p>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 lg:max-h-60">
            {Array.from(cart.values()).map((item) => (
              <div key={item.offerId} className="flex items-center justify-between text-xs">
                <span className="truncate text-foreground">{item.productName}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {item.quantity} {item.unitAbbreviation} · {(item.quantity * item.unitPrice).toFixed(2)} €
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t pt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{cartSubtotal.toFixed(2)} €</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>IVA (21%)</span>
              <span className="tabular-nums">{(cartSubtotal * 0.21).toFixed(2)} €</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-sm font-bold tabular-nums text-primary">
                {(cartSubtotal * 1.21).toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
