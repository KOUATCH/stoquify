jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, SESSION_ASSURANCE_LEVEL: { PASSWORD: 1 } }))
jest.mock("@/services/_shared/protect", () => ({ protect: jest.fn((options, handler) => { const store = globalThis as typeof globalThis & { linkOptions?: unknown[]; linkContext?: unknown }; (store.linkOptions ??= []).push(options); return async (input: unknown) => ({ success: true, data: await handler(input, store.linkContext) }) }) }))
jest.mock("@/services/reconciliation/payment-exception-link.service", () => ({ readReconciliationExceptionLink: jest.fn(), repairReconciliationExceptionLink: jest.fn() }))
import { readReconciliationExceptionLinkAction, repairReconciliationExceptionLinkAction } from "../exception-link.actions"
import { readReconciliationExceptionLink, repairReconciliationExceptionLink } from "@/services/reconciliation/payment-exception-link.service"
const store = globalThis as typeof globalThis & { linkOptions: unknown[]; linkContext: Record<string, unknown> }, now = new Date()
const command = { suspenseItemId: "item", reason: "Restore original evidence relationship", expectedRevision: "sha256:" + "a".repeat(64), idempotencyKey: "aabbccdd-1234-4123-8123-123456789abc" }
beforeEach(() => { jest.clearAllMocks(); store.linkContext = { orgId: "org", userId: "actor", permissions: ["payments.reconciliation.read", "payments.reconciliation.run"], freshAuth: { lastAuthAt: now, claims: { userId: "actor", tenantId: "org", assuranceOrganizationId: "org", assuranceLevel: 1, lastAuthAt: now.getTime() } } } })
it("declares read/write module boundaries and fresh repair authority", () => { expect(store.linkOptions).toEqual([expect.objectContaining({ permission: "payments.reconciliation.read", module: expect.objectContaining({ mode: "enforce", accessIntent: "read" }) }), expect.objectContaining({ permission: "payments.reconciliation.run", freshAuth: { maxAgeSeconds: 300 }, module: expect.objectContaining({ mode: "enforce", accessIntent: "write" }) })]) })
it("binds read and repair to server identity and returns current scope", async () => {
  expect(await readReconciliationExceptionLinkAction({ suspenseItemId: "item" })).toMatchObject({ data: { scope: { organizationId: "org", actorId: "actor" } } })
  await repairReconciliationExceptionLinkAction(command); expect(repairReconciliationExceptionLink).toHaveBeenCalledWith(command, expect.objectContaining({ organizationId: "org", actorId: "actor", lastAuthAt: now }))
})
it.each(["actorId", "organizationId", "lastAuthAt", "permission"])("refuses forged client %s", async key => { await expect(repairReconciliationExceptionLinkAction({ ...command, [key]: "forged" })).rejects.toThrow(); expect(repairReconciliationExceptionLink).not.toHaveBeenCalled(); await expect(readReconciliationExceptionLinkAction({ suspenseItemId: "item", [key]: "forged" })).rejects.toThrow(); expect(readReconciliationExceptionLink).not.toHaveBeenCalled() })
it.each(["userId", "tenantId", "assuranceOrganizationId", "assuranceLevel", "lastAuthAt"])("requires correctly bound fresh %s", async key => {
  const fresh = store.linkContext.freshAuth as { claims: Record<string, unknown> }; fresh.claims[key] = key === "assuranceLevel" || key === "lastAuthAt" ? 0 : "foreign"
  await expect(repairReconciliationExceptionLinkAction(command)).rejects.toThrow(); expect(repairReconciliationExceptionLink).not.toHaveBeenCalled()
})
