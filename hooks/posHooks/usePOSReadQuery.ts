"use client"

import { useQuery } from "@tanstack/react-query"
import { useRef } from "react"
import { usePermissions } from "@/hooks/usePermissions"
import type { POSReadResult } from "@/services/pos/pos-read-result"

export function usePOSReadQuery<T>(options: {
  queryKey: readonly unknown[]
  queryFn: () => Promise<POSReadResult<T>>
  permission: string | readonly string[]
  enabled?: boolean
  refetchInterval?: number
  preserveDataOnError?: boolean
}) {
  const { organizationId, user, permissionState, hasPermission, refreshPermissions } = usePermissions()
  const actorId = user?.id, enabled = options.enabled !== false
  const permissions = typeof options.permission === "string" ? [options.permission] : options.permission
  const allowed = permissionState === "ready" && !!organizationId && !!actorId && permissions.some(permission => hasPermission(permission))
  const last = useRef({ organizationId, actorId, allowed: false })
  if (permissionState !== "loading") last.current = { organizationId, actorId, allowed }
  const refreshingOwnScope = permissionState === "loading" && last.current.allowed && last.current.organizationId === organizationId && last.current.actorId === actorId
  const denied = enabled && permissionState !== "loading" && !allowed
  const query = useQuery({
    queryKey: [...options.queryKey, organizationId, actorId],
    enabled: enabled && allowed,
    retry: false,
    refetchInterval: options.refetchInterval,
    meta: { suppressErrorNotification: true },
    queryFn: async () => {
      if (!allowed) throw Object.assign(new Error("POS_READ_DENIED"), { code: "FORBIDDEN" })
      const result = await options.queryFn()
      if (!result.success) throw Object.assign(new Error(result.error), { code: "POS_READ_FAILED" })
      if (result.scope.organizationId !== organizationId || result.scope.actorId !== actorId)
        throw Object.assign(new Error("POS_READ_SCOPE_CHANGED"), { code: "TENANT_SCOPE_VIOLATION" })
      return result
    },
  })
  const bound = query.data?.scope.organizationId === organizationId && query.data?.scope.actorId === actorId
  // Retain same-scope data only for draft continuity beneath an explicit error/loading view.
  const data = bound && (allowed || refreshingOwnScope) && (!query.isError || options.preserveDataOnError) ? query.data : undefined
  return { ...query, data, isError: denied || query.isError,
    isLoading: enabled && (permissionState === "loading" || query.isLoading),
    readState: !enabled ? "idle" as const : denied ? "denied" as const : query.isError ? "error" as const : permissionState === "loading" || query.isPending ? "loading" as const : "ready" as const,
    async retryRead() { if (denied) await refreshPermissions(); else await query.refetch() },
  }
}
