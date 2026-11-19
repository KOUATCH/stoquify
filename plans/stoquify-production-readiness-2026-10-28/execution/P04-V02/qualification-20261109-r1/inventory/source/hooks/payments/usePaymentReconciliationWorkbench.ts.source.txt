"use client"

import { useQuery } from "@tanstack/react-query"
import { useRef } from "react"
import { usePermissions } from "@/hooks/usePermissions"

import { getPaymentReconciliationWorkbenchAction } from "@/actions/payments/reconciliation-workbench.actions"
import type { PaymentReconciliationWorkbenchInput } from "@/services/payments/payment-reconciliation-workbench.schemas"

export const paymentReconciliationWorkbenchKeys = {
  all: ["payment-reconciliation-workbench"] as const,
  dashboard: (params: PaymentReconciliationWorkbenchInput) =>
    [
      ...paymentReconciliationWorkbenchKeys.all,
      params.locationId ?? "all",
      params.period ?? "mtd",
      params.startDate ? new Date(params.startDate).toISOString() : null,
      params.endDate ? new Date(params.endDate).toISOString() : null,
    ] as const,
}

export function usePaymentReconciliationWorkbench(params: PaymentReconciliationWorkbenchInput) {
  const { organizationId, user, permissionState, hasPermission } = usePermissions()
  const actorId = user?.id
  const allowed = permissionState === "ready" && !!organizationId && !!actorId && hasPermission("payments.reconciliation.read")
  const lastRead = useRef<{ organizationId?: string; actorId?: string; allowed: boolean }>({ allowed: false })
  if (permissionState !== "loading") lastRead.current = { organizationId, actorId, allowed }
  // Keep a same-actor, previously permitted view visibly refreshing while its
  // permission request is in flight; never resurrect it after denial or failure.
  const refreshingKnownScope = permissionState === "loading" && lastRead.current.allowed
    && lastRead.current.organizationId === organizationId && lastRead.current.actorId === actorId
  const authorityError = permissionState !== "loading" && !allowed
    ? Object.assign(new Error("Current reconciliation read access could not be verified."), { code: "FORBIDDEN" }) : null
  const query = useQuery({
    queryKey: [...paymentReconciliationWorkbenchKeys.dashboard(params), organizationId, actorId],
    enabled: allowed,
    queryFn: async () => {
      if (!allowed) throw Object.assign(new Error("Current reconciliation read access is required."), { code: "FORBIDDEN" })
      const result = await getPaymentReconciliationWorkbenchAction(params)

      if (!result.success || !result.data) {
        throw Object.assign(new Error(result.error || "Payment reconciliation workbench data is unavailable."), { code: result.code })
      }
      if (result.data.scope.organizationId !== organizationId || result.data.scope.actorId !== actorId || result.data.organization.id !== organizationId)
        throw Object.assign(new Error("Refresh the current workspace and permissions."), { code: "TENANT_SCOPE_VIOLATION" })
      return result.data
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: false,
  })
  const bound = query.data?.scope.organizationId === organizationId && query.data?.scope.actorId === actorId && query.data?.organization.id === organizationId
  return { ...query, data: bound && (allowed || refreshingKnownScope) && !query.isError ? query.data : undefined,
    error: authorityError ?? query.error, isError: !!authorityError || query.isError,
    isLoading: permissionState === "loading" || query.isLoading, isFetching: permissionState === "loading" || query.isFetching }
}
