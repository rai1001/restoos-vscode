import { createClient } from "@/lib/db/client";

const supabase = createClient();

export interface ReservationRow {
  id: string;
  hotel_id: string;
  client_id: string | null;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_min: number;
  status: string;
  source: string;
  is_vip: boolean;
  is_group: boolean;
  notes: string | null;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReservationInput {
  contact_name: string;
  contact_phone?: string;
  contact_email?: string;
  client_id?: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_min?: number;
  status?: string;
  source?: string;
  is_vip?: boolean;
  is_group?: boolean;
  notes?: string;
  internal_notes?: string;
}

export const reservationService = {
  async list(hotelId: string): Promise<ReservationRow[]> {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("reservation_date", { ascending: true })
      .order("reservation_time", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async listByDateRange(
    hotelId: string,
    startDate: string,
    endDate: string
  ): Promise<ReservationRow[]> {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("hotel_id", hotelId)
      .gte("reservation_date", startDate)
      .lte("reservation_date", endDate)
      .order("reservation_date")
      .order("reservation_time");
    if (error) throw error;
    return data ?? [];
  },

  async listByMonth(
    hotelId: string,
    year: number,
    month: number
  ): Promise<ReservationRow[]> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return this.listByDateRange(hotelId, startDate, endDate);
  },

  async getById(id: string): Promise<ReservationRow> {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(
    hotelId: string,
    input: CreateReservationInput
  ): Promise<ReservationRow> {
    const { data, error } = await supabase
      .from("reservations")
      .insert({ hotel_id: hotelId, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    input: Partial<CreateReservationInput>
  ): Promise<ReservationRow> {
    const { data, error } = await supabase
      .from("reservations")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string): Promise<ReservationRow> {
    return this.update(id, { status });
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
