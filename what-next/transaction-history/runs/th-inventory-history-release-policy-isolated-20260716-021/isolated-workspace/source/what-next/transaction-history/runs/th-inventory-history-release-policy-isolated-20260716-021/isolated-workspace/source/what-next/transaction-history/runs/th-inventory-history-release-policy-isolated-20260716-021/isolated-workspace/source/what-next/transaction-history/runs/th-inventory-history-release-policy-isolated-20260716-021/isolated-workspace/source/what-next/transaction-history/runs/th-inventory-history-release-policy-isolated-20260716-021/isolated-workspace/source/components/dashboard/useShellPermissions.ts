"use client";

import { hasRbacPermission } from "@/lib/security/rbac-permissions";

type SessionWithPermissions = {
  user?: {
    permissions?: string[] | null;
  } | null;
} | null | undefined;

export function useShellPermissions(session: SessionWithPermissions) {
  const sessionPermissions = Array.isArray(session?.user?.permissions)
    ? session.user.permissions
    : [];
  const permissions = sessionPermissions;

  return {
    permissions,
    hasPermission: (permission: string) =>
      hasRbacPermission(permissions, permission),
  };
}
