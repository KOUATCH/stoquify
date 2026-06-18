'use server'

import { assertCanUseOrganization, requirePermission } from '@/lib/security/rbac'
import {
  getAllDashboardData as getAllDashboardDataFromService,
  getDashboardMetrics as getDashboardMetricsFromService,
} from '@/services/dashboard/dashboard-read-model.service'
import type {
  DashboardActivity,
  DashboardAlert,
  DashboardData,
  DashboardFilters,
  DashboardKpis,
  DashboardLocationPerformance,
  DashboardMetric,
  DashboardPendingAction,
  DashboardPeriod,
  DashboardReadModelContext,
  DashboardStockHealth,
  DashboardTopProduct,
  DashboardTrendPoint,
} from '@/services/dashboard/dashboard-read-model.service'

export type {
  DashboardActivity,
  DashboardAlert,
  DashboardData,
  DashboardFilters,
  DashboardKpis,
  DashboardLocationPerformance,
  DashboardMetric,
  DashboardPendingAction,
  DashboardPeriod,
  DashboardReadModelContext,
  DashboardStockHealth,
  DashboardTopProduct,
  DashboardTrendPoint,
}

async function requireDashboardReadContext(requestedOrganizationId?: string | null): Promise<DashboardReadModelContext> {
  const requestedOrgId = requestedOrganizationId?.trim() || undefined
  const ctx = await requirePermission('dashboard.read', {
    resource: 'Dashboard',
    resourceId: requestedOrgId,
  })
  const organizationId = requestedOrgId || ctx.orgId

  await assertCanUseOrganization(ctx, organizationId)

  return {
    organizationId,
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
    isSuperUser: ctx.isSuperUser,
  }
}

export async function getAllDashboardData(
  requestedOrganizationId: string,
  filters: DashboardFilters = {},
): Promise<DashboardData> {
  const context = await requireDashboardReadContext(requestedOrganizationId)
  return getAllDashboardDataFromService({ context, filters })
}

export async function getDashboardMetrics(organizationId: string) {
  const context = await requireDashboardReadContext(organizationId)
  return getDashboardMetricsFromService({ context })
}
