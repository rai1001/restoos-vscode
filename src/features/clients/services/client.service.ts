import { createClient } from "@/lib/db/client";
import type { Client, CreateClientInput } from "../schemas/client.schema";

const supabase = createClient();

export const clientService = {
  async listClients(hotelId: string): Promise<Client[]> {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("name");
    if (error) throw error;
    return data ?? [];
  },

  async createClient(hotelId: string, input: CreateClientInput) {
    const { data, error } = await supabase
      .from("clients")
      .insert({ hotel_id: hotelId, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
