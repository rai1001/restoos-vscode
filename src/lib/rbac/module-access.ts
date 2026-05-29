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
  { href: "/settings/restaurant", roles: ["superadmin", "direction", "admin"] },

  // Admin only
  { href: "/onboarding", roles: ["superadmin", "direction", "admin"] },
  { href: "/admin/tickets", roles: ["superadmin", "admin"] },
  { href: "/admin/setup-status", roles: ["superadmin", "admin"] },
  { href: "/admin/audit-log", roles: ["superadmin", "admin"] },

  // Multi-local: management only (RO-APPSEC-213)
  { href: "/multi-local", roles: ["superadmin", "direction", "admin"] },

  // Everyone: tickets propios
  { href: "/my-tickets", roles: ["superadmin", "direction", "admin", "head_chef", "cook", "procurement", "commercial", "room", "reception"] },
]

/**
 * Find the most specific module whose href is a path-segment prefix of the
 * input. RO-APPSEC-RBAC-001: the previous implementation used plain
 * `href.startsWith(m.href)`, which matched the root rule `{ href: "/" }` for
 * every URL (including `/admin/*`) and let any role listed under "/" reach
 * admin-only modules. We now:
 *   1. Match only at path-segment boundaries ("/admin" matches "/admin/x"
 *      but not "/administration").
 *   2. Pick the longest matching prefix (most specific module).
 */
function matchModule(href: string): ModuleAccess | undefined {
  let best: ModuleAccess | undefined
  for (const m of MODULE_ACCESS) {
    const prefix = m.href
    const matches =
      href === prefix ||
      (prefix === "/" ? true : href.startsWith(prefix + "/"))
    if (!matches) continue
    if (!best || prefix.length > best.href.length) best = m
  }
  return best
}

/**
 * Check if a role can access a given module/path.
 */
export function canAccessModule(role: Role, href: string): boolean {
  const matchedModule = matchModule(href)
  if (!matchedModule) return true // if not in the list, allow by default
  return matchedModule.roles.includes(role)
}

/**
 * Check if a role can edit (vs view-only) in a module.
 */
export function canEditModule(role: Role, href: string): boolean {
  const matchedModule = matchModule(href)
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
