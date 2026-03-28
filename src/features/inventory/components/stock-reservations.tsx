import { Calendar, Package, CheckCircle, Clock, Unlock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WasteStockReservation } from "../waste-types"

// Mock reservations
const MOCK_RESERVATIONS: WasteStockReservation[] = [
  {
    id: "r1", hotel_id: "h1", event_id: "e1",
    event_name: "Boda García-López", event_date: "2026-03-22",
    product_id: "p1", product_name: "Lomo de ternera",
    reserved_quantity: 12, unit: "kg", status: "confirmada",
  },
  {
    id: "r2", hotel_id: "h1", event_id: "e1",
    event_name: "Boda García-López", event_date: "2026-03-22",
    product_id: "p2", product_name: "Salmón fresco",
    reserved_quantity: 8, unit: "kg", status: "confirmada",
  },
  {
    id: "r3", hotel_id: "h1", event_id: "e2",
    event_name: "Congreso Tech Summit", event_date: "2026-03-25",
    product_id: "p4", product_name: "Harina de trigo",
    reserved_quantity: 5, unit: "kg", status: "pendiente",
  },
  {
    id: "r4", hotel_id: "h1", event_id: "e2",
    event_name: "Congreso Tech Summit", event_date: "2026-03-25",
    product_id: "p5", product_name: "Aceite de oliva virgen",
    reserved_quantity: 3, unit: "L", status: "pendiente",
  },
  {
    id: "r5", hotel_id: "h1", event_id: "e3",
    event_name: "Cena Gala Premios", event_date: "2026-04-05",
    product_id: "p7", product_name: "Mantequilla",
    reserved_quantity: 2, unit: "kg", status: "pendiente",
  },
  {
    id: "r6", hotel_id: "h1", event_id: "e0",
    event_name: "Evento pasado", event_date: "2026-03-10",
    product_id: "p3", product_name: "Leche entera",
    reserved_quantity: 10, unit: "L", status: "liberada",
  },
]

const STATUS_CONFIG: Record<
  WasteStockReservation["status"],
  { label: string; icon: React.ElementType; class: string }
> = {
  pendiente:  { label: "Pendiente",  icon: Clock,        class: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
  confirmada: { label: "Confirmada", icon: CheckCircle,  class: "text-green-600 bg-green-50 dark:bg-green-950/30" },
  liberada:   { label: "Liberada",   icon: Unlock,       class: "text-gray-500 bg-gray-100 dark:bg-gray-800" },
}

export function StockReservations() {
  // Group by event
  const byEvent = MOCK_RESERVATIONS.reduce<Record<string, WasteStockReservation[]>>(
    (acc, r) => {
      const key = r.event_id
      if (!acc[key]) acc[key] = []
      acc[key]!.push(r)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-4">
      {Object.entries(byEvent).map(([eventId, reservations]) => {
        const first = reservations[0]!
        return (
          <div key={eventId} className="rounded-lg border bg-card">
            {/* Event header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/40">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{first.event_name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(first.event_date).toLocaleDateString("es-ES")}
              </span>
            </div>

            {/* Products table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">
                    Producto
                  </th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">
                    Cantidad
                  </th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => {
                  const cfg = STATUS_CONFIG[r.status]
                  const Icon = cfg.icon
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          {r.product_name}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {r.reserved_quantity} {r.unit}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            cfg.class
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
