// TODO: Replace with Supabase queries once staffing tables are migrated
import type { StaffMember, EventShift, EventStaffSummary } from "./types"

export const MOCK_STAFF: StaffMember[] = [
  { id: "s1", hotel_id: "h1", name: "Carlos García", role: "chef_ejecutivo", email: "carlos@hotel.com", phone: "+34 600 111 222", hourly_rate: 28, is_active: true, created_at: "2024-01-01T00:00:00" },
  { id: "s2", hotel_id: "h1", name: "Ana Martínez", role: "sous_chef", email: "ana@hotel.com", phone: "+34 600 222 333", hourly_rate: 22, is_active: true, created_at: "2024-01-01T00:00:00" },
  { id: "s3", hotel_id: "h1", name: "Luis Fernández", role: "cocinero", email: "luis@hotel.com", phone: null, hourly_rate: 16, is_active: true, created_at: "2024-01-01T00:00:00" },
  { id: "s4", hotel_id: "h1", name: "María López", role: "cocinero", email: null, phone: "+34 600 333 444", hourly_rate: 16, is_active: true, created_at: "2024-01-01T00:00:00" },
  { id: "s5", hotel_id: "h1", name: "Pedro Sánchez", role: "pastelero", email: "pedro@hotel.com", phone: null, hourly_rate: 18, is_active: true, created_at: "2024-01-01T00:00:00" },
  { id: "s6", hotel_id: "h1", name: "Laura Díaz", role: "maitre", email: "laura@hotel.com", phone: "+34 600 444 555", hourly_rate: 20, is_active: true, created_at: "2024-01-01T00:00:00" },
  { id: "s7", hotel_id: "h1", name: "Jorge Ruiz", role: "camarero", email: null, phone: null, hourly_rate: 14, is_active: true, created_at: "2024-01-01T00:00:00" },
  { id: "s8", hotel_id: "h1", name: "Sofía Moreno", role: "camarero", email: "sofia@hotel.com", phone: null, hourly_rate: 14, is_active: true, created_at: "2024-01-01T00:00:00" },
  { id: "s9", hotel_id: "h1", name: "Diego Torres", role: "barman", email: "diego@hotel.com", phone: "+34 600 555 666", hourly_rate: 16, is_active: true, created_at: "2024-01-01T00:00:00" },
  { id: "s10", hotel_id: "h1", name: "Elena Jiménez", role: "sommelier", email: "elena@hotel.com", phone: null, hourly_rate: 20, is_active: true, created_at: "2024-01-01T00:00:00" },
  { id: "s11", hotel_id: "h1", name: "Raúl Morales", role: "ayudante_cocina", email: null, phone: null, hourly_rate: 12, is_active: true, created_at: "2024-01-01T00:00:00" },
  { id: "s12", hotel_id: "h1", name: "Isabel Castro", role: "auxiliar", email: null, phone: null, hourly_rate: 11, is_active: false, created_at: "2024-01-01T00:00:00" },
]

// Generate dates relative to today
function daysFromNow(n: number, hour = 14, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const MOCK_EVENTS_FOR_STAFFING = [
  { id: "ev1", name: "Cena de Gala – Boda Rodríguez", date: daysFromNow(3).slice(0, 10), guests: 120 },
  { id: "ev2", name: "Congreso Empresarial – Catering", date: daysFromNow(7).slice(0, 10), guests: 80 },
  { id: "ev3", name: "Cumpleaños VIP – Suite Presidencial", date: daysFromNow(14).slice(0, 10), guests: 30 },
]

export const MOCK_SHIFTS: EventShift[] = [
  // Event 1 — Boda
  { id: "sh1", hotel_id: "h1", event_id: "ev1", event_name: "Cena de Gala – Boda Rodríguez", staff_id: "s1", staff: MOCK_STAFF[0], role: "chef_ejecutivo", shift_start: daysFromNow(3, 12), shift_end: daysFromNow(3, 23), status: "confirmado", notes: "Menú degustación 7 platos", created_at: new Date().toISOString() },
  { id: "sh2", hotel_id: "h1", event_id: "ev1", event_name: "Cena de Gala – Boda Rodríguez", staff_id: "s2", staff: MOCK_STAFF[1], role: "sous_chef", shift_start: daysFromNow(3, 12), shift_end: daysFromNow(3, 23), status: "confirmado", notes: null, created_at: new Date().toISOString() },
  { id: "sh3", hotel_id: "h1", event_id: "ev1", event_name: "Cena de Gala – Boda Rodríguez", staff_id: "s3", staff: MOCK_STAFF[2], role: "cocinero", shift_start: daysFromNow(3, 13), shift_end: daysFromNow(3, 22), status: "confirmado", notes: null, created_at: new Date().toISOString() },
  { id: "sh4", hotel_id: "h1", event_id: "ev1", event_name: "Cena de Gala – Boda Rodríguez", staff_id: "s5", staff: MOCK_STAFF[4], role: "pastelero", shift_start: daysFromNow(3, 10), shift_end: daysFromNow(3, 20), status: "pendiente", notes: "Preparar tarta nupcial", created_at: new Date().toISOString() },
  { id: "sh5", hotel_id: "h1", event_id: "ev1", event_name: "Cena de Gala – Boda Rodríguez", staff_id: "s6", staff: MOCK_STAFF[5], role: "maitre", shift_start: daysFromNow(3, 16), shift_end: daysFromNow(3, 24), status: "confirmado", notes: null, created_at: new Date().toISOString() },
  { id: "sh6", hotel_id: "h1", event_id: "ev1", event_name: "Cena de Gala – Boda Rodríguez", staff_id: "s7", staff: MOCK_STAFF[6], role: "camarero", shift_start: daysFromNow(3, 17), shift_end: daysFromNow(3, 24), status: "confirmado", notes: null, created_at: new Date().toISOString() },
  { id: "sh7", hotel_id: "h1", event_id: "ev1", event_name: "Cena de Gala – Boda Rodríguez", staff_id: "s8", staff: MOCK_STAFF[7], role: "camarero", shift_start: daysFromNow(3, 17), shift_end: daysFromNow(3, 24), status: "pendiente", notes: null, created_at: new Date().toISOString() },
  { id: "sh8", hotel_id: "h1", event_id: "ev1", event_name: "Cena de Gala – Boda Rodríguez", staff_id: "s10", staff: MOCK_STAFF[9], role: "sommelier", shift_start: daysFromNow(3, 18), shift_end: daysFromNow(3, 24), status: "confirmado", notes: "Maridaje vinos seleccionados", created_at: new Date().toISOString() },

  // Event 2 — Congreso
  { id: "sh9", hotel_id: "h1", event_id: "ev2", event_name: "Congreso Empresarial – Catering", staff_id: "s2", staff: MOCK_STAFF[1], role: "sous_chef", shift_start: daysFromNow(7, 8), shift_end: daysFromNow(7, 17), status: "confirmado", notes: null, created_at: new Date().toISOString() },
  { id: "sh10", hotel_id: "h1", event_id: "ev2", event_name: "Congreso Empresarial – Catering", staff_id: "s4", staff: MOCK_STAFF[3], role: "cocinero", shift_start: daysFromNow(7, 8), shift_end: daysFromNow(7, 17), status: "pendiente", notes: null, created_at: new Date().toISOString() },
  { id: "sh11", hotel_id: "h1", event_id: "ev2", event_name: "Congreso Empresarial – Catering", staff_id: "s11", staff: MOCK_STAFF[10], role: "ayudante_cocina", shift_start: daysFromNow(7, 7), shift_end: daysFromNow(7, 16), status: "pendiente", notes: null, created_at: new Date().toISOString() },
  { id: "sh12", hotel_id: "h1", event_id: "ev2", event_name: "Congreso Empresarial – Catering", staff_id: "s9", staff: MOCK_STAFF[8], role: "barman", shift_start: daysFromNow(7, 10), shift_end: daysFromNow(7, 18), status: "confirmado", notes: null, created_at: new Date().toISOString() },

  // Event 3 — VIP
  { id: "sh13", hotel_id: "h1", event_id: "ev3", event_name: "Cumpleaños VIP – Suite Presidencial", staff_id: "s1", staff: MOCK_STAFF[0], role: "chef_ejecutivo", shift_start: daysFromNow(14, 14), shift_end: daysFromNow(14, 22), status: "pendiente", notes: "Menú personalizado cliente VIP", created_at: new Date().toISOString() },
  { id: "sh14", hotel_id: "h1", event_id: "ev3", event_name: "Cumpleaños VIP – Suite Presidencial", staff_id: "s6", staff: MOCK_STAFF[5], role: "maitre", shift_start: daysFromNow(14, 16), shift_end: daysFromNow(14, 23), status: "pendiente", notes: null, created_at: new Date().toISOString() },
]

export function getShiftsForEvent(eventId: string): EventShift[] {
  return MOCK_SHIFTS.filter(s => s.event_id === eventId)
}

export function getEventSummaries(): EventStaffSummary[] {
  return MOCK_EVENTS_FOR_STAFFING.map(ev => {
    const shifts = getShiftsForEvent(ev.id)
    const confirmed = shifts.filter(s => s.status === "confirmado").length
    const pending = shifts.filter(s => s.status === "pendiente").length
    const roles = [...new Set(shifts.map(s => s.role))]
    const cost = shifts.reduce((acc, s) => {
      if (!s.staff?.hourly_rate) return acc
      const start = new Date(s.shift_start)
      const end = new Date(s.shift_end)
      const hours = (end.getTime() - start.getTime()) / 3600000
      return acc + hours * s.staff.hourly_rate
    }, 0)
    return {
      event_id: ev.id,
      event_name: ev.name,
      event_date: ev.date,
      total_shifts: shifts.length,
      confirmed,
      pending,
      roles_covered: roles,
      estimated_cost: Math.round(cost),
    }
  })
}
