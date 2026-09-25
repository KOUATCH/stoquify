"use client"

import { getCashDrawerDashboardAction } from "@/actions/pos/drawer-dashboard.actions"
import type { DrawerDashboardInput } from "@/services/pos/drawer-dashboard.schemas"
import { useQuery } from "@tanstack/react-query"

export const drawerDashboardKeys = {
  all: ["pos-drawer-dashboard"] as const,
  dashboard: (params: DrawerDashboardInput) =>
    [
      ...drawerDashboardKeys.all,
      params.locationId ?? "all",
      params.period ?? "today",
      params.startDate ? new Date(params.startDate).toISOString() : null,
      params.endDate ? new Date(params.endDate).toISOString() : null,
    ] as const,
}

export function useCashDrawerDashboard(params: DrawerDashboardInput) {
  return useQuery({
    queryKey: drawerDashboardKeys.dashboard(params),
    queryFn: () => getCashDrawerDashboardAction(params),
    refetchInterval: 30000,
    staleTime: 15000,
  })
}
