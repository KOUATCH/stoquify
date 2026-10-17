"use client"
import { useQuery } from "@tanstack/react-query"
import { getReceivablesCollectionsAction, getPayablesWorkflowDashboardAction } from "@/actions/finance/open-items-dashboard.actions"

type Result<T> = { success: true; data: T } | { success: false; error: string }
export type FinanceDashboardIdentity = { userId?: string; organizationId?: string; permissionKey: string; enabled: boolean }
function useSupplement<T extends { organizationId: string }>(name: string, organizationId: string, identity: FinanceDashboardIdentity, scope: unknown, read: () => Promise<Result<T>>) {
  // Share the parent permission subscription. Mounting another usePermissions hook
  // refetches its stale query and would repeatedly unmount these guarded panels.
  const enabled = identity.enabled && !!identity.userId && identity.organizationId === organizationId
  const query = useQuery({
    queryKey: [name, identity.userId, organizationId, identity.permissionKey, scope], enabled,
    queryFn: async () => {
      const response = await read()
      if (!response.success) throw new Error(response.error)
      if (response.data.organizationId !== organizationId) throw new Error("Dashboard workspace changed")
      return response.data
    }, staleTime: 0, gcTime: 0, retry: false, refetchInterval: 30000,
  })
  return { ...query, data: enabled && !query.isError ? query.data : undefined }
}
export function useReceivablesCollections(organizationId: string, scope: { locationId?: string; start: string; end: string }, identity: FinanceDashboardIdentity) {
  return useSupplement<Extract<Awaited<ReturnType<typeof getReceivablesCollectionsAction>>, { success: true }>["data"]>("receivables-collections", organizationId, identity, scope, () => getReceivablesCollectionsAction(scope))
}
export function usePayablesWorkflow(organizationId: string, identity: FinanceDashboardIdentity) {
  return useSupplement<Extract<Awaited<ReturnType<typeof getPayablesWorkflowDashboardAction>>, { success: true }>["data"]>("payables-workflow", organizationId, identity, {}, () => getPayablesWorkflowDashboardAction({}))
}
