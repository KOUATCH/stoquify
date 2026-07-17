"use server"

import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
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
  const scopedOrganizationId = ctx.isSuperUser ? organizationId : ctx.orgId
  const payrollModuleDecision = await observeModuleAccess({
    organizationId: scopedOrganizationId,
    userId: ctx.userId,
    moduleSlug: "payroll",
    surfaceType: "report",
    surface: "FinancialAnalytics.payrollFacts",
    accessIntent: "read",
    actorPermissions: ctx.permissions,
  })

  return {
    organizationId: scopedOrganizationId,
    locationId,
    startDate,
    endDate,
    actorPermissions: ctx.permissions,
    payrollModuleDecision,
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
