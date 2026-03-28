"use client";

import type { ReactNode } from "react";
import { useRole } from "@/hooks/use-role";
import { hasPermission, hasAnyPermission, type Permission } from "@/lib/rbac";

interface RoleGateProps {
  permission?: Permission;
  permissions?: Permission[]; // show if the user has ANY of these
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on the current user's role permissions.
 *
 * Usage:
 *   <RoleGate permission="recipe:approve">
 *     <Button>Aprobar receta</Button>
 *   </RoleGate>
 *
 *   <RoleGate permissions={["po:create", "po:send"]} fallback={<span>Sin acceso</span>}>
 *     <Button>Nueva orden</Button>
 *   </RoleGate>
 */
export function RoleGate({
  permission,
  permissions,
  fallback = null,
  children,
}: RoleGateProps) {
  const role = useRole();

  const allowed = permission
    ? hasPermission(role, permission)
    : permissions
      ? hasAnyPermission(role, permissions)
      : true;

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
