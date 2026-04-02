import { createClient } from "@/lib/db/client";

const supabase = createClient();

export interface StaffMemberRow {
  id: string;
  hotel_id: string;
  full_name: string;
  role: string;
  contract_type: string;
  hourly_cost: number | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffShiftRow {
  id: string;
  hotel_id: string;
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_min: number;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffInput {
  full_name: string;
  role: string;
  contract_type?: string;
  hourly_cost?: number;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface CreateShiftInput {
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_min?: number;
  status?: string;
  notes?: string;
}

export const staffingService = {
  // --- Staff Members ---
  async listStaff(hotelId: string): Promise<StaffMemberRow[]> {
    const { data, error } = await supabase
      .from("staff_members")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("full_name");
    if (error) throw error;
    return data ?? [];
  },

  async createStaff(
    hotelId: string,
    input: CreateStaffInput
  ): Promise<StaffMemberRow> {
    const { data, error } = await supabase
      .from("staff_members")
      .insert({ hotel_id: hotelId, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStaff(
    id: string,
    input: Partial<CreateStaffInput>
  ): Promise<StaffMemberRow> {
    const { data, error } = await supabase
      .from("staff_members")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- Shifts ---
  async listShifts(
    hotelId: string,
    startDate: string,
    endDate: string
  ): Promise<StaffShiftRow[]> {
    const { data, error } = await supabase
      .from("staff_shifts")
      .select("*")
      .eq("hotel_id", hotelId)
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)
      .order("shift_date")
      .order("start_time");
    if (error) throw error;
    return data ?? [];
  },

  async createShift(
    hotelId: string,
    input: CreateShiftInput
  ): Promise<StaffShiftRow> {
    const { data, error } = await supabase
      .from("staff_shifts")
      .insert({ hotel_id: hotelId, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateShiftStatus(
    id: string,
    status: string
  ): Promise<StaffShiftRow> {
    const { data, error } = await supabase
      .from("staff_shifts")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteShift(id: string): Promise<void> {
    const { error } = await supabase
      .from("staff_shifts")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
