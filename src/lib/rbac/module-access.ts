import { type Role } from "@/contracts/enums"

/**
 * Module access matrix: which roles can see/access each module.
 * Used to filter sidebar items and guard pages.
 */

export interface ModuleAccess {
  href: string
  roles: readonly Role[]
  canEdit?: readonly Role[] // subset that can edit (vs view-only)
}

export const MODULE_ACCESS: ModuleAccess[] = [
  // Everyone
  { href: "/kitchen-mode", roles: ["superadmin", "direction", "admin", "head_chef", "cook", "procurement"] },
  { href: "/", roles: ["superadmin", "direction", "admin", "head_chef", "cook", "procurement", "commercial"] },

  // Operaciones cocina
  { href: "/recipes", roles: ["superadmin", "direction", "admin", "head_chef", "cook"], canEdit: ["superadmin", "direction", "admin", "head_chef"] },
  { href: "/menus", roles: ["superadmin", "direction", "admin", "head_chef"], canEdit: ["superadmin", "direction", "admin", "head_chef"] },
  { href: "/menu-engineering", roles: ["superadmin", "direction", "admin", "head_chef"] },
  { href: "/escandallo", roles: ["superadmin", "direction", "admin", "head_chef"] },

  // Catálogo e inventario
  { href: "/catalog/products", roles: ["superadmin", "direction", "admin", "head_chef", "procurement"] },
  { href: "/procurement/orders", roles: ["superadmin", "direction", "admin", "head_chef", "procurement"], canEdit: ["superadmin", "direction", "admin", "procurement"] },
  { href: "/inventory", roles: ["superadmin", "direction", "admin", "head_chef", "cook", "procurement"] },

  // Sala
  { href: "/reservations", roles: ["superadmin", "direction", "admin", "commercial", "room", "reception"] },
  { href: "/clients", roles: ["superadmin", "direction", "admin", "commercial"] },

  // Cumplimiento
  { href: "/appcc", roles: ["superadmin", "direction", "admin", "head_chef", "cook"] },
  { href: "/labeling", roles: ["superadmin", "direction", "admin", "head_chef", "cook"] },

  // Gestión
  { href: "/reports", roles: ["superadmin", "direction", "admin"] },
  { href: "/staffing", roles: ["superadmin", "direction", "admin"] },
  { href: "/settings/hotel", roles: ["superadmin", "direction", "admin"] },

  // Admin only
  { href: "/onboarding", roles: ["superadmin", "direction", "admin"] },
  { href: "/admin/tickets", roles: ["superadmin", "admin"] },
  { href: "/admin/setup-status", roles: ["superadmin", "admin"] },
  { href: "/admin/audit-log", roles: ["superadmin", "admin"] },

  // Everyone: tickets propios
  { href: "/my-tickets", roles: ["superadmin", "direction", "admin", "head_chef", "cook", "procurement", "commercial", "room", "reception"] },
]

/**
 * Check if a role can access a given module/path.
 */
export function canAccessModule(role: Role, href: string): boolean {
  const matchedModule = MODULE_ACCESS.find(m => href.startsWith(m.href))
  if (!matchedModule) return true // if not in the list, allow by default
  return matchedModule.roles.includes(role)
}

/**
 * Check if a role can edit (vs view-only) in a module.
 */
export function canEditModule(role: Role, href: string): boolean {
  const matchedModule = MODULE_ACCESS.find(m => href.startsWith(m.href))
  if (!matchedModule) return true
  if (!matchedModule.canEdit) return matchedModule.roles.includes(role) // if no canEdit, all viewers can edit
  return matchedModule.canEdit.includes(role)
}

/**
 * Filter sidebar items based on role.
 */
export function filterSidebarByRole(
  items: Array<{ href: string; name: string; icon: unknown }>,
  role: Role
): typeof items {
  return items.filter(item => canAccessModule(role, item.href))
}

/**
 * Role display names in Spanish.
 */
export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Superadmin",
  direction: "Dirección",
  commercial: "Comercial",
  head_chef: "Jefe de cocina",
  cook: "Cocinero",
  procurement: "Compras",
  room: "Sala",
  reception: "Recepción",
  admin: "Administrador",
}
