"use client"
import { useQuery } from "@tanstack/react-query"
import { getDailySalesReportAction } from "@/actions/analytics/daily-sales.actions"

export function useDailySalesReport(scope: { userId?: string; organizationId?: string; locationId?: string; date?: string | Date }) {
  return useQuery({
    queryKey: ["daily-sales", scope.userId ?? null, scope.organizationId ?? null, scope.locationId ?? null, scope.date instanceof Date ? scope.date.toISOString() : scope.date ?? null],
    enabled: Boolean(scope.userId && scope.organizationId),
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const result = await getDailySalesReportAction({ organizationId: scope.organizationId, locationId: scope.locationId, date: scope.date })
      if (!result.success) throw Object.assign(new Error(result.error), { code: result.code, retryable: result.retryable })
      return result.data
    },
  })
}
