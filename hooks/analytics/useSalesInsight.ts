"use client"
import { useQuery } from "@tanstack/react-query"
import type { ProtectedActionResponse } from "@/services/_shared/protect"
import type { PerformanceScope } from "@/lib/analytics/sales-performance-scope"

export function useSalesInsight<T>(name: string, action: (scope: PerformanceScope) => Promise<ProtectedActionResponse<T>>, scope: PerformanceScope, identity: string, revision: string) {
  return useQuery({ queryKey: ["sales-insights", name, identity, { ...scope, search: undefined, cursor: undefined }, revision], retry: false, staleTime: 30_000,
    queryFn: async () => { const result = await action({ ...scope, search: undefined, cursor: undefined }); if (!result.success) throw new Error("Insight unavailable"); return result.data } })
}
