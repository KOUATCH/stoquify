"use server"

import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import {
  getDailyReportDataReadModel,
  getFinancialMetricsReadModel,
  type DailyReportReadModelInput,
  type FinancialAnalyticsReadModelInput,
} from "@/services/analytics/financial-analytics.service"

export type { FinancialMetrics } from "@/services/analytics/financial-analytics.service"

async function financialAnalyticsInput(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
): Promise<FinancialAnalyticsReadModelInput> {
  const ctx = await requirePermission("reports.read", { resource: "FinancialAnalytics" })
  await assertCanUseOrganization(ctx, organizationId)

  return {
    organizationId: ctx.isSuperUser ? organizationId : ctx.orgId,
    locationId,
    startDate,
    endDate,
  }
}

async function dailyReportInput(
  organizationId: string,
  locationId: string,
  date: Date,
): Promise<DailyReportReadModelInput> {
  const ctx = await requirePermission("reports.read", { resource: "DailyFinancialReport" })
  await assertCanUseOrganization(ctx, organizationId)

  return {
    organizationId: ctx.isSuperUser ? organizationId : ctx.orgId,
    locationId,
    date,
  }
}

export async function getFinancialMetrics(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
) {
  return getFinancialMetricsReadModel(
    await financialAnalyticsInput(organizationId, locationId, startDate, endDate),
  )
}

export async function getDailyReportData(organizationId: string, locationId: string, date: Date) {
  return getDailyReportDataReadModel(await dailyReportInput(organizationId, locationId, date))
}
