jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error { constructor(message: string, public code: string, public status: number) { super(message) } }
  return { RbacError, isRbacError: (error: unknown) => error instanceof RbacError, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/analytics/sales-performance-export.service", () => ({ prepareSalesPerformanceExport: jest.fn() }))
jest.mock("@/services/analytics/sales-cash-attention.service", () => ({ getSalesCashAttention: jest.fn() }))
import { requirePermission, assertCanUseOrganization, RbacError } from "@/lib/security/rbac"
import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { prepareSalesPerformanceExport } from "@/services/analytics/sales-performance-export.service"
import { getSalesCashAttention } from "@/services/analytics/sales-cash-attention.service"
import { exportSalesPerformanceAction } from "../sales-export.actions"
import { getSalesCashAttentionAction } from "../sales-insights.actions"
const ctx = { orgId: "org", userId: "actor", permissions: ["reports.read", "sales.read", "reports.export"], isSuperUser: false }
beforeEach(() => { jest.resetAllMocks(); (requirePermission as jest.Mock).mockResolvedValue(ctx); (requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { lastAuthAt: 1000 } }); (observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true }) })
it("derives export scope and capabilities from the server and requires five-minute fresh authentication", async () => {
  expect(await exportSalesPerformanceAction({ locationId: "loc" })).toMatchObject({ success: true })
  expect(requireFreshAuth).toHaveBeenCalledWith(300)
  expect(prepareSalesPerformanceExport).toHaveBeenCalledWith({ scope: { organizationId: "org", locationId: "loc", preset: "7d" }, actorId: "actor", permissions: ctx.permissions, lastAuthAt: 1000, canReadCustomers: false })
  expect((requirePermission as jest.Mock).mock.calls.map(row => row[0])).toEqual(["reports.export", "reports.read", "sales.read"])
})
it.each(["reports.export", "reports.read", "sales.read"])("denies revoked %s before export reads", async permission => {
  ;(requirePermission as jest.Mock).mockImplementation(async p => { if (p === permission) throw new RbacError("Denied", "FORBIDDEN", 403); return ctx })
  expect(await exportSalesPerformanceAction({})).toMatchObject({ success: false })
  expect(prepareSalesPerformanceExport).not.toHaveBeenCalled()
})
it("withholds export after stale authentication and blocks forged/foreign input", async () => {
  ;(requireFreshAuth as jest.Mock).mockRejectedValueOnce(new FreshAuthRequiredError())
  expect(await exportSalesPerformanceAction({})).toMatchObject({ success: false, code: "FRESH_AUTH_REQUIRED" })
  expect(await exportSalesPerformanceAction({ permissions: ["*"] } as never)).toMatchObject({ success: false })
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValueOnce(new RbacError("Foreign", "FORBIDDEN", 403))
  expect(await exportSalesPerformanceAction({ organizationId: "foreign" })).toMatchObject({ success: false })
  expect(prepareSalesPerformanceExport).not.toHaveBeenCalled()
})
it("uses the daily-report permission pair for saved cash findings and blocks foreign tenants", async () => {
  await getSalesCashAttentionAction({ locationId: "loc" })
  expect(getSalesCashAttention).toHaveBeenCalledWith({ organizationId: "org", locationId: "loc", preset: "7d" })
  ;(getSalesCashAttention as jest.Mock).mockClear()
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValueOnce(new RbacError("Foreign", "FORBIDDEN", 403))
  expect(await getSalesCashAttentionAction({ organizationId: "foreign" })).toMatchObject({ success: false })
  ;(requirePermission as jest.Mock).mockRejectedValue(new RbacError("Denied", "FORBIDDEN", 403))
  expect(await getSalesCashAttentionAction({})).toMatchObject({ success: false })
  expect(getSalesCashAttention).not.toHaveBeenCalled()
})
