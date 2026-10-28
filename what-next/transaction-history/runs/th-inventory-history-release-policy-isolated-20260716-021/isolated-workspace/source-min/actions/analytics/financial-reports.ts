"use server"

import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import {
  getCashFlowReportReadModel,
  getCashierPerformanceReportReadModel,
  getFinancialSummaryReportReadModel,
  getItemPerformanceReportReadModel,
  type AnalyticsReportReadModelInput,
  type OptionalLocationId,
} from "@/services/analytics/financial-reports.service"

export type {
  CashFlowReport,
  CashierPerformanceReport,
  FinancialSummaryReport,
  ItemPerformanceReport,
  ReportCertificationStatus,
  ReportEvidenceStatus,
  ReportFreshness,
  ReportProvenance,
} from "@/services/analytics/financial-reports.service"

async function analyticsReportInput(
  organizationId: string,
  locationId: OptionalLocationId,
  startDate: Date,
  endDate: Date,
): Promise<AnalyticsReportReadModelInput> {
  const ctx = await requirePermission("reports.read", { resource: "AnalyticsReport" })
  await assertCanUseOrganization(ctx, organizationId)

  return {
    organizationId: ctx.isSuperUser ? organizationId : ctx.orgId,
    locationId,
    startDate,
    endDate,
  }
}

export async function getFinancialSummaryReport(
  organizationId: string,
  locationId: OptionalLocationId,
  startDate: Date,
  endDate: Date,
) {
  return getFinancialSummaryReportReadModel(
    await analyticsReportInput(organizationId, locationId, startDate, endDate),
  )
}

export async function getCashierPerformanceReport(
  organizationId: string,
  locationId: OptionalLocationId,
  startDate: Date,
  endDate: Date,
) {
  return getCashierPerformanceReportReadModel(
    await analyticsReportInput(organizationId, locationId, startDate, endDate),
  )
}

export async function getItemPerformanceReport(
  organizationId: string,
  locationId: OptionalLocationId,
  startDate: Date,
  endDate: Date,
) {
  return getItemPerformanceReportReadModel(
    await analyticsReportInput(organizationId, locationId, startDate, endDate),
  )
}

export async function getCashFlowReport(
  organizationId: string,
  locationId: OptionalLocationId,
  startDate: Date,
  endDate: Date,
) {
  return getCashFlowReportReadModel(
    await analyticsReportInput(organizationId, locationId, startDate, endDate),
  )
}
