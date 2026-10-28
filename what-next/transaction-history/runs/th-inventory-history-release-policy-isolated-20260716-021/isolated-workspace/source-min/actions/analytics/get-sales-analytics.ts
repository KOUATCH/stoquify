"use server"

import {
  getCashReconciliationReports as getCashReconciliationReportsImpl,
  getDashboardSummary as getDashboardSummaryImpl,
  getProductPerformance as getProductPerformanceImpl,
  getSalesAnalytics as getSalesAnalyticsImpl,
  getUserPerformance as getUserPerformanceImpl,
} from "@/actions/analytics/getSalesAnalytics"

export async function getSalesAnalytics(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
) {
  return getSalesAnalyticsImpl(organizationId, locationId, startDate, endDate)
}

export async function getCashReconciliationReports(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
) {
  return getCashReconciliationReportsImpl(organizationId, locationId, startDate, endDate)
}

export async function getProductPerformance(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
) {
  return getProductPerformanceImpl(organizationId, locationId, startDate, endDate)
}

export async function getUserPerformance(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
) {
  return getUserPerformanceImpl(organizationId, locationId, startDate, endDate)
}

export async function getDashboardSummary(organizationId: string, locationId: string) {
  return getDashboardSummaryImpl(organizationId, locationId)
}
