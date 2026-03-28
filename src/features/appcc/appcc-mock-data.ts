// TODO: Replace with Supabase queries once APPCC tables are migrated

import type { CheckTemplate, CheckRecord } from "./types"

export const MOCK_TEMPLATES: CheckTemplate[] = [
  {
    id: "t1",
    hotel_id: "h1",
    name: "Cámara frigorífica #1",
    check_type: "temperatura",
    frequency: "diario",
    description: "Temperatura interior cámara conservación",
    min_value: 0,
    max_value: 5,
    unit: "°C",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "t2",
    hotel_id: "h1",
    name: "Cámara frigorífica #2",
    check_type: "temperatura",
    frequency: "diario",
    description: "Temperatura interior cámara de carnes",
    min_value: 0,
    max_value: 4,
    unit: "°C",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "t3",
    hotel_id: "h1",
    name: "Congelador",
    check_type: "temperatura",
    frequency: "diario",
    description: "Temperatura congelador principal",
    min_value: -25,
    max_value: -18,
    unit: "°C",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "t4",
    hotel_id: "h1",
    name: "Temperatura cocción carnes",
    check_type: "temperatura",
    frequency: "diario",
    description: "Temperatura interna de carnes cocinadas (≥65°C)",
    min_value: 65,
    max_value: null,
    unit: "°C",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "t5",
    hotel_id: "h1",
    name: "Limpieza superficies cocina",
    check_type: "limpieza",
    frequency: "diario",
    description: "Desinfección de superficies de trabajo",
    min_value: null,
    max_value: null,
    unit: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "t6",
    hotel_id: "h1",
    name: "Limpieza campana extractora",
    check_type: "limpieza",
    frequency: "semanal",
    description: "Limpieza y desengrase de campana",
    min_value: null,
    max_value: null,
    unit: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "t7",
    hotel_id: "h1",
    name: "Control recepción proveedor",
    check_type: "recepcion",
    frequency: "por_recepcion",
    description: "Verificación temperatura y estado organoléptico",
    min_value: null,
    max_value: 8,
    unit: "°C",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "t8",
    hotel_id: "h1",
    name: "Aceite de fritura",
    check_type: "aceite_fritura",
    frequency: "diario",
    description: "Control compuestos polares aceite freidora",
    min_value: null,
    max_value: 25,
    unit: "%",
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10
}

function getStatus(template: CheckTemplate, value: number): CheckRecord["status"] {
  if (template.min_value !== null && value < template.min_value) return "critico"
  if (template.max_value !== null && value > template.max_value) return "alerta"
  return "ok"
}

export function generateMockRecordsForDate(date: string): CheckRecord[] {
  const records: CheckRecord[] = []
  for (const t of MOCK_TEMPLATES) {
    if (t.unit === null) {
      // Boolean checks (limpieza, higiene_personal, etc.) — always OK in mock
      records.push({
        id: `r-${t.id}-${date}`,
        hotel_id: "h1",
        template_id: t.id,
        template: t,
        checked_by: "user1",
        checked_by_name: "Chef García",
        recorded_at: `${date}T08:30:00`,
        value: null,
        status: "ok",
        notes: null,
        corrective_action: null,
        created_at: `${date}T08:30:00`,
      })
    } else {
      const minV = t.min_value ?? 0
      const maxV = t.max_value ?? minV + 20
      const mid = (minV + maxV) / 2
      const spread = (maxV - minV) * 0.6
      const value = randomBetween(mid - spread / 2, mid + spread / 2)
      const status = getStatus(t, value)
      records.push({
        id: `r-${t.id}-${date}`,
        hotel_id: "h1",
        template_id: t.id,
        template: t,
        checked_by: "user1",
        checked_by_name: "Chef García",
        recorded_at: `${date}T08:30:00`,
        value,
        status,
        notes: status !== "ok" ? "Revisado y corregido" : null,
        corrective_action:
          status === "critico"
            ? "Avisado responsable, equipo revisado por técnico"
            : null,
        created_at: `${date}T08:30:00`,
      })
    }
  }
  return records
}
