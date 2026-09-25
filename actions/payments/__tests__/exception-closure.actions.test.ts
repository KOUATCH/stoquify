jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, SESSION_ASSURANCE_LEVEL: { PASSWORD: 1 } }))
jest.mock("@/services/_shared/protect", () => ({ protect: jest.fn((options, handler) => { const store = globalThis as typeof globalThis & { closureOptions?: unknown[]; closureContext?: unknown }; (store.closureOptions ??= []).push(options); return async (input: unknown) => ({ success: true, data: await handler(input, store.closureContext) }) }) }))
jest.mock("@/services/reconciliation/payment-exception-closure.service", () => ({ previewExceptionClosure: jest.fn(), proposeExceptionClosure: jest.fn(), reviewExceptionClosure: jest.fn(), decideExceptionClosure: jest.fn(), listExceptionClosureCases: jest.fn(), readExceptionClosureHistory: jest.fn() }))
import { previewExceptionClosureAction, proposeExceptionClosureAction, reviewExceptionClosureAction, decideExceptionClosureAction, listExceptionClosureCasesAction, readExceptionClosureHistoryAction } from "../exception-closure.actions"
import { previewExceptionClosure, proposeExceptionClosure, reviewExceptionClosure, decideExceptionClosure, listExceptionClosureCases, readExceptionClosureHistory } from "@/services/reconciliation/payment-exception-closure.service"
const store = globalThis as typeof globalThis & { closureOptions: unknown[]; closureContext: Record<string, unknown> }, now = new Date()
const proposal = { exceptionId: "exception", reason: "Reviewed source and treatment", expectedRevision: "sha256:" + "a".repeat(64), idempotencyKey: "aabbccdd-1234-4123-8123-123456789abc" }
const decision = { exceptionId: "exception", proposalId: "proposal", reason: "Independent source review", expectedRevision: proposal.expectedRevision, decision: "APPROVE" }
beforeEach(() => { jest.clearAllMocks(); store.closureContext = { orgId: "org", userId: "actor", permissions: ["payments.reconciliation.read", "payments.reconciliation.exception.resolve", "accounting.journal.read"], freshAuth: { lastAuthAt: now, claims: { userId: "actor", tenantId: "org", assuranceOrganizationId: "org", assuranceLevel: 1, lastAuthAt: now.getTime() } } } })
it("declares enforced read/write boundaries and fresh exception-resolution authority", () => {
  expect(store.closureOptions).toHaveLength(6)
  for (const index of [0, 2, 4, 5]) expect(store.closureOptions[index]).toMatchObject({ permission: "payments.reconciliation.read", module: { accessIntent: "read", mode: "enforce" } })
  for (const index of [1, 3]) expect(store.closureOptions[index]).toMatchObject({ permission: "payments.reconciliation.exception.resolve", freshAuth: { maxAgeSeconds: 300 }, module: { accessIntent: "write", mode: "enforce" } })
})
it("binds all operations to server scope", async () => {
  expect(await previewExceptionClosureAction({ exceptionId: "exception" })).toMatchObject({ data: { scope: { organizationId: "org", actorId: "actor" } } })
  await proposeExceptionClosureAction(proposal); await reviewExceptionClosureAction({ exceptionId: "exception", proposalId: "proposal" }); await decideExceptionClosureAction(decision)
  const scope = expect.objectContaining({ organizationId: "org", actorId: "actor", actorPermissions: store.closureContext.permissions })
  expect(previewExceptionClosure).toHaveBeenCalledWith({ exceptionId: "exception" }, scope)
  expect(proposeExceptionClosure).toHaveBeenCalledWith(proposal, expect.objectContaining({ lastAuthAt: now }))
  expect(reviewExceptionClosure).toHaveBeenCalledWith("exception", "proposal", scope)
  expect(decideExceptionClosure).toHaveBeenCalledWith(decision, scope)
  expect(await listExceptionClosureCasesAction({})).toMatchObject({ data: { scope: { organizationId: "org", actorId: "actor" } } })
  await readExceptionClosureHistoryAction({ exceptionId: "exception" })
  expect(listExceptionClosureCases).toHaveBeenCalledWith({ view: "OPEN" }, scope)
  expect(readExceptionClosureHistory).toHaveBeenCalledWith({ exceptionId: "exception" }, scope)
})
it.each(["actorId", "organizationId", "lastAuthAt", "permission"])("refuses injected client %s", async key => {
  await expect(proposeExceptionClosureAction({ ...proposal, [key]: "forged" })).rejects.toThrow()
  await expect(decideExceptionClosureAction({ ...decision, [key]: "forged" })).rejects.toThrow()
  await expect(listExceptionClosureCasesAction({ [key]: "forged" })).rejects.toThrow()
  await expect(readExceptionClosureHistoryAction({ exceptionId: "exception", [key]: "forged" })).rejects.toThrow()
  expect(listExceptionClosureCases).not.toHaveBeenCalled(); expect(readExceptionClosureHistory).not.toHaveBeenCalled()
  expect(proposeExceptionClosure).not.toHaveBeenCalled(); expect(decideExceptionClosure).not.toHaveBeenCalled()
})
it.each(["userId", "tenantId", "assuranceOrganizationId", "assuranceLevel", "lastAuthAt"])("binds fresh %s before writes", async key => {
  const fresh = store.closureContext.freshAuth as { claims: Record<string, unknown> }; fresh.claims[key] = key === "assuranceLevel" || key === "lastAuthAt" ? 0 : "foreign"
  await expect(proposeExceptionClosureAction(proposal)).rejects.toThrow(); await expect(decideExceptionClosureAction(decision)).rejects.toThrow()
  expect(proposeExceptionClosure).not.toHaveBeenCalled(); expect(decideExceptionClosure).not.toHaveBeenCalled()
})
