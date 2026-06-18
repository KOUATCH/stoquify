"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { hasRbacPermission } from "@/lib/security/rbac-permissions";

type SessionWithPermissions = {
  user?: {
    permissions?: string[] | null;
  } | null;
} | null | undefined;

export function useShellPermissions(session: SessionWithPermissions) {
  const { permissions: fetchedPermissions } = usePermissions();
  const sessionPermissions = Array.isArray(session?.user?.permissions)
    ? session.user.permissions
    : [];
  const permissions = fetchedPermissions.length > 0
    ? fetchedPermissions
    : sessionPermissions;

  return {
    permissions,
    hasPermission: (permission: string) =>
      hasRbacPermission(permissions, permission),
  };
}
