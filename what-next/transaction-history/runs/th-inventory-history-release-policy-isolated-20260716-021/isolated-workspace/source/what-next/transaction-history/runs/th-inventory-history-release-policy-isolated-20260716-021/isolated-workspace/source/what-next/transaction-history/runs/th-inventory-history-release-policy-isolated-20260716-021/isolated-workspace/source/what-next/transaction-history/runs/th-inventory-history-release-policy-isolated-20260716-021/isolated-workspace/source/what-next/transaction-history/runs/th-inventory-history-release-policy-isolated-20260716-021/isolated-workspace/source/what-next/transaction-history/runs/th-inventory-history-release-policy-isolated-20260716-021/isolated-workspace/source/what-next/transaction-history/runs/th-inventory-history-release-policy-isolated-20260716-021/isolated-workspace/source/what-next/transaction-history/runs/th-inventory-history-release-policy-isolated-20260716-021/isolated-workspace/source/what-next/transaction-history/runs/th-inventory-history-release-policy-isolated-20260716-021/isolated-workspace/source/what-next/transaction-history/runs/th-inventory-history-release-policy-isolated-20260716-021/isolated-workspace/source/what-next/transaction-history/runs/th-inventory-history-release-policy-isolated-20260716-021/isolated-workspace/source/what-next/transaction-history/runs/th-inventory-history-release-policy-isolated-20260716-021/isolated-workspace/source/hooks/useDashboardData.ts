"use client"

import {
  getAllDashboardData,
  type DashboardData,
  type DashboardFilters,
} from "@/actions/dashboard/getDashboardData"
import { useQuery } from "@tanstack/react-query"

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: (organizationId: string, filters: DashboardFilters) =>
    [...dashboardKeys.all, "overview", organizationId, filters.period || "30d", filters.locationId || "all"] as const,
}

export function useDashboardData(
  organizationId: string,
  filters: DashboardFilters,
  initialData?: DashboardData
) {
  return useQuery({
    queryKey: dashboardKeys.overview(organizationId, filters),
    queryFn: () => getAllDashboardData(organizationId, filters),
    enabled: Boolean(organizationId),
    initialData,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export default useDashboardData
