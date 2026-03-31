"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePurchaseOrders } from "@/features/procurement/hooks/use-procurement";
import { POStatusBadge } from "@/features/procurement/components/po-status-badge";
import { POStatusActions } from "@/features/procurement/components/po-status-actions";
import { OCRAlbaranDialog } from "@/features/procurement/components/ocr-albaran-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ShoppingCart,
  Camera,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  PackagePlus,
  ClipboardList,
  Send,
  Minus,
  Trash2,
  Star,
  Leaf,
  Truck,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";
import { RoleGate } from "@/components/role-gate";
import type { PurchaseOrder } from "@/features/procurement/schemas/procurement.schema";
import { isPOStatus, type POStatus } from "@/features/procurement/po-fsm";
import { toast } from "sonner";

import { generatePurchaseSuggestions } from "@/lib/calculations/procurementEngine";
import { calculateDemand } from "@/lib/calculations/demandEngine";
import type {
  EventWithMenu,
  RecipeMap,
  ProductMap,
  StockSnapshot,
  CatalogMap,
  CatalogEntry,
  PurchaseSuggestion,
} from "@/lib/calculations/types";
import {
  MOCK_PRODUCTS,
  MOCK_STOCK_LOTS,
  MOCK_SUPPLIER_OFFERS,
  MOCK_VOLUME_DISCOUNTS,
  MOCK_RECIPES,
  MOCK_RECIPE_INGREDIENTS,
} from "@/lib/mock-data";
// Mock services for restaurant procurement
const MOCK_SERVICES_PROCUREMENT = [
  { id: "svc-1", name: "Comida Lun", date: "2026-03-30", guests: 45, status: "confirmado" },
  { id: "svc-2", name: "Cena Lun", date: "2026-03-30", guests: 60, status: "confirmado" },
  { id: "svc-3", name: "Comida Mar", date: "2026-03-31", guests: 50, status: "confirmado" },
  { id: "svc-4", name: "Cena Mar", date: "2026-03-31", guests: 55, status: "confirmado" },
  { id: "svc-5", name: "Comida Mie", date: "2026-04-01", guests: 48, status: "confirmado" },
  { id: "svc-6", name: "Cena Mie", date: "2026-04-01", guests: 65, status: "confirmado" },
];

// ── Design tokens (Stitch Matte Kitchen) ────────────────────────────────────

const T = {
  bg: "#0A0A0A",
  card: "#1A1A1A",
  cardHover: "#222222",
  primary: "#F97316",
  text: "#E5E2E1",
  secondary: "#A78B7D",
} as const;

// ─── Helpers to bridge mock data into engine types ──────────────────────────

/** Build RecipeMap from MOCK_RECIPES + MOCK_RECIPE_INGREDIENTS */
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

/** Build ProductMap from MOCK_PRODUCTS */
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

/** Build StockSnapshot map from MOCK_STOCK_LOTS (aggregate by product) */
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
        safety_stock: 2, // default safety stock
      });
    }
  }
  return map;
}

/** Build CatalogMap from MOCK_SUPPLIER_OFFERS + MOCK_VOLUME_DISCOUNTS */
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
    if (!catalog[offer.product_id]) {
      catalog[offer.product_id] = [];
    }
    catalog[offer.product_id]!.push(entry);
  }
  return catalog;
}

/** Get confirmed services within the next N days from today */
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
        menu: {
          items: recipeIds.map((id) => ({ recipe_id: id, servings_per_pax: 1 })),
        },
      };
    });
}

// ─── Urgency badge styling (Matte Kitchen) ──────────────────────────────────

const URGENCY_STYLES: Record<
  PurchaseSuggestion["urgency"],
  { label: string; className: string }
> = {
  critical: {
    label: "CRITICO",
    className: "bg-red-500/15 text-red-400 border-0",
  },
  urgent: {
    label: "URGENTE",
    className: "bg-[#F97316]/15 text-[#F97316] border-0",
  },
  normal: {
    label: "NORMAL",
    className: "bg-emerald-500/15 text-emerald-400 border-0",
  },
};

// ── Supplier cards mock ─────────────────────────────────────────────────────

const HOMOLOGATED_SUPPLIERS = [
  {
    id: "sup-makro",
    name: "Makro España",
    specialty: "Distribucion General",
    badges: [
      { label: "ELITE", color: "bg-[#F97316]/15 text-[#F97316]" },
      { label: "STOCK 24H", color: "bg-blue-500/15 text-blue-400" },
      { label: "GLOBAL", color: "bg-purple-500/15 text-purple-400" },
    ],
    initials: "MK",
    gradient: "from-orange-700 to-amber-600",
  },
  {
    id: "sup-sysco",
    name: "Sysco España",
    specialty: "Carnes & Proteinas",
    badges: [
      { label: "ELITE", color: "bg-[#F97316]/15 text-[#F97316]" },
      { label: "FRESCO", color: "bg-emerald-500/15 text-emerald-400" },
    ],
    initials: "SY",
    gradient: "from-blue-700 to-cyan-600",
  },
  {
    id: "sup-frutas",
    name: "Frutas Garcia S.L.",
    specialty: "Frutas & Verduras",
    badges: [
      { label: "LOCAL", color: "bg-emerald-500/15 text-emerald-400" },
      { label: "ECO-CERT", color: "bg-green-500/15 text-green-400" },
      { label: "FRESCO", color: "bg-emerald-500/15 text-emerald-400" },
    ],
    initials: "FG",
    gradient: "from-green-700 to-emerald-600",
  },
  {
    id: "sup-pesqueria",
    name: "Pesqueria del Norte",
    specialty: "Pescados & Mariscos",
    badges: [
      { label: "LOCAL", color: "bg-emerald-500/15 text-emerald-400" },
      { label: "FRESCO", color: "bg-emerald-500/15 text-emerald-400" },
      { label: "STOCK 24H", color: "bg-blue-500/15 text-blue-400" },
    ],
    initials: "PN",
    gradient: "from-cyan-700 to-blue-600",
  },
];

// ── Price comparison mock ───────────────────────────────────────────────────

const PRICE_COMPARISON = [
  {
    ingrediente: "Solomillo de Ternera",
    unidad: "kg",
    precios: { "Makro": null, "Sysco": 32.00, "Campofrio": null, "Frutas Garcia": null },
    min: 32.00,
    max: 32.00,
  },
  {
    ingrediente: "Pollo Entero Corral",
    unidad: "kg",
    precios: { "Makro": null, "Sysco": 6.80, "Campofrio": 7.20, "Frutas Garcia": null },
    min: 6.80,
    max: 7.20,
  },
  {
    ingrediente: "Harina T-55",
    unidad: "kg",
    precios: { "Makro": 0.95, "Sysco": 0.88, "Campofrio": null, "Frutas Garcia": null },
    min: 0.88,
    max: 0.95,
  },
  {
    ingrediente: "Aceite Oliva AOVE",
    unidad: "L",
    precios: { "Makro": 8.50, "Sysco": null, "Campofrio": null, "Frutas Garcia": null },
    min: 8.50,
    max: 8.50,
  },
  {
    ingrediente: "Tomate Pera",
    unidad: "kg",
    precios: { "Makro": null, "Sysco": null, "Campofrio": null, "Frutas Garcia": 2.10 },
    min: 2.10,
    max: 2.10,
  },
];

const PRICE_COLS = ["Makro", "Sysco", "Campofrio", "Frutas Garcia"];

// ── Cart types ──────────────────────────────────────────────────────────────

interface CartItem {
  productId: string;
  productName: string;
  unit: string;
  qty: number;
  unitPrice: number;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const { data: orders, isLoading } = usePurchaseOrders();
  const [localOrders, setLocalOrders] = useState<PurchaseOrder[]>([]);
  const [ocrOpen, setOcrOpen] = useState(false);

  // Suggestions state
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [suggestions, setSuggestions] = useState<PurchaseSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([
    { productId: "p1", productName: "Solomillo de Ternera", unit: "kg", qty: 12, unitPrice: 32.00 },
    { productId: "p2", productName: "Salmon Noruego", unit: "kg", qty: 8, unitPrice: 18.50 },
    { productId: "p3", productName: "Aceite Oliva AOVE", unit: "L", qty: 20, unitPrice: 8.50 },
  ]);

  function updateQty(idx: number, delta: number) {
    setCart((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, qty: Math.max(0, item.qty + delta) } : item
      ).filter((item) => item.qty > 0)
    );
  }

  function removeItem(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const iva = subtotal * 0.21;
  const totalCart = subtotal + iva;

  useEffect(() => {
    if (orders) setLocalOrders(orders);
  }, [orders]);

  function handleStatusChange(orderId: string, newStatus: POStatus) {
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
    );
  }

  /** Generate purchase suggestions using the procurement engine */
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
          toast.success(
            `${result.length} sugerencias generadas para ${events.length} evento(s)`,
          );
        }
      } catch (err) {
        console.error("Error generating suggestions:", err);
        toast.error("Error al generar sugerencias de compra");
      } finally {
        setSuggestionsLoading(false);
      }
    }, 400);
  }, []);

  /** Group suggestions by supplier and create POs (toast placeholder) */
  const handleCreateOrders = useCallback(() => {
    const bySupplier = new Map<string, PurchaseSuggestion[]>();
    for (const s of suggestions) {
      const key = s.suggested_supplier_id || "sin-proveedor";
      if (!bySupplier.has(key)) bySupplier.set(key, []);
      bySupplier.get(key)!.push(s);
    }

    const count = bySupplier.size;
    const totalCost = suggestions.reduce((sum, s) => sum + s.estimated_cost, 0);

    toast.success(
      `${count} pedido(s) creados por un total de ${totalCost.toFixed(2)} EUR`,
      {
        description: [...bySupplier.entries()]
          .map(([, items]) => `${items[0]?.suggested_supplier_name ?? "?"}: ${items.length} lineas`)
          .join(" | "),
      },
    );
  }, [suggestions]);

  function handleFinalize() {
    toast.success(`Pedido por ${totalCart.toFixed(2)}€ enviado correctamente`, {
      description: `${cart.length} lineas de producto`,
    });
  }

  const totalEstimatedCost = suggestions.reduce((sum, s) => sum + s.estimated_cost, 0);

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316] mb-1">
            Operaciones de Suministro
          </p>
          <h1 className="text-3xl font-bold text-[#E5E2E1]">
            Pedidos de Compra
          </h1>
          <p className="text-[#A78B7D] text-sm mt-1">
            {localOrders.length} pedidos registrados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setOcrOpen(true)}
            className="border-[#333] bg-transparent text-[#E5E2E1] hover:bg-[#1A1A1A]"
          >
            <Camera className="h-4 w-4 mr-2" />
            OCR Albaran
          </Button>
          <RoleGate permission="po:create">
            <Link href="/procurement/orders/new">
              <Button className="bg-[#F97316] hover:bg-[#EA680C] text-white border-0">
                <Plus className="mr-2 h-4 w-4" />
                NUEVO PEDIDO
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

      {/* ── Main grid: left content + right cart sidebar ──── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* ── Left column ──────────────────────────────────── */}
        <div className="space-y-8">
          {/* ── Sugerencias de compra ──────────────────────── */}
          <div className="rounded-lg bg-[#1A1A1A] p-6">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setSuggestionsOpen((v) => !v)}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[#F97316]" />
                <h2 className="text-lg font-bold text-[#E5E2E1]">
                  Sugerencias de Compra
                </h2>
                {suggestionsGenerated && suggestions.length > 0 && (
                  <span className="rounded-full bg-[#F97316]/15 px-2.5 py-0.5 text-xs font-semibold text-[#F97316] border-0">
                    {suggestions.length}
                  </span>
                )}
              </div>
              {suggestionsOpen ? (
                <ChevronUp className="h-4 w-4 text-[#A78B7D]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#A78B7D]" />
              )}
            </div>

            {suggestionsOpen && (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleGenerateSuggestions}
                    disabled={suggestionsLoading}
                    className="rounded-lg border border-[#333] bg-transparent text-[#E5E2E1] hover:bg-[#222] px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {suggestionsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generar sugerencias
                  </button>

                  {suggestionsGenerated && suggestions.length > 0 && (
                    <button
                      onClick={handleCreateOrders}
                      className="rounded-lg bg-[#F97316] hover:bg-[#EA680C] text-white px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <PackagePlus className="h-4 w-4" />
                      Crear pedidos ({new Set(suggestions.map((s) => s.suggested_supplier_id)).size})
                    </button>
                  )}

                  {suggestionsGenerated && suggestions.length > 0 && (
                    <span className="text-sm text-[#A78B7D] ml-auto">
                      Coste estimado:{" "}
                      <span className="font-semibold text-[#E5E2E1]">
                        {totalEstimatedCost.toFixed(2)} EUR
                      </span>
                    </span>
                  )}
                </div>

                {suggestionsLoading && (
                  <div className="flex items-center justify-center py-8 text-[#A78B7D]">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Calculando demanda y comparando con stock...
                  </div>
                )}

                {suggestionsGenerated && suggestions.length === 0 && (
                  <p className="text-sm text-[#A78B7D] py-4 text-center">
                    No se requieren compras adicionales para los proximos 14 dias.
                  </p>
                )}

                {suggestionsGenerated && suggestions.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#333]">
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                            Producto
                          </th>
                          <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                            Necesario
                          </th>
                          <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                            En stock
                          </th>
                          <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                            A pedir
                          </th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                            Proveedor
                          </th>
                          <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                            Coste est.
                          </th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                            Urgencia
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {suggestions.map((s) => {
                          const style = URGENCY_STYLES[s.urgency];
                          return (
                            <tr
                              key={s.product_id}
                              className="border-b border-[#222] hover:bg-[#222222] transition-colors"
                            >
                              <td className="py-3 px-3 font-medium text-[#E5E2E1]">
                                {s.product_name}
                              </td>
                              <td className="py-3 px-3 text-right text-[#E5E2E1]">
                                {s.qty_needed.toFixed(2)} {s.unit.abbreviation}
                              </td>
                              <td className="py-3 px-3 text-right text-[#A78B7D]">
                                {s.qty_in_stock.toFixed(2)} {s.unit.abbreviation}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-[#E5E2E1]">
                                {s.qty_to_order.toFixed(2)} {s.unit.abbreviation}
                              </td>
                              <td className="py-3 px-3 text-[#A78B7D]">
                                {s.suggested_supplier_name}
                              </td>
                              <td className="py-3 px-3 text-right text-[#E5E2E1]">
                                {s.estimated_cost.toFixed(2)} EUR
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.className}`}
                                >
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

          {/* ── Comparativa de Precios Criticos ────────────── */}
          <div className="rounded-lg bg-[#1A1A1A] p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D] mb-1">
                Analisis de Mercado
              </p>
              <h2 className="text-xl font-bold text-[#E5E2E1]">
                Comparativa de Precios Criticos
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#333]">
                    <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                      Ingrediente
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                      Unidad
                    </th>
                    {PRICE_COLS.map((col) => (
                      <th
                        key={col}
                        className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PRICE_COMPARISON.map((row) => (
                    <tr
                      key={row.ingrediente}
                      className="border-b border-[#222] hover:bg-[#222222] transition-colors"
                    >
                      <td className="py-3 px-3 font-medium text-[#E5E2E1]">
                        {row.ingrediente}
                      </td>
                      <td className="py-3 px-3 text-[#A78B7D]">{row.unidad}</td>
                      {PRICE_COLS.map((col) => {
                        const price = row.precios[col as keyof typeof row.precios];
                        if (price == null) {
                          return (
                            <td key={col} className="py-3 px-3 text-right text-[#555]">
                              &mdash;
                            </td>
                          );
                        }
                        const isMin = price === row.min && row.min !== row.max;
                        const isMax = price === row.max && row.min !== row.max;
                        return (
                          <td
                            key={col}
                            className={`py-3 px-3 text-right font-medium ${
                              isMin
                                ? "text-emerald-400"
                                : isMax
                                ? "text-red-400"
                                : "text-[#E5E2E1]"
                            }`}
                          >
                            {price.toFixed(2)}€
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Proveedores Homologados ────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D] mb-4">
              Proveedores Homologados
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {HOMOLOGATED_SUPPLIERS.map((sup) => (
                <div
                  key={sup.id}
                  className="rounded-lg bg-[#1A1A1A] p-5 hover:bg-[#222222] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-12 w-12 rounded-lg bg-gradient-to-br ${sup.gradient} flex items-center justify-center text-white text-sm font-bold shrink-0`}
                    >
                      {sup.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#E5E2E1] truncate">
                        {sup.name}
                      </h3>
                      <p className="text-xs text-[#A78B7D] mt-0.5">
                        {sup.specialty}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {sup.badges.map((badge) => (
                          <span
                            key={badge.label}
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.color} border-0`}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Orders table (Ultimos Pedidos) ─────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D] mb-4">
              Ultimos Pedidos
            </p>

            {isLoading ? (
              <TableSkeleton />
            ) : localOrders.length === 0 ? (
              <div className="rounded-lg bg-[#1A1A1A] p-8">
                <EmptyState
                  icon={ShoppingCart}
                  title="No hay pedidos"
                  description="Crea un pedido de compra para solicitar mercancia a proveedores"
                  actionLabel="Crear pedido"
                  actionHref="/procurement/orders/new"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#333]">
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                        Numero
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                        Estado
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                        Total
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                        Entrega esperada
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                        Fecha
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {localOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-[#222] hover:bg-[#222222] transition-colors"
                      >
                        <td className="py-3 px-3">
                          <Link
                            href={`/procurement/orders/${order.id}`}
                            className="text-[#F97316] font-medium hover:underline"
                          >
                            <span className="flex items-center gap-1.5">
                              <ShoppingCart className="h-3.5 w-3.5" />
                              {order.order_number}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          {isPOStatus(order.status) ? (
                            <POStatusBadge status={order.status} />
                          ) : (
                            <span className="text-xs text-[#A78B7D]">
                              {order.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-[#E5E2E1]">
                          {order.total_amount != null
                            ? `${order.total_amount.toFixed(2)} EUR`
                            : "\u2014"}
                        </td>
                        <td className="py-3 px-3 text-[#A78B7D]">
                          {order.expected_delivery_date ?? "\u2014"}
                        </td>
                        <td className="py-3 px-3 text-[#A78B7D]">
                          {new Date(order.created_at).toLocaleDateString("es")}
                        </td>
                        <td className="py-3 px-3">
                          {isPOStatus(order.status) && (
                            <POStatusActions
                              poId={order.id}
                              currentStatus={order.status}
                              onStatusChange={(newStatus) =>
                                handleStatusChange(order.id, newStatus)
                              }
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar: Carrito Industrial ────────────── */}
        <div className="xl:sticky xl:top-6 h-fit">
          <div className="rounded-lg bg-[#1A1A1A] p-5">
            <div className="flex items-center gap-2 mb-5">
              <ShoppingCart className="h-5 w-5 text-[#F97316]" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#F97316]">
                Carrito Industrial
              </h3>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-[#A78B7D] py-8 text-center">
                Carrito vacio
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#E5E2E1] truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-[#A78B7D]">
                        {item.unitPrice.toFixed(2)}€/{item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(idx, -1)}
                        className="h-6 w-6 rounded bg-[#333] flex items-center justify-center text-[#A78B7D] hover:bg-[#444] transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-[#E5E2E1]">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(idx, 1)}
                        className="h-6 w-6 rounded bg-[#333] flex items-center justify-center text-[#A78B7D] hover:bg-[#444] transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeItem(idx)}
                        className="h-6 w-6 rounded flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="border-t border-[#333] pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A78B7D]">Subtotal</span>
                    <span className="text-[#E5E2E1]">{subtotal.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A78B7D]">IVA (21%)</span>
                    <span className="text-[#E5E2E1]">{iva.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                      Total Pedido
                    </span>
                    <span className="text-2xl font-bold text-[#F97316]">
                      {totalCart.toFixed(2)}€
                    </span>
                  </div>
                </div>

                {/* Send button */}
                <button
                  onClick={handleFinalize}
                  className="w-full mt-4 rounded-lg bg-[#F97316] hover:bg-[#EA680C] text-white font-semibold py-3 text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Finalizar y Enviar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
