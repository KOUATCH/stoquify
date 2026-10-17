jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error { constructor(message: string, public code: string, public status: number) { super(message) } }
  return { RbacError, isRbacError: (error: unknown) => error instanceof RbacError, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/analytics/sales-collections.service", () => ({ getSalesCollections: jest.fn(), getSalesReceivables: jest.fn() }))
jest.mock("@/services/analytics/sales-products.service", () => ({ getSalesProducts: jest.fn() }))
import { requirePermission, assertCanUseOrganization, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getSalesCollections, getSalesReceivables } from "@/services/analytics/sales-collections.service"
import { getSalesProducts } from "@/services/analytics/sales-products.service"
import { getSalesCollectionsAction, getSalesReceivablesAction, getSalesProductsAction } from "../sales-insights.actions"
const actions = [getSalesCollectionsAction, getSalesReceivablesAction, getSalesProductsAction]
const reads = [getSalesCollections, getSalesReceivables, getSalesProducts]
function permissions(values: string[]) { (requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", userId: "actor", permissions: ["reports.read", "sales.read", ...values], isSuperUser: false }) }
beforeEach(() => { jest.resetAllMocks(); permissions([]); (observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true }) })
it("returns only a restricted marker and performs no source reads for reports/sales-only users", async () => {
  for (const action of actions) expect(await action({})).toMatchObject({ success: true, data: { state: "restricted" } })
  for (const read of reads) expect(read).not.toHaveBeenCalled()
})
it("checks finance panels independently and derives stock/cost capabilities on the server", async () => {
  permissions(["finance.payments.read", "inventory.items.read"])
  await getSalesCollectionsAction({}); await getSalesReceivablesAction({}); await getSalesProductsAction({})
  expect(getSalesCollections).toHaveBeenCalledWith({ organizationId: "org-1", preset: "7d" }); expect(getSalesReceivables).not.toHaveBeenCalled()
  expect(getSalesProducts).toHaveBeenCalledWith(expect.anything(), { stock: false, margin: false })
  permissions(["finance.read", "inventory.items.read", "inventory.levels.read"])
  await getSalesReceivablesAction({}); await getSalesProductsAction({})
  expect(getSalesReceivables).toHaveBeenCalled(); expect(getSalesProducts).toHaveBeenLastCalledWith(expect.anything(), { stock: true, margin: true })
})
it.each(["reports.read", "sales.read"])("denies revoked %s before every source read", async permission => {
  ;(requirePermission as jest.Mock).mockImplementation(async p => { if (p === permission) throw new RbacError("Denied", "FORBIDDEN", 403); return { orgId: "org-1", permissions: ["*"] } })
  for (const action of actions) expect(await action({})).toMatchObject({ success: false })
  for (const read of reads) expect(read).not.toHaveBeenCalled()
})
it("rejects forged capabilities, foreign organization and malformed scope", async () => {
  permissions(["*"])
  for (const action of actions) {
    expect(await action({ stock: true } as never)).toMatchObject({ success: false })
    expect(await action({ status: "DRAFT" } as never)).toMatchObject({ success: false })
    ;(assertCanUseOrganization as jest.Mock).mockRejectedValueOnce(new RbacError("Foreign", "FORBIDDEN", 403))
    expect(await action({ organizationId: "foreign" })).toMatchObject({ success: false })
  }
  for (const read of reads) expect(read).not.toHaveBeenCalled()
})
