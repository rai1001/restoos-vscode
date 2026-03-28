export type POStatus =
  | "borrador"    // draft
  | "enviada"     // sent to supplier
  | "recibida"    // goods received
  | "cancelada"   // cancelled

export interface POTransition {
  label: string
  description: string
  variant: "default" | "destructive" | "outline"
}

export const PO_VALID_TRANSITIONS: Record<POStatus, Partial<Record<POStatus, POTransition>>> = {
  borrador: {
    enviada: {
      label: "Enviar al proveedor",
      description: "La orden se marca como enviada al proveedor",
      variant: "default"
    },
    cancelada: {
      label: "Cancelar orden",
      description: "La orden en borrador se cancela",
      variant: "destructive"
    },
  },
  enviada: {
    recibida: {
      label: "Registrar recepción",
      description: "Se confirma la recepción de la mercancía",
      variant: "default"
    },
    cancelada: {
      label: "Cancelar orden",
      description: "La orden enviada se cancela",
      variant: "destructive"
    },
  },
  recibida: {},
  cancelada: {},
}

export const PO_STATUS_CONFIG: Record<POStatus, { label: string; badge: string }> = {
  borrador:  { label: "Borrador",   badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  enviada:   { label: "Enviada",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  recibida:  { label: "Recibida",   badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  cancelada: { label: "Cancelada",  badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
}

export function getPOValidTransitions(status: POStatus): Array<[POStatus, POTransition]> {
  return Object.entries(PO_VALID_TRANSITIONS[status] ?? {}) as Array<[POStatus, POTransition]>
}

export function isPOStatus(value: string): value is POStatus {
  return value === "borrador" || value === "enviada" || value === "recibida" || value === "cancelada"
}
