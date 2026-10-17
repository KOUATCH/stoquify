jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, SESSION_ASSURANCE_LEVEL: { PASSWORD: 1 } }))
jest.mock("@/services/_shared/protect", () => ({ protect: jest.fn((policy, handler) => { const s = globalThis as any; (s.preparationPolicies ??= []).push(policy); return (input: unknown) => handler(input, s.preparationContext) }) }))
jest.mock("@/services/reconciliation/reconciliation-run-preparation.service", () => ({ previewReconciliationPreparation: jest.fn(), prepareReconciliationRun: jest.fn(), readReconciliationPreparation: jest.fn() }))
jest.mock("@/services/reconciliation/reconciliation-additional-sources.service", () => ({ previewAdditionalReconciliationSources: jest.fn(), incorporateAdditionalReconciliationSources: jest.fn() }))
import { previewReconciliationPreparationAction, prepareReconciliationRunAction, readReconciliationPreparationAction, previewAdditionalReconciliationSourcesAction, incorporateAdditionalReconciliationSourcesAction } from "../reconciliation-preparation.actions"
import { previewAdditionalReconciliationSources, incorporateAdditionalReconciliationSources } from "@/services/reconciliation/reconciliation-additional-sources.service"
import { previewReconciliationPreparation, prepareReconciliationRun, readReconciliationPreparation } from "@/services/reconciliation/reconciliation-run-preparation.service"
const store = globalThis as any, now = new Date()
const command = { runId: "run", reason: "Reviewed original source and current obligations", expectedRevision: "sha256:" + "a".repeat(64), idempotencyKey: "01386bb6-b3bd-4985-9f43-c83206764fbb" }
beforeEach(() => { jest.clearAllMocks(); store.preparationContext = { orgId: "org", userId: "actor", permissions: ["payments.reconciliation.run"], freshAuth: {
  lastAuthAt: now, claims: { userId: "actor", tenantId: "org", assuranceOrganizationId: "org", assuranceLevel: 1, lastAuthAt: now.getTime() },
} } })
it("enforces module read/write and fresh run authority", () => {
  expect(store.preparationPolicies).toHaveLength(5)
  expect(store.preparationPolicies[0]).toMatchObject({ permission: "payments.reconciliation.read", module: { accessIntent: "read", mode: "enforce" } })
  expect(store.preparationPolicies[1]).toMatchObject({ permission: "payments.reconciliation.run", module: { accessIntent: "write", mode: "enforce" }, freshAuth: { maxAgeSeconds: 300 } })
  expect(store.preparationPolicies[2]).toMatchObject({ permission: "payments.reconciliation.read", module: { accessIntent: "read", mode: "enforce" } })
  expect(store.preparationPolicies[3]).toMatchObject({ permission: "payments.reconciliation.run", module: { accessIntent: "read", mode: "enforce" } })
  expect(store.preparationPolicies[4]).toMatchObject({ permission: "payments.reconciliation.run", module: { accessIntent: "write", mode: "enforce" }, freshAuth: { maxAgeSeconds: 300 } })
})
it("binds preview and preparation to the server actor and organization", async () => {
  expect(await previewReconciliationPreparationAction({ runId: "run" })).toMatchObject({ scope: { organizationId: "org", actorId: "actor" } })
  await prepareReconciliationRunAction(command)
  await readReconciliationPreparationAction({ kind: "history", runId: "run" })
  expect(readReconciliationPreparation).toHaveBeenCalledWith({ kind: "history", runId: "run" }, expect.objectContaining({ organizationId: "org", actorId: "actor" }))
  expect(prepareReconciliationRun).toHaveBeenCalledWith(command, { organizationId: "org", actorId: "actor", actorPermissions: store.preparationContext.permissions, lastAuthAt: now })
  await previewAdditionalReconciliationSourcesAction({ runId: "run" })
  await incorporateAdditionalReconciliationSourcesAction(command)
  expect(previewAdditionalReconciliationSources).toHaveBeenCalledWith({ runId: "run" }, expect.objectContaining({ organizationId: "org", actorId: "actor" }))
  expect(incorporateAdditionalReconciliationSources).toHaveBeenCalledWith(command, { organizationId: "org", actorId: "actor", actorPermissions: store.preparationContext.permissions, lastAuthAt: now })
})
it.each(["organizationId", "actorId", "lastAuthAt", "permission"])("rejects injected %s", async key => {
  await expect(prepareReconciliationRunAction({ ...command, [key]: "forged" })).rejects.toThrow()
  await expect(previewReconciliationPreparationAction({ runId: "run", [key]: "forged" })).rejects.toThrow()
  await expect(readReconciliationPreparationAction({ kind: "runs", [key]: "forged" })).rejects.toThrow()
  await expect(previewAdditionalReconciliationSourcesAction({ runId: "run", [key]: "forged" })).rejects.toThrow()
  await expect(incorporateAdditionalReconciliationSourcesAction({ ...command, [key]: "forged" })).rejects.toThrow()
  expect(incorporateAdditionalReconciliationSources).not.toHaveBeenCalled()
  expect(prepareReconciliationRun).not.toHaveBeenCalled(); expect(previewReconciliationPreparation).not.toHaveBeenCalled()
})
it.each(["userId", "tenantId", "assuranceOrganizationId", "assuranceLevel", "lastAuthAt"])("rejects mismatched fresh %s", async key => {
  store.preparationContext.freshAuth.claims[key] = key === "assuranceLevel" || key === "lastAuthAt" ? 0 : "foreign"
  await expect(prepareReconciliationRunAction(command)).rejects.toThrow()
  await expect(incorporateAdditionalReconciliationSourcesAction(command)).rejects.toThrow()
  expect(incorporateAdditionalReconciliationSources).not.toHaveBeenCalled()
  expect(prepareReconciliationRun).not.toHaveBeenCalled()
})
