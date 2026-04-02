export type CheckType =
  | "temperatura"
  | "limpieza"
  | "recepcion"
  | "higiene_personal"
  | "control_plagas"
  | "aceite_fritura"
  | "otro"

export type CheckStatus = "ok" | "alerta" | "critico"

export type CheckFrequency = "diario" | "semanal" | "mensual" | "por_recepcion"

export type ClosureStatus = "open" | "completed" | "validated" | "reopened"

export type IncidentSeverity = "low" | "medium" | "high" | "critical"

export type IncidentStatus = "open" | "in_progress" | "resolved" | "closed"

export interface CheckTemplate {
  id: string
  hotel_id: string
  name: string
  check_type: CheckType
  frequency: CheckFrequency
  description: string | null
  min_value: number | null
  max_value: number | null
  unit: string | null
  is_active: boolean
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CheckRecord {
  id: string
  hotel_id: string
  template_id: string
  template?: CheckTemplate
  check_date: string
  value: number | null
  status: CheckStatus
  notes: string | null
  corrective_action: string | null
  checked_by: string
  checked_by_name: string
  recorded_at: string
  created_at: string
}

export interface DailyClosure {
  id: string
  hotel_id: string
  closure_date: string
  status: ClosureStatus
  total_checks: number
  ok_count: number
  alert_count: number
  critical_count: number
  completion_pct: number
  incidents_open: number
  validated_by: string | null
  validated_by_name: string | null
  validated_at: string | null
  validation_notes: string | null
  created_at: string
  updated_at: string
}

export interface AppccIncident {
  id: string
  hotel_id: string
  record_id: string | null
  incident_date: string
  title: string
  description: string | null
  severity: IncidentSeverity
  status: IncidentStatus
  corrective_action: string | null
  resolved_by: string | null
  resolved_by_name: string | null
  resolved_at: string | null
  reported_by: string
  reported_by_name: string
  created_at: string
  updated_at: string
}

export interface DailyCheckSummary {
  closure_date: string
  status: ClosureStatus
  total_checks: number
  ok_count: number
  alert_count: number
  critical_count: number
  completion_pct: number
  incidents_open: number
  validated_by_name: string | null
  validated_at: string | null
}

export interface CreateCheckRecordInput {
  template_id: string
  check_date: string
  value?: number | null
  notes?: string | null
  corrective_action?: string | null
}

export interface CreateTemplateInput {
  name: string
  check_type: CheckType
  frequency: CheckFrequency
  description?: string | null
  min_value?: number | null
  max_value?: number | null
  unit?: string | null
  sort_order?: number
}

export interface CreateIncidentInput {
  incident_date: string
  title: string
  description?: string | null
  severity: IncidentSeverity
  corrective_action?: string | null
  record_id?: string | null
}
