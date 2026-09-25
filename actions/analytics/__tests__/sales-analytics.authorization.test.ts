jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }))
jest.mock("@/services/analytics/sales-analytics.service", () => ({ getCashReconciliationReportsReadModel: jest.fn(), getDashboardSummaryReadModel: jest.fn(), getProductPerformanceReadModel: jest.fn(), getSalesAnalyticsReadModel: jest.fn(), getUserPerformanceReadModel: jest.fn() }))

import * as actions from "../getSalesAnalytics"
import * as service from "@/services/analytics/sales-analytics.service"
import { requirePermission, assertCanUseOrganization } from "@/lib/security/rbac"

const entries = [
  [actions.getCashReconciliationReports, service.getCashReconciliationReportsReadModel],
  [actions.getDashboardSummary, service.getDashboardSummaryReadModel],
  [actions.getProductPerformance, service.getProductPerformanceReadModel],
  [actions.getSalesAnalytics, service.getSalesAnalyticsReadModel],
  [actions.getUserPerformance, service.getUserPerformanceReadModel],
] as const
beforeEach(() => { jest.clearAllMocks(); (requirePermission as jest.Mock).mockResolvedValue({ orgId: "owned", isSuperUser: false }); (assertCanUseOrganization as jest.Mock).mockResolvedValue(undefined) })
it.each(entries)("requires current report permission before calling the reader: %p", async (action, reader) => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new Error("permission denied"))
  await expect(action("owned", "location", new Date(), new Date())).rejects.toThrow("permission denied")
  expect(reader).not.toHaveBeenCalled()
})
it.each(entries)("rejects a foreign organization before calling the reader: %p", async (action, reader) => {
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValue(new Error("organization denied"))
  await expect(action("foreign", "location", new Date(), new Date())).rejects.toThrow("organization denied")
  expect(reader).not.toHaveBeenCalled()
})
it.each(entries)("passes server identity and leaves location ownership to the verified service: %p", async (action, reader) => {
  await action("owned", "location", new Date(), new Date())
  expect(requirePermission).toHaveBeenCalledWith("reports.read", { resource: "SalesAnalytics" })
  expect(reader).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "owned", locationId: "location" }))
})
