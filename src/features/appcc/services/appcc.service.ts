import { createClient } from "@/lib/db/client";
import type {
  CheckTemplate,
  CheckRecord,
  DailyClosure,
  AppccIncident,
  CreateTemplateInput,
  CreateIncidentInput,
} from "../types";

const supabase = createClient();

export const appccService = {
  // ─── Templates ──────────────────────────────────────────────

  async listTemplates(hotelId: string): Promise<CheckTemplate[]> {
    const { data, error } = await supabase
      .from("check_templates")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async createTemplate(hotelId: string, input: CreateTemplateInput): Promise<CheckTemplate> {
    const { data, error } = await supabase
      .from("check_templates")
      .insert({
        hotel_id: hotelId,
        name: input.name,
        check_type: input.check_type,
        frequency: input.frequency,
        description: input.description ?? null,
        min_value: input.min_value ?? null,
        max_value: input.max_value ?? null,
        unit: input.unit ?? null,
        sort_order: input.sort_order ?? 0,
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTemplate(
    hotelId: string,
    templateId: string,
    updates: Partial<CreateTemplateInput & { is_active: boolean }>
  ): Promise<CheckTemplate> {
    const { data, error } = await supabase
      .from("check_templates")
      .update(updates)
      .eq("id", templateId)
      .eq("hotel_id", hotelId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ─── Records ────────────────────────────────────────────────

  async listRecords(hotelId: string, date: string): Promise<CheckRecord[]> {
    const { data, error } = await supabase
      .from("check_records")
      .select("*, template:check_templates(*)")
      .eq("hotel_id", hotelId)
      .eq("check_date", date)
      .order("recorded_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async createRecord(hotelId: string, input: {
    template_id: string;
    check_date: string;
    value?: number | null;
    notes?: string | null;
    corrective_action?: string | null;
  }) {
    const { data, error } = await supabase.rpc("create_check_record", {
      p_hotel_id: hotelId,
      p_template_id: input.template_id,
      p_check_date: input.check_date,
      p_value: input.value ?? null,
      p_notes: input.notes ?? null,
      p_corrective_action: input.corrective_action ?? null,
    });
    if (error) throw error;
    return data;
  },

  // ─── Daily Closures ─────────────────────────────────────────

  async getDailyClosure(hotelId: string, date: string): Promise<DailyClosure | null> {
    const { data, error } = await supabase
      .from("appcc_daily_closures")
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("closure_date", date)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getDailySummaries(hotelId: string, daysBack = 7) {
    const { data, error } = await supabase.rpc("get_appcc_daily_summaries", {
      p_hotel_id: hotelId,
      p_days_back: daysBack,
    });
    if (error) throw error;
    return data ?? [];
  },

  async validateDayClosure(hotelId: string, date: string, notes?: string) {
    const { data, error } = await supabase.rpc("validate_daily_closure", {
      p_hotel_id: hotelId,
      p_date: date,
      p_notes: notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  // ─── Incidents ──────────────────────────────────────────────

  async listIncidents(hotelId: string, filters?: {
    status?: string;
    date?: string;
  }): Promise<AppccIncident[]> {
    let query = supabase
      .from("appcc_incidents")
      .select("*")
      .eq("hotel_id", hotelId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.date) query = query.eq("incident_date", filters.date);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  },

  async createIncident(hotelId: string, input: CreateIncidentInput): Promise<AppccIncident> {
    const user = (await supabase.auth.getUser()).data.user;
    const profile = user ? await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single() : null;

    const { data, error } = await supabase
      .from("appcc_incidents")
      .insert({
        hotel_id: hotelId,
        record_id: input.record_id ?? null,
        incident_date: input.incident_date,
        title: input.title,
        description: input.description ?? null,
        severity: input.severity,
        corrective_action: input.corrective_action ?? null,
        reported_by: user?.id,
        reported_by_name: profile?.data?.full_name ?? "Unknown",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async resolveIncident(hotelId: string, incidentId: string, action: string, status: "resolved" | "closed" = "resolved") {
    const { data, error } = await supabase.rpc("resolve_appcc_incident", {
      p_hotel_id: hotelId,
      p_incident_id: incidentId,
      p_action: action,
      p_status: status,
    });
    if (error) throw error;
    return data;
  },
};
