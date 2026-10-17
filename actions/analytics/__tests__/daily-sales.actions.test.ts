jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error { constructor(message: string, public code: string, public status: number) { super(message) } }
  return { RbacError, isRbacError: (error: unknown) => error instanceof RbacError, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/analytics/daily-sales-read.service", () => ({ getDailySalesReadModel: jest.fn(), getLatestDailySalesDay: jest.fn() }))
jest.mock("@/services/analytics/financial-analytics.service", () => ({ getDailyReportDataReadModel: jest.fn(), getFinancialMetricsReadModel: jest.fn() }))
import { assertCanUseOrganization, requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getDailySalesReadModel, getLatestDailySalesDay } from "@/services/analytics/daily-sales-read.service"
import { getDailySalesReportAction, getLatestDailySalesDayAction } from "../daily-sales.actions"
import { getDailyReportData, getFinancialMetrics } from "../financial-analytics"
import { getDailyReportDataReadModel, getFinancialMetricsReadModel } from "@/services/analytics/financial-analytics.service"

beforeEach(() => {
  jest.resetAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-session", userId: "user-session", permissions: ["reports.read", "sales.read"], isSuperUser: false })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(getDailySalesReadModel as jest.Mock).mockResolvedValue({ source: { kind: "ORDER_AGGREGATION" } })
})
it("requires both existing authorities and derives the reporting tenant from the session", async () => {
  const result = await getDailySalesReportAction({ organizationId: "org-session", date: "2026-09-06" })
  expect(result.success).toBe(true)
  expect(requirePermission).toHaveBeenCalledWith("reports.read", expect.objectContaining({ resource: "DailySalesReport" }))
  expect(requirePermission).toHaveBeenCalledWith("sales.read", expect.objectContaining({ resource: "DailySalesReport" }))
  expect(getDailySalesReadModel).toHaveBeenCalledWith({ organizationId: "org-session", date: "2026-09-06" })
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", moduleSlug: "sales", accessIntent: "read", mode: "observe" }))
})

it("guards latest activity with the same tenant and both permissions", async () => {
  await getLatestDailySalesDayAction({ locationId: "location-1" })
  expect(getLatestDailySalesDay).toHaveBeenCalledWith({ organizationId: "org-session", locationId: "location-1" })
  expect(requirePermission).toHaveBeenCalledWith("sales.read", { resource: "DailySalesReport" })
  expect(requirePermission).toHaveBeenCalledWith("reports.read", expect.objectContaining({ resource: "DailySalesReport" }))
})
it.each(["reports.read", "sales.read"])("denies latest activity without %s", async missing => {
  ;(requirePermission as jest.Mock).mockImplementation(async permission => { if (permission === missing) throw new RbacError("Denied", "FORBIDDEN", 403); return { orgId: "org-session", permissions: [], isSuperUser: false } })
  expect(await getLatestDailySalesDayAction({ locationId: "location-1" })).toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(getLatestDailySalesDay).not.toHaveBeenCalled()
})
it("rejects foreign tenant and client authority on latest lookup", async () => {
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValueOnce(new RbacError("Foreign", "FORBIDDEN", 403))
  expect(await getLatestDailySalesDayAction({ organizationId: "foreign", locationId: "location-1" })).toMatchObject({ success: false })
  expect(await getLatestDailySalesDayAction({ locationId: "" })).toMatchObject({ success: false })
  expect(await getLatestDailySalesDayAction({ locationId: "location-1", permissions: ["*"] } as never)).toMatchObject({ success: false })
  expect(getLatestDailySalesDay).not.toHaveBeenCalled()
})
it.each(["reports.read", "sales.read"])("refuses missing %s without loading report data", async missing => {
  ;(requirePermission as jest.Mock).mockImplementation(async permission => { if (permission === missing) throw new RbacError("Permission denied", "FORBIDDEN", 403); return { orgId: "org-session", userId: "user-session", permissions: [], isSuperUser: false } })
  expect(await getDailySalesReportAction({})).toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(getDailySalesReadModel).not.toHaveBeenCalled()
})
it("rejects a foreign tenant through the shared guard before the read owner", async () => {
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValue(new RbacError("Foreign organization", "FORBIDDEN", 403))
  expect(await getDailySalesReportAction({ organizationId: "foreign" })).toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(getDailySalesReadModel).not.toHaveBeenCalled()
})
it("does not accept client authority or invalid date shape", async () => {
  for (const input of [{ date: "not-a-date" }, { date: "2026-09-06", permissions: ["*"] }]) {
    expect(await getDailySalesReportAction(input)).toMatchObject({ success: false })
  }
  expect(getDailySalesReadModel).not.toHaveBeenCalled()
})
it("preserves a service failure as failure rather than empty report success", async () => {
  ;(getDailySalesReadModel as jest.Mock).mockRejectedValue(new Error("Query failed"))
  expect(await getDailySalesReportAction({})).toMatchObject({ success: false, data: null })
})
it("retains the legacy action only with the same sales and reporting authority", async () => {
  await getDailyReportData("org-session", "location-1", new Date("2026-09-06T00:00:00Z"))
  expect(requirePermission).toHaveBeenCalledWith("sales.read", { resource: "DailyFinancialReport" })
  expect(getDailyReportDataReadModel).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", locationId: "location-1" }))
})
it("does not let the legacy action bypass missing sales authority", async () => {
  ;(requirePermission as jest.Mock).mockImplementation(async permission => { if (permission === "sales.read") throw new RbacError("Permission denied", "FORBIDDEN", 403); return { orgId: "org-session", isSuperUser: false } })
  await expect(getDailyReportData("org-session", "location-1", new Date())).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(getDailyReportDataReadModel).not.toHaveBeenCalled()
})

it("derives financial reporting scope and payroll authority from the signed-in actor", async () => {
  const start = new Date("2026-09-01T00:00:00Z"), end = new Date("2026-09-06T00:00:00Z")
  await getFinancialMetrics("org-session", "loc-1", start, end)
  expect(requirePermission).toHaveBeenCalledWith("reports.read", { resource: "FinancialAnalytics" })
  expect(assertCanUseOrganization).toHaveBeenCalledWith(expect.objectContaining({ orgId: "org-session" }), "org-session")
  expect(getFinancialMetricsReadModel).toHaveBeenCalledWith({ organizationId: "org-session", locationId: "loc-1", startDate: start, endDate: end, actorPermissions: ["reports.read", "sales.read"], payrollModuleDecision: { allowed: true } })
})

it("rejects foreign financial scope before observing module or loading figures", async () => {
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValue(new RbacError("Foreign organization", "FORBIDDEN", 403))
  await expect(getFinancialMetrics("foreign", "loc-1", new Date(), new Date())).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(observeModuleAccess).not.toHaveBeenCalled()
  expect(getFinancialMetricsReadModel).not.toHaveBeenCalled()
})

it("rejects malformed financial dates and empty locations before any service read", async () => {
  await expect(getFinancialMetrics("org-session", "loc-1", new Date("invalid"), new Date())).rejects.toThrow()
  await expect(getFinancialMetrics("org-session", "", new Date(), new Date())).rejects.toThrow()
  await expect(getFinancialMetrics("org-session", "loc-1", new Date("2026-09-06T00:00:00Z"), new Date("2026-09-01T00:00:00Z"))).rejects.toThrow()
  expect(observeModuleAccess).not.toHaveBeenCalled()
  expect(getFinancialMetricsReadModel).not.toHaveBeenCalled()
})
