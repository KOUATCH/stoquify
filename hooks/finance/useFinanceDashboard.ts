"use client"

import { getFinanceDashboardAction } from "@/actions/finance/finance-dashboard.actions"
import type { FinanceDashboardInput } from "@/services/finance/finance-dashboard.schemas"
import { useQuery } from "@tanstack/react-query"

export const financeDashboardKeys = {
  all: ["finance-dashboard"] as const,
  dashboard: (params: FinanceDashboardInput) =>
    [
      ...financeDashboardKeys.all,
      params.view ?? "overview",
      params.locationId ?? "all",
      params.period ?? "mtd",
      params.startDate ? new Date(params.startDate).toISOString() : null,
      params.endDate ? new Date(params.endDate).toISOString() : null,
    ] as const,
}

export function useFinanceDashboard(params: FinanceDashboardInput) {
  return useQuery({
    queryKey: financeDashboardKeys.dashboard(params),
    queryFn: () => getFinanceDashboardAction(params),
    refetchInterval: 30000,
    staleTime: 15000,
  })
}
