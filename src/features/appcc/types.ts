export type CheckType =
  | "temperatura"       // Temperature measurement
  | "limpieza"          // Cleaning/disinfection
  | "recepcion"         // Supplier delivery check
  | "higiene_personal"  // Personal hygiene
  | "control_plagas"    // Pest control
  | "aceite_fritura"    // Frying oil check
  | "otro"              // Other

export type CheckStatus = "ok" | "alerta" | "critico"

export type CheckFrequency = "diario" | "semanal" | "mensual" | "por_recepcion"

export interface CheckTemplate {
  id: string
  hotel_id: string
  name: string
  check_type: CheckType
  frequency: CheckFrequency
  description: string | null
  min_value: number | null   // e.g. min temp
  max_value: number | null   // e.g. max temp
  unit: string | null        // e.g. "°C", "pH", "ppm"
  is_active: boolean
  created_at: string
}

export interface CheckRecord {
  id: string
  hotel_id: string
  template_id: string
  template?: CheckTemplate
  checked_by: string           // user id
  checked_by_name?: string
  recorded_at: string          // ISO datetime
  value: number | null         // measured value
  status: CheckStatus
  notes: string | null
  corrective_action: string | null
  created_at: string
}

export interface DailyCheckSummary {
  date: string
  total: number
  ok: number
  alerts: number
  critical: number
  completion_pct: number
  pending_templates: CheckTemplate[]
}
