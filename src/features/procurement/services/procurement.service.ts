import { createClient } from "@/lib/db/client";
import type {
  PurchaseRequest,
  PurchaseRequestLine,
  PurchaseOrder,
  PurchaseOrderLine,
  GoodsReceipt,
  CreateOrderLineInput,
} from "../schemas/procurement.schema";

const supabase = createClient();

export const procurementService = {
  // --- Purchase Requests ---
  async listRequests(hotelId: string): Promise<PurchaseRequest[]> {
    const { data, error } = await supabase
      .from("purchase_requests")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  },

  async createRequest(hotelId: string, notes?: string) {
    const { data, error } = await supabase.rpc("create_purchase_request", {
      p_hotel_id: hotelId,
      p_notes: notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  async approveRequest(hotelId: string, requestId: string) {
    const { data, error } = await supabase.rpc("approve_purchase_request", {
      p_hotel_id: hotelId,
      p_request_id: requestId,
    });
    if (error) throw error;
    return data;
  },

  async addRequestLine(hotelId: string, requestId: string, productId: string, quantity: number, unitId?: string) {
    const { data, error } = await supabase
      .from("purchase_request_lines")
      .insert({
        request_id: requestId,
        hotel_id: hotelId,
        product_id: productId,
        unit_id: unitId ?? null,
        quantity_requested: quantity,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getRequestLines(requestId: string): Promise<PurchaseRequestLine[]> {
    const { data, error } = await supabase
      .from("purchase_request_lines")
      .select("*")
      .eq("request_id", requestId)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },

  // --- Purchase Orders ---
  async listOrders(hotelId: string): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  },

  async getOrder(id: string): Promise<PurchaseOrder & { supplier_name?: string }> {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(name)")
      .eq("id", id)
      .single();
    if (error) throw error;
    const row = data as Record<string, unknown>;
    return {
      ...data,
      supplier_name: (row.suppliers as { name: string } | null)?.name ?? undefined,
    };
  },

  async createOrder(hotelId: string, supplierId: string, expectedDelivery?: string, notes?: string) {
    const { data, error } = await supabase.rpc("generate_purchase_order", {
      p_hotel_id: hotelId,
      p_supplier_id: supplierId,
      p_expected_delivery: expectedDelivery ?? null,
      p_notes: notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  async sendOrder(hotelId: string, orderId: string) {
    const { data, error } = await supabase.rpc("send_purchase_order", {
      p_hotel_id: hotelId,
      p_order_id: orderId,
    });
    if (error) throw error;
    return data;
  },

  async addOrderLine(hotelId: string, orderId: string, input: CreateOrderLineInput) {
    const { data, error } = await supabase
      .from("purchase_order_lines")
      .insert({
        order_id: orderId,
        hotel_id: hotelId,
        product_id: input.product_id,
        unit_id: input.unit_id ?? null,
        quantity_ordered: input.quantity_ordered,
        unit_price: input.unit_price,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getOrderLines(orderId: string): Promise<(PurchaseOrderLine & { product_name?: string })[]> {
    const { data, error } = await supabase
      .from("purchase_order_lines")
      .select("*, products(name)")
      .eq("order_id", orderId)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      product_name: (row.products as { name: string } | null)?.name ?? undefined,
    })) as (PurchaseOrderLine & { product_name?: string })[];
  },

  async receiveGoods(hotelId: string, orderId: string, lines: Array<{
    order_line_id: string;
    quantity_received: number;
    unit_cost: number;
    expiry_date?: string;
    lot_number?: string;
    incident_type?: string;
    incident_notes?: string;
  }>, notes?: string) {
    const { data, error } = await supabase.rpc("receive_goods", {
      p_hotel_id: hotelId,
      p_order_id: orderId,
      p_lines: JSON.stringify(lines),
      p_notes: notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  async listReceipts(hotelId: string, orderId?: string): Promise<GoodsReceipt[]> {
    let query = supabase
      .from("goods_receipts")
      .select("*")
      .eq("hotel_id", hotelId);
    if (orderId) query = query.eq("order_id", orderId);
    const { data, error } = await query.order("received_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data ?? [];
  },
};
