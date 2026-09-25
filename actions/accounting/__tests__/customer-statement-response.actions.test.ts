import { listCustomerStatementResponsesAction, getCustomerStatementResponseHistoryAction, reviewCustomerStatementResponseAction } from "../customer-statement-response.actions"
import { listCustomerStatementResponses, getCustomerStatementResponseHistory, reviewCustomerStatementResponse } from "@/services/accounting/customer-statement-response.service"
import { requirePermission } from "@/lib/security/rbac"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/lib/security/rbac", () => {
  class Denied extends Error { constructor(message: string, public code: string, public status: number) { super(message) } }
  return { RbacError: Denied, isRbacError: (e: unknown) => e instanceof Denied, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn(), canUsePermission: (ctx: { permissions: string[] }, permission: string) => ctx.permissions.includes(permission) }
})
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn(), FreshAuthRequiredError: class extends Error {} }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/accounting/customer-statement-response.service", () => ({ listCustomerStatementResponses: jest.fn(), getCustomerStatementResponseHistory: jest.fn(), reviewCustomerStatementResponse: jest.fn() }))
const permissions = ["customers.read", "customers.update", "accounting.exports.create"]
beforeEach(() => {
  jest.clearAllMocks(); (requirePermission as jest.Mock).mockResolvedValue({ orgId: "org", userId: "actor", permissions })
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { userId: "actor", tenantId: "org", sessionId: "session", lastAuthAt: new Date().toISOString() } })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(listCustomerStatementResponses as jest.Mock).mockResolvedValue({ responses: [], canReviewPermission: true })
})
it("derives read scope and distinguishes read access from write availability", async () => {
  ;(observeModuleAccess as jest.Mock).mockImplementation(({ accessIntent }) => ({ allowed: accessIntent === "read" }))
  expect(await listCustomerStatementResponsesAction({ customerId: "customer" })).toMatchObject({ success: true, data: { canReview: false } })
  expect(listCustomerStatementResponses).toHaveBeenCalledWith({ customerId: "customer" }, { organizationId: "org", actorId: "actor" })
  expect(requireFreshAuth).not.toHaveBeenCalled()
})
it("requires fresh authentication and uses its bound session for decisions", async () => {
  const input = { actionId: "response" }
  expect((await reviewCustomerStatementResponseAction(input)).success).toBe(true)
  expect(requireFreshAuth).toHaveBeenCalledWith(300)
  expect(reviewCustomerStatementResponse).toHaveBeenCalledWith(input, { organizationId: "org", actorId: "actor", sessionId: "session" })
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ accessIntent: "write", mode: "enforce" }))
})
it.each(["actor", "tenant"])("rejects a mismatched fresh-auth %s", async field => {
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { userId: field === "actor" ? "other" : "actor", tenantId: field === "tenant" ? "other" : "org", sessionId: "session", lastAuthAt: new Date().toISOString() } })
  expect((await reviewCustomerStatementResponseAction({})).success).toBe(false)
  expect(reviewCustomerStatementResponse).not.toHaveBeenCalled()
})
it.each(["customers.read", "accounting.exports.create"])("rejects missing %s before a decision", async missing => {
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org", userId: "actor", permissions: permissions.filter(p => p !== missing) })
  expect((await reviewCustomerStatementResponseAction({})).success).toBe(false)
  expect(reviewCustomerStatementResponse).not.toHaveBeenCalled()
})
it("denies history when the accounting module is unavailable", async () => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
  expect((await getCustomerStatementResponseHistoryAction({})).success).toBe(false)
  expect(getCustomerStatementResponseHistory).not.toHaveBeenCalled()
})
it("returns a query failure with no successful empty data", async () => {
  ;(listCustomerStatementResponses as jest.Mock).mockRejectedValue(new Error("unavailable"))
  expect(await listCustomerStatementResponsesAction({})).toMatchObject({ success: false, data: null })
})
