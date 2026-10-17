jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error { constructor(message: string, public code: string, public status: number) { super(message) } }
  return { RbacError, isRbacError: (error: unknown) => error instanceof RbacError, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/analytics/sales-performance.service", () => ({ getSalesPerformance: jest.fn(), getSalesPerformanceOrder: jest.fn() }))
import { requirePermission, assertCanUseOrganization, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getSalesPerformance, getSalesPerformanceOrder } from "@/services/analytics/sales-performance.service"
import { getSalesPerformanceAction, getSalesPerformanceOrderAction } from "../sales-performance.actions"
beforeEach(() => {
  jest.resetAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", userId: "actor", permissions: ["reports.read", "sales.read"], isSuperUser: false })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
})
it("derives tenant and customer capability from server context", async () => {
  await getSalesPerformanceAction({ preset: "7d" })
  expect(getSalesPerformance).toHaveBeenCalledWith({ organizationId: "org-1", preset: "7d", canReadCustomers: false })
  await getSalesPerformanceOrderAction({ orderId: "order-1" })
  expect(getSalesPerformanceOrder).toHaveBeenCalledWith({ organizationId: "org-1", orderId: "order-1", canReadCustomers: false })
  expect(requirePermission).toHaveBeenCalledWith("sales.read", { resource: "SalesPerformance" })
})
it.each(["reports.read", "sales.read"])("denies missing %s for both summary and detail", async permission => {
  ;(requirePermission as jest.Mock).mockImplementation(async p => { if (p === permission) throw new RbacError("Denied", "FORBIDDEN", 403); return { orgId: "org-1", permissions: [] } })
  expect(await getSalesPerformanceAction({})).toMatchObject({ success: false })
  expect(await getSalesPerformanceOrderAction({ orderId: "one" })).toMatchObject({ success: false })
  expect(getSalesPerformance).not.toHaveBeenCalled(); expect(getSalesPerformanceOrder).not.toHaveBeenCalled()
})
it("denies foreign tenant, forged capabilities and invalid populations", async () => {
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValueOnce(new RbacError("Foreign", "FORBIDDEN", 403))
  expect(await getSalesPerformanceAction({ organizationId: "foreign" })).toMatchObject({ success: false })
  expect(await getSalesPerformanceAction({ canReadCustomers: true } as never)).toMatchObject({ success: false })
  expect(await getSalesPerformanceAction({ status: "DRAFT" } as never)).toMatchObject({ success: false })
  expect(getSalesPerformance).not.toHaveBeenCalled()
})
it("includes customer permission only when independently held", async () => {
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", permissions: ["reports.read", "sales.read", "customers.read"] })
  await getSalesPerformanceAction({})
  expect(getSalesPerformance).toHaveBeenCalledWith(expect.objectContaining({ canReadCustomers: true }))
})
