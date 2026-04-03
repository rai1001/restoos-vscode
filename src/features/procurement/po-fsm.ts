// ── PO Status: supports both DB (English) and legacy mock (Spanish) values ──

export type POStatus =
  // DB states (English)
  | "draft"
  | "sent"
  | "confirmed_by_supplier"
  | "partially_received"
  | "received"
  | "cancelled"
  // Legacy mock states (Spanish)
  | "borrador"
  | "enviada"
  | "recibida"
  | "cancelada"

// ── Normalized visual status (what the user sees) ───────────────────────────

export type POVisualStatus = "borrador" | "compartido" | "confirmado" | "recibido" | "cancelado"

const STATUS_TO_VISUAL: Record<string, POVisualStatus> = {
  // DB English
  draft: "borrador",
  pending_approval: "borrador",
  approved: "borrador",
  sent: "compartido",
  confirmed_by_supplier: "confirmado",
  partially_received: "confirmado",
  received: "recibido",
  cancelled: "cancelado",
  // Legacy Spanish
  borrador: "borrador",
  enviada: "compartido",
  recibida: "recibido",
  cancelada: "cancelado",
}

export function getVisualStatus(status: string): POVisualStatus {
  return STATUS_TO_VISUAL[status] ?? "borrador"
}

// ── Visual status config (follows DESIGN.md: color = alert only) ────────────

export const PO_VISUAL_CONFIG: Record<POVisualStatus, { label: string; badge: string; step: number }> = {
  borrador:   { label: "Borrador",   badge: "bg-[rgba(255,255,255,0.03)] text-[#8A8078]", step: 0 },
  compartido: { label: "Compartido", badge: "bg-primary/15 text-primary", step: 1 },
  confirmado: { label: "Confirmado", badge: "bg-[rgba(255,255,255,0.03)] text-[#C8C2BF]", step: 2 },
  recibido:   { label: "Recibido",   badge: "bg-emerald-500/10 text-emerald-500", step: 3 },
  cancelado:  { label: "Cancelado",  badge: "bg-red-500/10 text-red-400", step: -1 },
}

// ── Stepper steps (for the visual progress indicator) ───────────────────────

export const PO_STEPS: { key: POVisualStatus; label: string }[] = [
  { key: "borrador", label: "Borrador" },
  { key: "compartido", label: "Compartido" },
  { key: "confirmado", label: "Confirmado" },
  { key: "recibido", label: "Recibido" },
]

// ── Backward compat: PO_STATUS_CONFIG maps raw status → badge ───────────────

export const PO_STATUS_CONFIG: Record<string, { label: string; badge: string }> = Object.fromEntries(
  Object.entries(STATUS_TO_VISUAL).map(([raw, visual]) => [
    raw,
    { label: PO_VISUAL_CONFIG[visual].label, badge: PO_VISUAL_CONFIG[visual].badge },
  ])
)

// ── Transitions ─────────────────────────────────────────────────────────────

export interface POTransition {
  label: string
  description: string
  variant: "default" | "destructive" | "outline"
}

// Transitions work on both Spanish and English status values
const TRANSITIONS: Record<string, Partial<Record<string, POTransition>>> = {
  // Spanish (mock)
  borrador: {
    enviada: {
      label: "Enviar al proveedor",
      description: "La orden se marca como enviada al proveedor",
      variant: "default",
    },
    cancelada: {
      label: "Cancelar orden",
      description: "La orden en borrador se cancela",
      variant: "destructive",
    },
  },
  enviada: {
    recibida: {
      label: "Registrar recepción",
      description: "Se confirma la recepción de la mercancía",
      variant: "default",
    },
    cancelada: {
      label: "Cancelar orden",
      description: "La orden enviada se cancela",
      variant: "destructive",
    },
  },
  recibida: {},
  cancelada: {},
  // English (DB)
  draft: {
    sent: {
      label: "Enviar al proveedor",
      description: "La orden se marca como enviada al proveedor",
      variant: "default",
    },
    cancelled: {
      label: "Cancelar orden",
      description: "La orden en borrador se cancela",
      variant: "destructive",
    },
  },
  approved: {
    sent: {
      label: "Enviar al proveedor",
      description: "La orden aprobada se envia al proveedor",
      variant: "default",
    },
    cancelled: {
      label: "Cancelar orden",
      description: "La orden aprobada se cancela",
      variant: "destructive",
    },
  },
  sent: {
    confirmed_by_supplier: {
      label: "Confirmar por proveedor",
      description: "El proveedor ha confirmado el pedido",
      variant: "default",
    },
    received: {
      label: "Registrar recepción",
      description: "Se confirma la recepción de la mercancía",
      variant: "default",
    },
    cancelled: {
      label: "Cancelar orden",
      description: "La orden enviada se cancela",
      variant: "destructive",
    },
  },
  confirmed_by_supplier: {
    received: {
      label: "Registrar recepción",
      description: "Se confirma la recepción de la mercancía",
      variant: "default",
    },
    cancelled: {
      label: "Cancelar orden",
      description: "La orden confirmada se cancela",
      variant: "destructive",
    },
  },
  partially_received: {
    received: {
      label: "Recepción completa",
      description: "Se confirma la recepción total de la mercancía",
      variant: "default",
    },
  },
  received: {},
  cancelled: {},
}

export function getPOValidTransitions(status: POStatus): Array<[POStatus, POTransition]> {
  return Object.entries(TRANSITIONS[status] ?? {}) as Array<[POStatus, POTransition]>
}

export function isPOStatus(value: string): value is POStatus {
  return value in STATUS_TO_VISUAL
}
