export type StaffRole =
  | "chef_ejecutivo"
  | "sous_chef"
  | "cocinero"
  | "ayudante_cocina"
  | "pastelero"
  | "camarero"
  | "maitre"
  | "sommelier"
  | "barman"
  | "jefe_sala"
  | "auxiliar"

export type ShiftStatus = "confirmado" | "pendiente" | "cancelado" | "completado"

export interface StaffMember {
  id: string
  hotel_id: string
  name: string
  role: StaffRole
  email: string | null
  phone: string | null
  hourly_rate: number | null
  is_active: boolean
  created_at: string
}

export interface EventShift {
  id: string
  hotel_id: string
  event_id: string
  event_name?: string
  staff_id: string
  staff?: StaffMember
  role: StaffRole
  shift_start: string   // ISO datetime
  shift_end: string     // ISO datetime
  status: ShiftStatus
  notes: string | null
  created_at: string
}

export interface EventStaffSummary {
  event_id: string
  event_name: string
  event_date: string
  total_shifts: number
  confirmed: number
  pending: number
  roles_covered: StaffRole[]
  estimated_cost: number
}

export interface StaffingRequirement {
  role: StaffRole
  quantity: number
  shift_start: string
  shift_end: string
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  chef_ejecutivo: "Chef Ejecutivo",
  sous_chef: "Sous Chef",
  cocinero: "Cocinero/a",
  ayudante_cocina: "Ayudante de Cocina",
  pastelero: "Pastelero/a",
  camarero: "Camarero/a",
  maitre: "Maître",
  sommelier: "Sommelier",
  barman: "Barman",
  jefe_sala: "Jefe/a de Sala",
  auxiliar: "Auxiliar",
}
