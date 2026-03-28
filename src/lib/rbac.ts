// Role hierarchy and permissions for ChefOS
// Maps to the canonical Role values from contracts/enums.ts

import { ROLE, type Role } from "@/contracts/enums";

// AppRole is an alias for the canonical Role type
export type AppRole = Role;

export type Permission =
  | "recipe:approve"
  | "recipe:create"
  | "recipe:edit"
  | "recipe:delete"
  | "event:create"
  | "event:edit"
  | "event:confirm"
  | "event:cancel"
  | "event:complete"
  | "po:create"
  | "po:send"
  | "po:receive"
  | "po:cancel"
  | "inventory:adjust"
  | "inventory:waste"
  | "staff:manage"
  | "catalog:manage"
  | "settings:access"
  | "alerts:manage"
  | "clients:manage";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  [ROLE.SUPERADMIN]: [
    "recipe:approve", "recipe:create", "recipe:edit", "recipe:delete",
    "event:create", "event:edit", "event:confirm", "event:cancel", "event:complete",
    "po:create", "po:send", "po:receive", "po:cancel",
    "inventory:adjust", "inventory:waste",
    "staff:manage", "catalog:manage", "settings:access", "alerts:manage", "clients:manage",
  ],
  [ROLE.ADMIN]: [
    "recipe:approve", "recipe:create", "recipe:edit", "recipe:delete",
    "event:create", "event:edit", "event:confirm", "event:cancel", "event:complete",
    "po:create", "po:send", "po:receive", "po:cancel",
    "inventory:adjust", "inventory:waste",
    "staff:manage", "catalog:manage", "settings:access", "alerts:manage", "clients:manage",
  ],
  [ROLE.DIRECTION]: [
    "recipe:approve", "recipe:create", "recipe:edit",
    "event:create", "event:edit", "event:confirm", "event:cancel", "event:complete",
    "po:create", "po:send", "po:receive", "po:cancel",
    "inventory:adjust", "inventory:waste",
    "staff:manage", "catalog:manage", "settings:access", "alerts:manage", "clients:manage",
  ],
  // jefe_cocina equivalent: HEAD_CHEF
  [ROLE.HEAD_CHEF]: [
    "recipe:approve", "recipe:create", "recipe:edit",
    "event:create", "event:edit", "event:confirm", "event:complete",
    "inventory:adjust", "inventory:waste",
    "staff:manage", "catalog:manage", "alerts:manage",
  ],
  // cocinero equivalent: COOK
  [ROLE.COOK]: [
    "recipe:create", "recipe:edit",
    "inventory:waste",
  ],
  // maitre equivalent: COMMERCIAL
  [ROLE.COMMERCIAL]: [
    "event:create", "event:edit", "event:confirm",
    "clients:manage",
  ],
  // compras equivalent: PROCUREMENT
  [ROLE.PROCUREMENT]: [
    "po:create", "po:send", "po:receive",
    "catalog:manage",
  ],
  // room staff
  [ROLE.ROOM]: [
    "event:edit",
    "clients:manage",
  ],
  // reception / viewer
  [ROLE.RECEPTION]: [],
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: AppRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
