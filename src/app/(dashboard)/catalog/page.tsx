"use client";

import { useState } from "react";
import Link from "next/link";
import { useProducts } from "@/features/catalog/hooks/use-products";
import { useSuppliers } from "@/features/catalog/hooks/use-suppliers";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  ClipboardList,
  Plus,
  Minus,
  Trash2,
  Send,
} from "lucide-react";
import { toast } from "sonner";

// ── Design tokens (Stitch Matte Kitchen) ────────────────────────────────────

// ── Cart types ──────────────────────────────────────────────────────────────

interface CartItem {
  productId: string;
  productName: string;
  unit: string;
  qty: number;
  unitPrice: number;
}

// ── Mock data for price comparison ──────────────────────────────────────────

const PRICE_COMPARISON = [
  {
    ingrediente: "Solomillo de Ternera",
    unidad: "kg",
    precios: { "Makro": null, "Sysco": 32.00, "Campofrio": null, "Frutas Garcia": null, "Pesqueria": null, "Lacteos Asturias": null },
    min: 32.00,
    max: 32.00,
  },
  {
    ingrediente: "Pollo Entero Corral",
    unidad: "kg",
    precios: { "Makro": null, "Sysco": 6.80, "Campofrio": 7.20, "Frutas Garcia": null, "Pesqueria": null, "Lacteos Asturias": null },
    min: 6.80,
    max: 7.20,
  },
  {
    ingrediente: "Aceite Oliva AOVE",
    unidad: "L",
    precios: { "Makro": 8.50, "Sysco": null, "Campofrio": null, "Frutas Garcia": null, "Pesqueria": null, "Lacteos Asturias": null },
    min: 8.50,
    max: 8.50,
  },
  {
    ingrediente: "Harina T-55",
    unidad: "kg",
    precios: { "Makro": 0.95, "Sysco": 0.88, "Campofrio": null, "Frutas Garcia": null, "Pesqueria": null, "Lacteos Asturias": null },
    min: 0.88,
    max: 0.95,
  },
  {
    ingrediente: "Salmon Noruego",
    unidad: "kg",
    precios: { "Makro": null, "Sysco": null, "Campofrio": null, "Frutas Garcia": null, "Pesqueria": 18.50, "Lacteos Asturias": null },
    min: 18.50,
    max: 18.50,
  },
  {
    ingrediente: "Tomate Pera",
    unidad: "kg",
    precios: { "Makro": null, "Sysco": null, "Campofrio": null, "Frutas Garcia": 2.10, "Pesqueria": null, "Lacteos Asturias": null },
    min: 2.10,
    max: 2.10,
  },
  {
    ingrediente: "Leche Entera Fresca",
    unidad: "L",
    precios: { "Makro": null, "Sysco": null, "Campofrio": null, "Frutas Garcia": null, "Pesqueria": null, "Lacteos Asturias": 0.92 },
    min: 0.92,
    max: 0.92,
  },
  {
    ingrediente: "Arroz Bomba D.O.",
    unidad: "kg",
    precios: { "Makro": 3.20, "Sysco": null, "Campofrio": null, "Frutas Garcia": null, "Pesqueria": null, "Lacteos Asturias": null },
    min: 3.20,
    max: 3.20,
  },
];

const SUPPLIER_COLS = ["Makro", "Sysco", "Campofrio", "Frutas Garcia", "Pesqueria", "Lacteos Asturias"];

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

// ── Recent orders mock ──────────────────────────────────────────────────────

const RECENT_ORDERS = [
  { ref: "PO-2024-0087", supplier: "Makro España", total: "1.245,80€", status: "ENTREGADO", statusColor: "bg-emerald-500/15 text-emerald-400" },
  { ref: "PO-2024-0086", supplier: "Sysco España", total: "892,40€", status: "EN TRANSITO", statusColor: "bg-blue-500/15 text-blue-400" },
  { ref: "PO-2024-0085", supplier: "Frutas Garcia S.L.", total: "342,10€", status: "CONFIRMADO", statusColor: "bg-[#F97316]/15 text-[#F97316]" },
  { ref: "PO-2024-0084", supplier: "Pesqueria del Norte", total: "1.580,00€", status: "PENDIENTE", statusColor: "bg-yellow-500/15 text-yellow-400" },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const { data: products } = useProducts();
  const { data: suppliers } = useSuppliers();
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
  const total = subtotal + iva;

  function handleFinalize() {
    toast.success(`Pedido por ${total.toFixed(2)}€ enviado correctamente`, {
      description: `${cart.length} lineas de producto`,
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316] mb-1">
            Operaciones de Suministro
          </p>
          <h1 className="text-3xl font-bold text-[#E5E2E1]">
            Catalogo y Compras
          </h1>
          <p className="text-[#A78B7D] text-sm mt-1">
            {products?.length ?? 0} productos &middot; {suppliers?.length ?? HOMOLOGATED_SUPPLIERS.length} proveedores homologados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/procurement/orders">
            <Button
              variant="outline"
              className="border-[#333] bg-transparent text-[#E5E2E1] hover:bg-[#1A1A1A]"
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Historial de Pedidos
            </Button>
          </Link>
          <Link href="/procurement/orders/new">
            <Button className="bg-[#F97316] hover:bg-[#EA680C] text-white border-0">
              <Plus className="mr-2 h-4 w-4" />
              NUEVO PEDIDO
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Main grid: left content + right cart sidebar ──── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* ── Left column ──────────────────────────────────── */}
        <div className="space-y-8">
          {/* ── Comparativa de Precios Criticos ────────────── */}
          <div className="rounded-lg bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D] mb-1">
                  Analisis de Mercado
                </p>
                <h2 className="text-xl font-bold text-[#E5E2E1]">
                  Comparativa de Precios Criticos
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  Mejor precio
                </span>
                <span className="flex items-center gap-1 text-xs text-red-400 ml-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                  Mas caro
                </span>
              </div>
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
                    {SUPPLIER_COLS.map((col) => (
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
                      {SUPPLIER_COLS.map((col) => {
                        const price = row.precios[col as keyof typeof row.precios];
                        if (price == null) {
                          return (
                            <td
                              key={col}
                              className="py-3 px-3 text-right text-[#555]"
                            >
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
                    {/* Logo placeholder */}
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

          {/* ── Ultimos Pedidos ────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D] mb-4">
              Ultimos Pedidos
            </p>
            <div className="space-y-2">
              {RECENT_ORDERS.map((order) => (
                <div
                  key={order.ref}
                  className="flex items-center justify-between rounded-lg bg-[#1A1A1A] px-5 py-3 hover:bg-[#222222] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-medium text-[#F97316]">
                      {order.ref}
                    </span>
                    <span className="text-sm text-[#A78B7D]">
                      {order.supplier}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-[#E5E2E1]">
                      {order.total}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${order.statusColor} border-0`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
                      {total.toFixed(2)}€
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
