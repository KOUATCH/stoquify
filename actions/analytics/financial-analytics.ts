"use server"

import { z } from "zod"
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
  const scope = z.object({ organizationId: z.string().trim().min(1), locationId: z.string().trim().min(1), startDate: z.date(), endDate: z.date() })
    .refine(value => value.endDate >= value.startDate, { message: "Choose an ordered date range.", path: ["endDate"] })
    .parse({ organizationId, locationId, startDate, endDate })
  await assertCanUseOrganization(ctx, scope.organizationId)
  const scopedOrganizationId = ctx.isSuperUser ? scope.organizationId : ctx.orgId
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
    locationId: scope.locationId,
    startDate: scope.startDate,
    endDate: scope.endDate,
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
  await requirePermission("sales.read", { resource: "DailyFinancialReport" })
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
