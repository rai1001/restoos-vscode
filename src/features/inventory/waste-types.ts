export type WasteReason =
  | "caducidad"      // expired
  | "deterioro"      // deteriorated
  | "accidente"      // accidental spill/drop
  | "exceso_coccion" // overcooked
  | "devolucion"     // returned to supplier
  | "otro"           // other

export const WASTE_REASON_LABELS: Record<WasteReason, string> = {
  caducidad: "Caducidad",
  deterioro: "Deterioro / mal estado",
  accidente: "Accidente",
  exceso_coccion: "Exceso de cocción",
  devolucion: "Devolución a proveedor",
  otro: "Otro motivo",
}

export interface WasteRecord {
  id: string
  hotel_id: string
  product_id: string
  product_name: string
  quantity: number
  unit: string
  reason: WasteReason
  cost_per_unit: number
  total_cost: number
  notes: string | null
  recorded_by: string
  recorded_at: string
}

export interface WasteStockReservation {
  id: string
  hotel_id: string
  event_id: string
  event_name: string
  event_date: string
  product_id: string
  product_name: string
  reserved_quantity: number
  unit: string
  status: "pendiente" | "confirmada" | "liberada"
}
