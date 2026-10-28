"use server"

import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import {
  getCashReconciliationReportsReadModel,
  getDashboardSummaryReadModel,
  getProductPerformanceReadModel,
  getSalesAnalyticsReadModel,
  getUserPerformanceReadModel,
  type SalesAnalyticsReadModelInput,
} from "@/services/analytics/sales-analytics.service"

export type {
  CashReconciliationReport,
  ProductPerformance,
  SalesAnalytics,
  UserPerformance,
} from "@/services/analytics/sales-analytics.service"

async function salesAnalyticsInput(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
): Promise<SalesAnalyticsReadModelInput> {
  const ctx = await requirePermission("reports.read", { resource: "SalesAnalytics" })
  await assertCanUseOrganization(ctx, organizationId)

  return {
    organizationId: ctx.isSuperUser ? organizationId : ctx.orgId,
    locationId,
    startDate,
    endDate,
  }
}

async function salesAnalyticsLocationInput(organizationId: string, locationId: string) {
  const ctx = await requirePermission("reports.read", { resource: "SalesAnalytics" })
  await assertCanUseOrganization(ctx, organizationId)

  return {
    organizationId: ctx.isSuperUser ? organizationId : ctx.orgId,
    locationId,
  }
}

export async function getSalesAnalytics(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
) {
  return getSalesAnalyticsReadModel(
    await salesAnalyticsInput(organizationId, locationId, startDate, endDate),
  )
}

export async function getCashReconciliationReports(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
) {
  return getCashReconciliationReportsReadModel(
    await salesAnalyticsInput(organizationId, locationId, startDate, endDate),
  )
}

export async function getProductPerformance(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
) {
  return getProductPerformanceReadModel(
    await salesAnalyticsInput(organizationId, locationId, startDate, endDate),
  )
}

export async function getUserPerformance(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
) {
  return getUserPerformanceReadModel(
    await salesAnalyticsInput(organizationId, locationId, startDate, endDate),
  )
}

export async function getDashboardSummary(organizationId: string, locationId: string) {
  return getDashboardSummaryReadModel(await salesAnalyticsLocationInput(organizationId, locationId))
}
