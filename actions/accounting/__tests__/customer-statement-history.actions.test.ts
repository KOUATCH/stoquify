import { getCustomerStatementRecordAction, listCustomerStatementHistoryAction, retryCustomerStatementDeliveryAction } from "../customer-statement-history.actions"
import { retryCustomerStatementDelivery } from "@/services/accounting/customer-statement-retry.service"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { getCustomerStatementRecord, listCustomerStatementHistory } from "@/services/accounting/customer-statement-history.service"
import { requirePermission, RbacError, auditRbacDecision } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => {
  class Denied extends Error { constructor(message: string, public code: string, public status: number) { super(message) } }
  return { RbacError: Denied, isRbacError: (e: unknown) => e instanceof Denied, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn(), auditRbacDecision: jest.fn(), canUsePermission: (ctx: { permissions: string[] }, permission: string) => ctx.permissions.includes(permission) }
})
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/accounting/customer-statement-history.service", () => ({ ...jest.requireActual("@/services/accounting/customer-statement-history.service"), getCustomerStatementRecord: jest.fn(), listCustomerStatementHistory: jest.fn() }))
jest.mock("@/services/accounting/customer-statement-retry.service", () => ({ retryCustomerStatementDelivery: jest.fn() }))
const list = listCustomerStatementHistory as jest.Mock, read = getCustomerStatementRecord as jest.Mock, permission = requirePermission as jest.Mock, moduleAccess = observeModuleAccess as jest.Mock
beforeEach(() => { jest.clearAllMocks(); (requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { lastAuthAt: new Date().toISOString() } }); permission.mockResolvedValue({ orgId: "org", userId: "actor", permissions: ["customers.read", "accounting.exports.create"] }); moduleAccess.mockResolvedValue({ allowed: true }); list.mockResolvedValue({ statements: [] }); read.mockResolvedValue({ statement: { statementId: "s1" } }) })
it("derives tenant scope from current identity and checks module read access", async () => {
  expect((await listCustomerStatementHistoryAction({ customerId: "customer" })).success).toBe(true)
  expect(list).toHaveBeenCalledWith({ organizationId: "org", customerId: "customer", limit: 10 })
  expect(moduleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org", accessIntent: "read", mode: "enforce" }))
  await getCustomerStatementRecordAction({ customerId: "customer", statementId: "s1" })
  expect(read).toHaveBeenCalledWith({ organizationId: "org", customerId: "customer", statementId: "s1", limit: 10 })
})
it("denies missing accounting permission before reading data", async () => {
  permission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
  expect((await listCustomerStatementHistoryAction({ customerId: "customer" })).success).toBe(false)
  expect(moduleAccess).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled()
})
it("audits missing customer read permission without enumerating history", async () => {
  permission.mockResolvedValue({ orgId: "org", userId: "actor", permissions: ["accounting.exports.create"] })
  expect((await listCustomerStatementHistoryAction({ customerId: "customer" })).success).toBe(false)
  expect(auditRbacDecision).toHaveBeenCalledWith(expect.objectContaining({ permission: "customers.read", result: "denied" })); expect(list).not.toHaveBeenCalled()
})
it("denies unavailable modules before record access", async () => {
  moduleAccess.mockResolvedValue({ allowed: false })
  expect((await getCustomerStatementRecordAction({ customerId: "customer", statementId: "s1" })).success).toBe(false); expect(read).not.toHaveBeenCalled()
})
it("rejects injected scope rather than accepting a client authority claim", async () => {
  expect((await listCustomerStatementHistoryAction({ customerId: "customer", organizationId: "org", actorId: "other" })).success).toBe(false); expect(list).not.toHaveBeenCalled()
})
it("returns a failure response when the history service fails", async () => {
  list.mockRejectedValue(new Error("database failure"))
  const result = await listCustomerStatementHistoryAction({ customerId: "customer" })
  expect(result.success).toBe(false); expect(result.data).toBeNull()
})
const retryInput = { customerId: "customer", statementId: "s1", deliveryId: "d1", expectedRevision: "a".repeat(64), reason: "Setup reviewed", idempotencyKey: "a0000000-0000-4000-8000-000000000001" }
it("guards retry with fresh authentication, export authority and current tenant", async () => {
  (retryCustomerStatementDelivery as jest.Mock).mockResolvedValue({ deliveryId: "d1", replayed: false })
  expect((await retryCustomerStatementDeliveryAction(retryInput)).success).toBe(true)
  expect(requireFreshAuth).toHaveBeenCalledWith(300)
  expect(moduleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org", accessIntent: "export", mode: "enforce" }))
  expect(retryCustomerStatementDelivery).toHaveBeenCalledWith({ ...retryInput, organizationId: "org", actorId: "actor" })
})
it("denies direct retry under read-only or missing customer authority", async () => {
  moduleAccess.mockResolvedValue({ allowed: false })
  expect((await retryCustomerStatementDeliveryAction(retryInput)).success).toBe(false)
  moduleAccess.mockResolvedValue({ allowed: true }); permission.mockResolvedValue({ orgId: "org", userId: "actor", permissions: ["accounting.exports.create"] })
  expect((await retryCustomerStatementDeliveryAction(retryInput)).success).toBe(false)
  expect(retryCustomerStatementDelivery).not.toHaveBeenCalled()
})
it("rejects client-supplied scope in retry", async () => {
  expect((await retryCustomerStatementDeliveryAction({ ...retryInput, actorId: "other", organizationId: "other" })).success).toBe(false)
  expect(retryCustomerStatementDelivery).not.toHaveBeenCalled()
})
