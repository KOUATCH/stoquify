"use client"

import { useQuery } from "@tanstack/react-query"
import { useClientAuth } from "@/hooks/useClientAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { getOpenItemsDashboardAction } from "@/actions/finance/open-items-dashboard.actions"
import type { OpenItemsScope } from "@/services/finance/open-items-dashboard.contract"

class OpenItemsModuleError extends Error {}

export function useOpenItemsDashboard(scope: OpenItemsScope) {
  const auth = useClientAuth()
  const permissions = usePermissions()
  const userId = auth.user?.id
  const organizationId = permissions.organizationId
  const permissionKey = [...(permissions.permissions ?? [])].sort().join("|")
  const enabled = Boolean(!auth.isLoading && permissions.permissionState === "ready" && userId && organizationId && auth.organizationId === organizationId)
  const query = useQuery({
    queryKey: ["open-items-dashboard", userId, organizationId, permissionKey, scope],
    enabled,
    queryFn: async () => {
      const response = await getOpenItemsDashboardAction(scope)
      if (!response.success) {
        if ("reason" in response && response.reason === "locked_module") throw new OpenItemsModuleError(response.error)
        throw new Error(response.error)
      }
      if (response.data.organization.id !== organizationId) throw new Error("Dashboard workspace changed")
      return response.data
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: 30000,
  })
  // Cached values are never shown after denial or a failed refresh.
  const accessState: "error" | "stale_session" | "locked_module" | undefined = permissions.permissionState === "error" ? "error" : permissions.permissionState === "signed_out" ? "stale_session" : !auth.isLoading && permissions.permissionState === "ready" && !enabled ? "stale_session" : query.error instanceof OpenItemsModuleError ? "locked_module" : undefined
  return { ...query, accessState, identity: { userId, organizationId, permissionKey, enabled }, data: enabled && !query.isError ? query.data : undefined }
}
