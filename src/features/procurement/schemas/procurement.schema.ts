import { z } from "zod";
import { PURCHASE_ORDER_STATUS, PURCHASE_REQUEST_STATUS } from "@/contracts/enums";

const prStatusValues = Object.values(PURCHASE_REQUEST_STATUS) as [string, ...string[]];
const poStatusValues = Object.values(PURCHASE_ORDER_STATUS) as [string, ...string[]];

// --- Purchase Request ---
export const PurchaseRequestSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  event_id: z.string().uuid().nullable(),
  request_number: z.string(),
  status: z.enum(prStatusValues),
  requested_by: z.string().uuid().nullable(),
  approved_by: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PurchaseRequest = z.infer<typeof PurchaseRequestSchema>;

export const PurchaseRequestLineSchema = z.object({
  id: z.string().uuid(),
  request_id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  product_id: z.string().uuid(),
  unit_id: z.string().uuid().nullable(),
  quantity_requested: z.number(),
  notes: z.string().nullable(),
  sort_order: z.number(),
  created_at: z.string(),
});
export type PurchaseRequestLine = z.infer<typeof PurchaseRequestLineSchema>;

// --- Purchase Order ---
export const PurchaseOrderSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  order_number: z.string(),
  status: z.enum(poStatusValues),
  expected_delivery_date: z.string().nullable(),
  total_amount: z.number().nullable(),
  notes: z.string().nullable(),
  created_by: z.string().uuid().nullable(),
  approved_by: z.string().uuid().nullable(),
  sent_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

export const PurchaseOrderLineSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  product_id: z.string().uuid(),
  unit_id: z.string().uuid().nullable(),
  quantity_ordered: z.number(),
  unit_price: z.number(),
  quantity_received: z.number(),
  sort_order: z.number(),
  created_at: z.string(),
});
export type PurchaseOrderLine = z.infer<typeof PurchaseOrderLineSchema>;

export const CreateOrderLineSchema = z.object({
  product_id: z.string().uuid("Producto obligatorio"),
  unit_id: z.string().uuid().optional(),
  quantity_ordered: z.number({ error: "Cantidad obligatoria" }).positive(),
  unit_price: z.number({ error: "Precio obligatorio" }).positive(),
});
export type CreateOrderLineInput = z.infer<typeof CreateOrderLineSchema>;

// --- Goods Receipt ---
export const GoodsReceiptSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  order_id: z.string().uuid(),
  receipt_number: z.string(),
  received_by: z.string().uuid().nullable(),
  received_at: z.string(),
  notes: z.string().nullable(),
  created_at: z.string(),
});
export type GoodsReceipt = z.infer<typeof GoodsReceiptSchema>;
