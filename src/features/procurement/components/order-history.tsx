"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useSuppliers } from "@/features/catalog/hooks/use-suppliers"
import { OrderStatusProgress } from "./order-status-progress"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, Search } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import type { PurchaseOrder } from "../schemas/procurement.schema"
import type { Supplier } from "@/features/catalog/schemas/catalog.schema"

interface OrderHistoryProps {
  orders: PurchaseOrder[]
  isLoading?: boolean
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "draft,borrador", label: "Borrador" },
  { value: "sent,enviada", label: "Compartido" },
  { value: "confirmed_by_supplier", label: "Confirmado" },
  { value: "received,recibida", label: "Recibido" },
  { value: "cancelled,cancelada", label: "Cancelado" },
]

export function OrderHistory({ orders, isLoading: _isLoading }: OrderHistoryProps) {
  const { data: suppliers = [] } = useSuppliers()
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const supplierMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(suppliers as Supplier[]).forEach((s) => map.set(s.id, s.name))
    return map
  }, [suppliers])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (supplierFilter !== "all" && o.supplier_id !== supplierFilter) return false
      if (statusFilter !== "all") {
        const validStatuses = statusFilter.split(",")
        if (!validStatuses.includes(o.status)) return false
      }
      if (dateFrom && o.created_at < dateFrom) return false
      if (dateTo && o.created_at > dateTo + "T23:59:59Z") return false
      return true
    })
  }, [orders, supplierFilter, statusFilter, dateFrom, dateTo])

  // RO-APPSEC-CSV-001: prevent CSV formula injection. Fields starting with
  // =, +, -, @, tab, or carriage return are executed as formulas by Excel /
  // Google Sheets. We prefix a single quote and also wrap every cell in
  // double quotes (doubling any inner quotes) so field separators/newlines
  // inside data cannot escape the cell.
  function csvEscape(value: unknown): string {
    const s = value === null || value === undefined ? "" : String(value)
    const needsPrefix = /^[=+\-@\t\r]/.test(s)
    const safe = needsPrefix ? `'${s}` : s
    return `"${safe.replace(/"/g, '""')}"`
  }

  function handleExportCSV() {
    const headers = ["Numero", "Proveedor", "Estado", "Total", "Entrega", "Fecha"]
    const rows = filtered.map((o) => [
      o.order_number,
      supplierMap.get(o.supplier_id) ?? o.supplier_id.slice(0, 8),
      o.status,
      o.total_amount?.toFixed(2) ?? "",
      o.expected_delivery_date ?? "",
      new Date(o.created_at).toLocaleDateString("es"),
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map(csvEscape).join(";"))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pedidos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 block">
            Proveedor
          </label>
          <Select value={supplierFilter} onValueChange={(v) => setSupplierFilter(v ?? "all")}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(suppliers as Supplier[]).filter((s) => s.is_active).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 block">
            Estado
          </label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-36">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 block">
            Desde
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="w-36">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 block">
            Hasta
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9"
          />
        </div>

        <Button variant="outline" size="sm" className="h-9" onClick={handleExportCSV}>
          <Download className="mr-1 h-3.5 w-3.5" />
          CSV
        </Button>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} pedidos
        </span>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-lg bg-card p-8">
          <EmptyState
            icon={Search}
            title="Sin resultados"
            description="No hay pedidos que coincidan con los filtros seleccionados"
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Numero", "Proveedor", "Estado", "Total", "Entrega", "Fecha"].map((h) => (
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
              {filtered.map((order) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
