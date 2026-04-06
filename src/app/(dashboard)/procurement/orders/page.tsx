"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePurchaseOrders } from "@/features/procurement/hooks/use-procurement";
import { useSuppliers } from "@/features/catalog/hooks/use-suppliers";
import { POStatusActions } from "@/features/procurement/components/po-status-actions";
import { OrderStatusProgress } from "@/features/procurement/components/order-status-progress";
import { OrderHistory } from "@/features/procurement/components/order-history";
import { OCRAlbaranDialog } from "@/features/procurement/components/ocr-albaran-dialog";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ShoppingCart,
  Camera,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  PackagePlus,
  Truck,
  Receipt,
} from "lucide-react";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";
import { RoleGate } from "@/components/role-gate";
import type { PurchaseOrder } from "@/features/procurement/schemas/procurement.schema";
import { isPOStatus, type POStatus } from "@/features/procurement/po-fsm";
import { toast } from "sonner";

import { generatePurchaseSuggestions } from "@/lib/calculations/procurementEngine";
import { calculateDemand } from "@/lib/calculations/demandEngine";
import type { PurchaseSuggestion } from "@/lib/calculations/types";
import {
  MOCK_PRODUCTS,
  MOCK_STOCK_LOTS,
  MOCK_SUPPLIER_OFFERS,
  MOCK_VOLUME_DISCOUNTS,
  MOCK_RECIPES,
  MOCK_RECIPE_INGREDIENTS,
} from "@/lib/mock-data";
import type {
  EventWithMenu,
  RecipeMap,
  ProductMap,
  StockSnapshot,
  CatalogMap,
  CatalogEntry,
} from "@/lib/calculations/types";
import type { Supplier } from "@/features/catalog/schemas/catalog.schema";

// ── Mock services (to be replaced with real data) ───────────────────────────
const MOCK_SERVICES_PROCUREMENT = [
  { id: "svc-1", name: "Comida Lun", date: "2026-03-30", guests: 45, status: "confirmado" },
  { id: "svc-2", name: "Cena Lun", date: "2026-03-30", guests: 60, status: "confirmado" },
  { id: "svc-3", name: "Comida Mar", date: "2026-03-31", guests: 50, status: "confirmado" },
  { id: "svc-4", name: "Cena Mar", date: "2026-03-31", guests: 55, status: "confirmado" },
  { id: "svc-5", name: "Comida Mie", date: "2026-04-01", guests: 48, status: "confirmado" },
  { id: "svc-6", name: "Cena Mie", date: "2026-04-01", guests: 65, status: "confirmado" },
];

// ── Engine helpers (kept for AI suggestions) ────────────────────────────────

function buildRecipeMap(): RecipeMap {
  const map: RecipeMap = {};
  for (const recipe of MOCK_RECIPES) {
    const ingredients =
      (MOCK_RECIPE_INGREDIENTS as Record<string, typeof MOCK_RECIPE_INGREDIENTS[keyof typeof MOCK_RECIPE_INGREDIENTS]>)[recipe.id] ?? [];
    map[recipe.id] = {
      id: recipe.id,
      name: recipe.name,
      servings: recipe.servings,
      category: recipe.category ?? null,
      ingredients: ingredients.map((ing) => ({
        id: ing.id,
        product_id: ing.product_id,
        product_name: ing.product_name,
        sub_recipe_id: ing.sub_recipe_id,
        quantity: ing.quantity,
        unit: ing.unit,
        unit_id: ing.unit_id,
        waste_percent: ing.waste_percent,
        catalog_entry_id: ing.catalog_entry_id ?? null,
        notes: ing.notes ?? null,
      })),
    };
  }
  return map;
}

function buildProductMap(): ProductMap {
  const map: ProductMap = {};
  for (const p of MOCK_PRODUCTS) {
    map[p.id] = {
      id: p.id,
      name: p.name,
      yield_percent: p.yield_percent,
      allergens: (p.allergens ?? []) as ProductMap[string]["allergens"],
    };
  }
  return map;
}

function buildStockMap(): Map<string, StockSnapshot> {
  const map = new Map<string, StockSnapshot>();
  for (const lot of MOCK_STOCK_LOTS) {
    const existing = map.get(lot.product_id);
    const product = MOCK_PRODUCTS.find((p) => p.id === lot.product_id);
    const unitId = lot.unit_id ?? "";
    if (existing) {
      existing.qty_available += lot.current_quantity;
    } else {
      map.set(lot.product_id, {
        product_id: lot.product_id,
        product_name: product?.name ?? "Desconocido",
        unit: {
          id: unitId,
          name: unitId.endsWith("0001") ? "Kilogramo" : "Litro",
          abbreviation: unitId.endsWith("0001") ? "kg" : "L",
        },
        qty_available: lot.current_quantity,
        qty_committed: 0,
        safety_stock: 2,
      });
    }
  }
  return map;
}

function buildCatalogMap(): CatalogMap {
  const catalog: CatalogMap = {};
  for (const offer of MOCK_SUPPLIER_OFFERS) {
    const entry: CatalogEntry = {
      id: offer.id,
      supplier_id: offer.supplier_id,
      supplier_name: offer.supplier_name,
      product_id: offer.product_id,
      unit_price: offer.price,
      min_order_qty: 1,
      pack_size: 1,
      is_preferred: offer.is_preferred,
      volume_discounts:
        MOCK_VOLUME_DISCOUNTS[offer.id as keyof typeof MOCK_VOLUME_DISCOUNTS] ?? [],
    };
    if (!catalog[offer.product_id]) catalog[offer.product_id] = [];
    catalog[offer.product_id]!.push(entry);
  }
  return catalog;
}

function getUpcomingConfirmedServices(days: number): EventWithMenu[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);
  const recipeMap = buildRecipeMap();

  return MOCK_SERVICES_PROCUREMENT
    .filter((svc) => {
      if (svc.status !== "confirmado") return false;
      const svcDate = new Date(svc.date + "T00:00:00");
      return svcDate >= today && svcDate <= cutoff;
    })
    .map((svc) => {
      const recipeIds = Object.keys(recipeMap).filter(
        (id) => (recipeMap[id]?.ingredients.length ?? 0) > 0,
      );
      return {
        event_id: svc.id,
        name: svc.name,
        date: svc.date,
        pax: svc.guests,
        menu: { items: recipeIds.map((id) => ({ recipe_id: id, servings_per_pax: 1 })) },
      };
    });
}

const URGENCY_STYLES: Record<PurchaseSuggestion["urgency"], { label: string; className: string }> = {
  critical: { label: "CRITICO", className: "bg-[var(--alert-critical)]/15 text-[var(--alert-critical)] border-0" },
  urgent: { label: "URGENTE", className: "bg-primary/15 text-primary border-0" },
  normal: { label: "NORMAL", className: "bg-[rgba(255,255,255,0.03)] text-muted-foreground border-0" },
};

// ── Component ───────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const { data: orders, isLoading } = usePurchaseOrders();
  const { data: suppliers = [] } = useSuppliers();
  const [localOrders, setLocalOrders] = useState<PurchaseOrder[]>([]);
  const [ocrOpen, setOcrOpen] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<"activos" | "historico">("activos");

  // AI Suggestions (collapsed by default)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PurchaseSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(false);

  useEffect(() => {
    if (orders) setLocalOrders(orders);
  }, [orders]);

  // Build supplier name map for the orders table
  const supplierMap = new Map<string, string>();
  (suppliers as Supplier[]).forEach((s) => supplierMap.set(s.id, s.name));

  function handleStatusChange(orderId: string, newStatus: POStatus) {
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
    );
  }

  const handleGenerateSuggestions = useCallback(() => {
    setSuggestionsLoading(true);
    setSuggestionsGenerated(false);
    setTimeout(() => {
      try {
        const events = getUpcomingConfirmedServices(14);
        const recipeMap = buildRecipeMap();
        const productMap = buildProductMap();
        const demandLines = calculateDemand(events, [], recipeMap, productMap);
        const stockMap = buildStockMap();
        const catalogMap = buildCatalogMap();
        const result = generatePurchaseSuggestions(demandLines, stockMap, catalogMap);
        setSuggestions(result);
        setSuggestionsGenerated(true);
        if (result.length === 0) {
          toast.info("No se necesitan compras adicionales para los proximos 14 dias");
        } else {
          toast.success(`${result.length} sugerencias generadas`);
        }
      } catch {
        toast.error("Error al generar sugerencias de compra");
      } finally {
        setSuggestionsLoading(false);
      }
    }, 400);
  }, []);

  const handleCreateOrders = useCallback(() => {
    const bySupplier = new Map<string, PurchaseSuggestion[]>();
    for (const s of suggestions) {
      const key = s.suggested_supplier_id || "sin-proveedor";
      if (!bySupplier.has(key)) bySupplier.set(key, []);
      bySupplier.get(key)!.push(s);
    }
    const totalCost = suggestions.reduce((sum, s) => sum + s.estimated_cost, 0);
    toast.success(`${bySupplier.size} pedido(s) creados por ${totalCost.toFixed(2)} €`);
  }, [suggestions]);

  // KPI calculations
  const activeOrders = localOrders.filter(
    (o) => !["received", "cancelled", "recibida", "cancelada"].includes(o.status)
  ).length;
  const pendingDeliveries = localOrders.filter(
    (o) => ["sent", "confirmed_by_supplier", "enviada"].includes(o.status)
  ).length;
  const totalSpend = localOrders
    .filter((o) => o.total_amount != null)
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  const totalEstimatedCost = suggestions.reduce((sum, s) => sum + s.estimated_cost, 0);

  const activeOrdersList = useMemo(
    () => localOrders.filter((o) => !["received", "cancelled", "recibida", "cancelada"].includes(o.status)),
    [localOrders]
  );

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            Operaciones de Suministro
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Pedidos de Compra
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setOcrOpen(true)}
          >
            <Camera className="h-4 w-4 mr-2" />
            OCR Albaran
          </Button>
          <RoleGate permission="po:create">
            <Link href="/procurement/orders/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Pedido
              </Button>
            </Link>
          </RoleGate>
        </div>
      </div>

      <OCRAlbaranDialog
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        onApply={(result) => {
          toast.success(`Albaran de ${result.supplier_name ?? "proveedor"} importado`);
        }}
      />

      {/* ── KPIs ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Pedidos activos
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{activeOrders}</p>
        </div>
        <div className="rounded-lg bg-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Entregas pendientes
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{pendingDeliveries}</p>
        </div>
        <div className="rounded-lg bg-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Gasto total
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {totalSpend.toFixed(2)} €
          </p>
        </div>
      </div>

      {/* ── AI Suggestions (collapsed by default) ───────────────── */}
      <div className="rounded-lg bg-card">
        <button
          className="flex w-full items-center justify-between p-5 select-none"
          onClick={() => setSuggestionsOpen((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Sugerencias IA
            </span>
            {suggestionsGenerated && suggestions.length > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                {suggestions.length}
              </span>
            )}
          </div>
          {suggestionsOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {suggestionsOpen && (
          <div className="px-5 pb-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSuggestions}
                disabled={suggestionsLoading}
              >
                {suggestionsLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generar sugerencias
              </Button>

              {suggestionsGenerated && suggestions.length > 0 && (
                <>
                  <Button size="sm" onClick={handleCreateOrders}>
                    <PackagePlus className="mr-2 h-4 w-4" />
                    Crear pedidos ({new Set(suggestions.map((s) => s.suggested_supplier_id)).size})
                  </Button>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Estimado: <span className="font-semibold text-foreground">{totalEstimatedCost.toFixed(2)} €</span>
                  </span>
                </>
              )}
            </div>

            {suggestionsLoading && (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-sm">Calculando demanda...</span>
              </div>
            )}

            {suggestionsGenerated && suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No se requieren compras adicionales.
              </p>
            )}

            {suggestionsGenerated && suggestions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Producto", "Necesario", "En stock", "A pedir", "Proveedor", "Coste", "Urgencia"].map((h, i) => (
                        <th
                          key={h}
                          className={`py-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground ${
                            [1, 2, 3, 5].includes(i) ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((s) => {
                      const style = URGENCY_STYLES[s.urgency];
                      return (
                        <tr key={s.product_id} className="border-b border-card-hover hover:bg-card-hover transition-colors">
                          <td className="py-2 px-3 font-medium text-foreground">{s.product_name}</td>
                          <td className="py-2 px-3 text-right text-foreground">{s.qty_needed.toFixed(1)} {s.unit.abbreviation}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">{s.qty_in_stock.toFixed(1)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-foreground">{s.qty_to_order.toFixed(1)} {s.unit.abbreviation}</td>
                          <td className="py-2 px-3 text-muted-foreground">{s.suggested_supplier_name}</td>
                          <td className="py-2 px-3 text-right text-foreground">{s.estimated_cost.toFixed(2)} €</td>
                          <td className="py-2 px-3">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.className}`}>
                              {style.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs: Activos / Historico ──────────────────────────── */}
      <div>
        <div className="flex items-center gap-1 mb-4">
          {(["activos", "historico"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest rounded-md transition-colors ${
                tab === activeTab
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-card"
              }`}
            >
              {tab === "activos" ? `Activos (${activeOrdersList.length})` : "Historico"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : activeTab === "activos" ? (
          activeOrdersList.length === 0 ? (
            <div className="rounded-lg bg-card p-8">
              <EmptyState
                icon={ShoppingCart}
                title="No hay pedidos activos"
                description="Crea un pedido de compra para solicitar mercancia a proveedores"
                actionLabel="Crear pedido"
                actionHref="/procurement/orders/new"
              />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Numero", "Proveedor", "Estado", "Total", "Entrega", "Fecha", ""].map((h) => (
                      <th
                        key={h}
                        className={`py-3 px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground ${
                          h === "Total" ? "text-right" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeOrdersList.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-card-hover hover:bg-card-hover transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/procurement/orders/${order.id}`}
                          className="text-primary font-medium hover:underline"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {supplierMap.get(order.supplier_id) ?? order.supplier_id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4">
                        <OrderStatusProgress status={order.status} compact />
                      </td>
                      <td className="py-3 px-4 text-right font-medium tabular-nums text-foreground">
                        {order.total_amount != null ? `${order.total_amount.toFixed(2)} €` : "\u2014"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {order.expected_delivery_date ?? "\u2014"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("es")}
                      </td>
                      <td className="py-3 px-4">
                        {isPOStatus(order.status) && (
                          <POStatusActions
                            poId={order.id}
                            currentStatus={order.status}
                            onStatusChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <OrderHistory orders={localOrders} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}
