"use client";

import { useState } from "react";
import Link from "next/link";
import { useStockLevels, useStockAlerts } from "@/features/inventory/hooks/use-inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Warehouse,
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  LayoutGrid,
  List,
  Truck,
  Clock,
} from "lucide-react";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";
import { WasteRecordForm } from "@/features/inventory/components/waste-record-form";
import { StockEntryForm } from "@/features/inventory/components/stock-entry-form";
import { StockReservations } from "@/features/inventory/components/stock-reservations";
import { CSVImportSales } from "@/features/sales/components/csv-import-sales";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  CHART_COLORS,
  CHART_THEME,
  getStockColor,
  formatUnits,
} from "@/lib/chart-config";

// --- Mock chart data ---
const stockByCategory = [
  { categoria: "Carnes", actual: 85, minimo: 50 },
  { categoria: "Pescados", actual: 42, minimo: 40 },
  { categoria: "Verduras", actual: 120, minimo: 60 },
  { categoria: "Lacteos", actual: 35, minimo: 30 },
  { categoria: "Secos", actual: 200, minimo: 80 },
  { categoria: "Bebidas", actual: 150, minimo: 50 },
];

const expiryItems = [
  { producto: "Lechuga romana", dias: 1 },
  { producto: "Salmon fresco", dias: 2 },
  { producto: "Crema de leche", dias: 2 },
  { producto: "Tomate cherry", dias: 3 },
  { producto: "Pollo entero", dias: 4 },
  { producto: "Merluza", dias: 5 },
  { producto: "Mantequilla", dias: 7 },
  { producto: "Queso parmesano", dias: 12 },
];

// --- Mock table data for Stitch-style display ---
const inventoryTableData = [
  { id: "1", producto: "Solomillo de Ternera", categoria: "Carnes", existencias: 24, unidad: "kg", precio: 42.50, estado: "OPTIMO", thumb: "from-red-800 to-red-600" },
  { id: "2", producto: "Salmon Noruego Premium", categoria: "Pescados", existencias: 8, unidad: "kg", precio: 38.90, estado: "CRITICO", thumb: "from-orange-700 to-pink-600" },
  { id: "3", producto: "Aceite Trufa Negra", categoria: "Bodega", existencias: 12, unidad: "bot", precio: 89.00, estado: "OPTIMO", thumb: "from-amber-800 to-yellow-600" },
  { id: "4", producto: "Foie Gras Mi-Cuit", categoria: "Carnes", existencias: 5, unidad: "ud", precio: 65.20, estado: "AVISO", thumb: "from-pink-800 to-rose-500" },
  { id: "5", producto: "Gambas Rojas Denia", categoria: "Pescados", existencias: 3, unidad: "kg", precio: 72.00, estado: "CRITICO", thumb: "from-rose-700 to-orange-500" },
  { id: "6", producto: "Queso Idiazabal", categoria: "Lacteos", existencias: 18, unidad: "ud", precio: 28.50, estado: "OPTIMO", thumb: "from-yellow-700 to-amber-500" },
  { id: "7", producto: "Rioja Gran Reserva 2018", categoria: "Bodega", existencias: 36, unidad: "bot", precio: 54.00, estado: "OPTIMO", thumb: "from-purple-900 to-red-700" },
  { id: "8", producto: "Jamon Iberico 5J", categoria: "Carnes", existencias: 2, unidad: "pza", precio: 420.00, estado: "AVISO", thumb: "from-red-900 to-rose-700" },
];

// --- Scheduled deliveries mock ---
const entregas = [
  { proveedor: "Carnicas del Norte", hora: "07:30", items: 12, estado: "En camino" },
  { proveedor: "Lonja de Denia", hora: "08:15", items: 8, estado: "Confirmado" },
  { proveedor: "Bodegas Martinez", hora: "10:00", items: 24, estado: "Pendiente" },
  { proveedor: "Lacteos Naturales", hora: "11:30", items: 6, estado: "Confirmado" },
];

/** Return bar color based on stock ratio (actual / minimo) */
function getStockLevelColor(actual: number, minimo: number): string {
  const ratio = actual / minimo;
  if (ratio <= 1.0) return CHART_COLORS.red;
  if (ratio <= 1.5) return CHART_COLORS.amber;
  return CHART_COLORS.green;
}

const theme = CHART_THEME.dark;

// Category filter tabs
const CATEGORY_TABS = ["TODOS", "CARNES", "PESCADOS", "BODEGA", "LACTEOS"] as const;

// Status badge config
const statusConfig: Record<string, { label: string; className: string }> = {
  OPTIMO: { label: "OPTIMO", className: "bg-emerald-500/15 text-emerald-400 border-0" },
  CRITICO: { label: "CRITICO", className: "bg-red-500/15 text-red-400 border-0" },
  AVISO: { label: "AVISO", className: "bg-orange-500/15 text-orange-400 border-0" },
};

export default function InventoryPage() {
  const { data: levels, isLoading } = useStockLevels();
  const { data: alerts } = useStockAlerts();
  const [activeTab, setActiveTab] = useState("stock");
  const [categoryFilter, setCategoryFilter] = useState<string>("TODOS");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const stockItems = Array.isArray(levels) ? levels : [];
  const expiring = alerts?.expiring_soon ?? [];

  // Filter table data by category
  const filteredItems = categoryFilter === "TODOS"
    ? inventoryTableData
    : inventoryTableData.filter(
        (item) => item.categoria.toUpperCase() === categoryFilter
      );

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            Operaciones
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Inventario Real-Time
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stockItems.length > 0
              ? `${stockItems.length} productos en stock`
              : `${inventoryTableData.length} productos en stock`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <WasteRecordForm />
          <CSVImportSales />
          <Link href="/inventory/theoretical">
            <Button
              variant="outline"
              className="border-border-subtle bg-transparent text-foreground hover:bg-card"
            >
              Teórico vs Real
            </Button>
          </Link>
          <StockEntryForm />
        </div>
      </div>

      {/* ---- KPI Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valor Total Stock */}
        <div className="rounded-lg bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Valor Total Stock
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              42.850,20&euro;
            </span>
            <span className="flex items-center gap-0.5 text-xs text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              +2.4%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">vs mes anterior</p>
        </div>

        {/* Bajo Minimo */}
        <div className="rounded-lg bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Bajo Minimo
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">12</span>
            <span className="flex items-center gap-0.5 text-xs text-red-400">
              <TrendingDown className="h-3 w-3" />
              +3
            </span>
          </div>
          <p className="text-xs text-red-400 mt-1">Accion requerida inmediata</p>
        </div>

        {/* Rotacion de Stock */}
        <div className="rounded-lg bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Rotacion de Stock
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">8.4x</span>
          </div>
          <p className="text-xs text-emerald-400 mt-1">Óptimo para restaurante</p>
        </div>

        {/* Gestion de Mermas */}
        <div className="rounded-lg bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Gestion de Mermas
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">1.2%</span>
            <span className="text-xs text-emerald-400">Objetivo &lt;2%</span>
          </div>
          {/* Mini progress bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-border-subtle">
            <div
              className="h-1.5 rounded-full bg-emerald-500"
              style={{ width: "60%" }}
            />
          </div>
        </div>
      </div>

      {/* ---- Expiry alert (existing functionality preserved) ---- */}
      {expiring.length > 0 && (
        <div className="rounded-lg bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">
              Productos proximos a caducar
            </span>
          </div>
          <div className="space-y-2">
            {expiring.map(
              (item: {
                lot_id: string;
                product_name: string;
                quantity: number;
                days_to_expiry: number;
              }) => (
                <div
                  key={item.lot_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground">
                    {item.product_name} &mdash; {item.quantity} uds.
                  </span>
                  <Badge className={
                    item.days_to_expiry <= 0
                      ? "bg-red-500/15 text-red-400 border-0"
                      : item.days_to_expiry <= 3
                      ? "bg-orange-500/15 text-orange-400 border-0"
                      : "bg-amber-500/15 text-amber-400 border-0"
                  }>
                    {item.days_to_expiry <= 0
                      ? "Caducado"
                      : `${item.days_to_expiry} dias`}
                  </Badge>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ---- Category Filter Tabs + Controls ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setCategoryFilter(tab)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest rounded-md transition-colors ${
                categoryFilter === tab
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-card"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-card border border-border-subtle rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary">
            <option>Almacen Central</option>
            <option>Bodega Principal</option>
            <option>Camara Fria</option>
          </select>
          <div className="flex items-center border border-border-subtle rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground hover:bg-card"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:bg-card"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ---- Main Inventory Table (Stitch style) ---- */}
      <div className="rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border-subtle hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Producto
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Categoria
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Existencias
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Precio Unit.
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-right">
                Accion
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => {
              const status = statusConfig[item.estado] ?? statusConfig.OPTIMO!;
              if (!status) return null;
              return (
                <TableRow
                  key={item.id}
                  className="border-b border-card-hover hover:bg-card-hover/50 transition-colors"
                >
                  {/* Producto with thumbnail */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-full bg-gradient-to-br ${item.thumb} flex-shrink-0`}
                      />
                      <span className="font-medium text-foreground">
                        {item.producto}
                      </span>
                    </div>
                  </TableCell>
                  {/* Categoria badge */}
                  <TableCell>
                    <span className="inline-block px-2.5 py-0.5 rounded text-xs bg-border-subtle text-muted-foreground">
                      {item.categoria}
                    </span>
                  </TableCell>
                  {/* Existencias */}
                  <TableCell className="text-foreground">
                    {item.existencias}{" "}
                    <span className="text-muted-foreground text-xs">{item.unidad}</span>
                  </TableCell>
                  {/* Precio */}
                  <TableCell className="text-foreground">
                    {item.precio.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                    })}
                    &euro;
                  </TableCell>
                  {/* Estado badge */}
                  <TableCell>
                    <Badge className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  {/* Accion */}
                  <TableCell className="text-right">
                    <button className="p-1.5 rounded hover:bg-border-subtle text-muted-foreground hover:text-foreground transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ---- Dynamic stock from API (existing functionality preserved) ---- */}
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : stockItems.length > 0 ? (
        <div className="rounded-lg bg-card overflow-hidden">
          <div className="p-5 border-b border-border-subtle">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Datos en vivo
            </p>
            <h3 className="text-lg font-bold text-foreground">
              Niveles de stock
            </h3>
            <p className="text-sm text-muted-foreground">
              Stock actual derivado de lotes activos
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border-subtle hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Producto
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Cantidad total
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Lotes
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Caducidad proxima
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockItems.map(
                (item: {
                  product_id: string;
                  product_name: string;
                  total_quantity: number;
                  lot_count: number;
                  earliest_expiry: string | null;
                }) => (
                  <TableRow
                    key={item.product_id}
                    className="border-b border-card-hover hover:bg-card-hover/50 transition-colors"
                  >
                    <TableCell className="font-medium text-foreground">
                      {item.product_name}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {item.total_quantity}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {item.lot_count}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.earliest_expiry ?? "\u2014"}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {/* ---- Charts + Entregas Programadas row ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Stock Levels by Category */}
        <div className="lg:col-span-2 rounded-lg bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Analisis
          </p>
          <h3 className="text-lg font-bold text-foreground mb-4">
            Rendimiento de Inventario
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stock por categoria */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Stock por categoria
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={stockByCategory}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.gridStroke}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke={theme.axisStroke}
                    tick={{ fill: theme.axisStroke, fontSize: 12 }}
                    tickFormatter={(v: number) => formatUnits(v)}
                  />
                  <YAxis
                    dataKey="categoria"
                    type="category"
                    stroke={theme.axisStroke}
                    tick={{ fill: theme.axisStroke, fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.tooltipBg,
                      border: `1px solid ${theme.tooltipBorder}`,
                      borderRadius: 8,
                      color: theme.tooltipText,
                    }}
                    formatter={((value: number, name: string) => [
                      formatUnits(value),
                      name === "actual" ? "Actual" : "Minimo",
                    ]) as never}
                  />
                  <Bar dataKey="actual" radius={[0, 4, 4, 0]}>
                    {stockByCategory.map((entry, index) => (
                      <Cell
                        key={`stock-${index}`}
                        fill={getStockLevelColor(entry.actual, entry.minimo)}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="minimo"
                    fill={CHART_COLORS.gray}
                    radius={[0, 4, 4, 0]}
                    opacity={0.35}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Proximos a caducar */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Proximos a caducar
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={expiryItems}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.gridStroke}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke={theme.axisStroke}
                    tick={{ fill: theme.axisStroke, fontSize: 12 }}
                    label={{
                      value: "dias",
                      position: "insideBottomRight",
                      offset: -5,
                      fill: theme.axisStroke,
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    dataKey="producto"
                    type="category"
                    stroke={theme.axisStroke}
                    tick={{ fill: theme.axisStroke, fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.tooltipBg,
                      border: `1px solid ${theme.tooltipBorder}`,
                      borderRadius: 8,
                      color: theme.tooltipText,
                    }}
                    formatter={((value: number) => [`${value} dias`, "Caducidad"]) as never}
                  />
                  <Bar dataKey="dias" radius={[0, 4, 4, 0]}>
                    {expiryItems.map((entry, index) => (
                      <Cell
                        key={`expiry-${index}`}
                        fill={getStockColor(entry.dias)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Entregas Programadas */}
        <div className="rounded-lg bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Entregas Programadas
            </p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Hoy, 24 Mar 2026</p>
          <div className="space-y-4">
            {entregas.map((e, i) => (
              <div
                key={i}
                className="flex items-start gap-3 pb-4 border-b border-card-hover last:border-0 last:pb-0"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">
                      {e.proveedor}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {e.hora}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {e.items} productos
                    </span>
                    <Badge
                      className={
                        e.estado === "En camino"
                          ? "bg-blue-500/15 text-blue-400 border-0 text-xs"
                          : e.estado === "Confirmado"
                          ? "bg-emerald-500/15 text-emerald-400 border-0 text-xs"
                          : "bg-amber-500/15 text-amber-400 border-0 text-xs"
                      }
                    >
                      {e.estado}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Tabs: Reservas de stock (existing functionality) ---- */}
      <div className="rounded-lg bg-card overflow-hidden">
        <div className="flex items-center gap-1 p-4 border-b border-border-subtle">
          <button
            onClick={() => setActiveTab("stock")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest rounded-md transition-colors ${
              activeTab === "stock"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
            }`}
          >
            Movimientos
          </button>
          <button
            onClick={() => setActiveTab("reservas")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "reservas"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
            }`}
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            Reservas de stock
          </button>
        </div>
        <div className="p-5">
          {activeTab === "stock" ? (
            <div className="flex items-center gap-3">
              <Link href="/inventory/movements">
                <Button
                  variant="outline"
                  className="border-border-subtle bg-transparent text-foreground hover:bg-card-hover"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Ver todos los movimientos
                </Button>
              </Link>
              <Link href="/inventory/lots">
                <Button
                  variant="outline"
                  className="border-border-subtle bg-transparent text-foreground hover:bg-card-hover"
                >
                  <Warehouse className="mr-2 h-4 w-4" />
                  Ver lotes
                </Button>
              </Link>
            </div>
          ) : (
            <StockReservations />
          )}
        </div>
      </div>

      {/* ---- Empty state (only when no data at all) ---- */}
      {!isLoading && stockItems.length === 0 && inventoryTableData.length === 0 && (
        <div className="rounded-lg bg-card p-8">
          <EmptyState
            icon={Warehouse}
            title="Sin stock"
            description="El inventario se alimenta de recepciones de mercancia. Crea un pedido de compra para empezar."
            actionLabel="Ir a compras"
            actionHref="/procurement/orders"
          />
        </div>
      )}
    </div>
  );
}
