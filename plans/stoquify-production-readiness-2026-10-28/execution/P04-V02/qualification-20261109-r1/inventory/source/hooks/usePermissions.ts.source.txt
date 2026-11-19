"use client";

import { usePermissions as useAuthClientPermissions } from "@/lib/auth-client";

// Permissions are fetched from /api/me/permissions via React Query (see lib/auth-client.ts).
// session.user never carries permissions in BetterAuth — always use this hook.

export function usePermissions() {
  return useAuthClientPermissions();
}

export function usePermission() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuthClientPermissions();
  return { hasPermission, hasAnyPermission, hasAllPermissions };
}

export default usePermissions;
