import { ROLE, type Role } from "@/contracts/enums";

/**
 * Permission definitions by action.
 * Each action maps to the roles that can perform it.
 */
const PERMISSIONS: Record<string, readonly Role[]> = {
  // Hotel management
  "hotel.manage": [ROLE.SUPERADMIN, ROLE.DIRECTION, ROLE.ADMIN],
  "team.manage": [ROLE.SUPERADMIN, ROLE.DIRECTION, ROLE.ADMIN],

  // Events
  "event.create": [ROLE.COMMERCIAL, ROLE.DIRECTION, ROLE.ADMIN],
  "event.confirm": [ROLE.COMMERCIAL, ROLE.DIRECTION, ROLE.ADMIN],
  "event.cancel": [ROLE.DIRECTION, ROLE.ADMIN],

  // Recipes
  "recipe.create": [ROLE.HEAD_CHEF, ROLE.COOK, ROLE.DIRECTION, ROLE.ADMIN],
  "recipe.approve": [ROLE.HEAD_CHEF, ROLE.DIRECTION, ROLE.ADMIN],

  // Catalog
  "catalog.manage": [ROLE.PROCUREMENT, ROLE.HEAD_CHEF, ROLE.DIRECTION, ROLE.ADMIN],

  // Procurement
  "procurement.create": [ROLE.PROCUREMENT, ROLE.HEAD_CHEF, ROLE.DIRECTION, ROLE.ADMIN],
  "procurement.approve": [ROLE.DIRECTION, ROLE.ADMIN],

  // Inventory
  "inventory.manage": [ROLE.PROCUREMENT, ROLE.HEAD_CHEF, ROLE.DIRECTION, ROLE.ADMIN],
  "inventory.adjust": [ROLE.DIRECTION, ROLE.ADMIN],

  // Operations
  "task.manage": [ROLE.HEAD_CHEF, ROLE.ROOM, ROLE.RECEPTION, ROLE.DIRECTION, ROLE.ADMIN],

  // Direction
  "dashboard.view": [ROLE.DIRECTION, ROLE.ADMIN, ROLE.SUPERADMIN],

  // Automations
  "integration.manage": [ROLE.DIRECTION, ROLE.ADMIN],
  "job.retry": [ROLE.DIRECTION, ROLE.ADMIN],
} as const;

export function hasPermission(role: Role, action: string): boolean {
  const allowedRoles = PERMISSIONS[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}
