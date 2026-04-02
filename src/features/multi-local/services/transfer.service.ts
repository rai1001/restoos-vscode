import { createClient } from "@/lib/db/client";

const supabase = createClient();

export interface StockTransfer {
  id: string
  tenant_id: string
  origin_hotel_id: string
  destination_hotel_id: string
  transfer_number: string
  status: "draft" | "confirmed" | "in_transit" | "received" | "cancelled"
  notes: string | null
  created_by: string | null
  confirmed_at: string | null
  received_at: string | null
  created_at: string
}

export interface TransferLine {
  id: string
  transfer_id: string
  product_name: string
  origin_product_id: string | null
  dest_product_id: string | null
  origin_lot_id: string | null
  unit: string
  quantity_sent: number
  quantity_received: number
  unit_cost: number
}

export interface CreateTransferLineInput {
  product_name: string
  origin_product_id?: string
  origin_lot_id?: string
  unit: string
  quantity: number
  unit_cost: number
}

export const transferService = {
  async listTransfers(tenantId: string): Promise<StockTransfer[]> {
    const { data, error } = await supabase
      .from("stock_transfers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  },

  async getTransferLines(transferId: string): Promise<TransferLine[]> {
    const { data, error } = await supabase
      .from("stock_transfer_lines")
      .select("*")
      .eq("transfer_id", transferId);
    if (error) throw error;
    return data ?? [];
  },

  async createTransfer(
    originHotelId: string,
    destinationHotelId: string,
    lines: CreateTransferLineInput[],
    notes?: string
  ) {
    const { data, error } = await supabase.rpc("create_stock_transfer", {
      p_origin_hotel_id: originHotelId,
      p_destination_hotel_id: destinationHotelId,
      p_lines: lines,
      p_notes: notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  async confirmTransfer(transferId: string) {
    const { data, error } = await supabase.rpc("confirm_stock_transfer", {
      p_transfer_id: transferId,
    });
    if (error) throw error;
    return data;
  },

  async receiveTransfer(transferId: string, lines?: Array<{ line_id: string; quantity_received: number; dest_product_id?: string }>) {
    const { data, error } = await supabase.rpc("receive_stock_transfer", {
      p_transfer_id: transferId,
      p_lines: lines ?? null,
    });
    if (error) throw error;
    return data;
  },
};
