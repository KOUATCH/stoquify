jest.mock("@/services/_shared/protect", () => ({ protect: jest.fn((policy, handler) => { (globalThis as any).signReviewPolicy = policy; return (input: unknown) => handler(input, { orgId: "org", userId: "actor", permissions: ["payments.reconciliation.read", "payments.reconciliation.sign"] }) }) }))
jest.mock("@/services/reconciliation/payment-reconciliation-certification.service", () => ({ previewReconciliationSignOff: jest.fn() }))
jest.mock("../reconciliation.actions", () => ({ signReconciliationRunAction: jest.fn() }))
import { previewReconciliationSignOffAction, signReviewedReconciliationAction } from "../reconciliation-sign-review.actions"
import { previewReconciliationSignOff } from "@/services/reconciliation/payment-reconciliation-certification.service"
import { signReconciliationRunAction } from "../reconciliation.actions"
const command = { runId: "run", expectedSourceVersionHash: "sha256:" + "a".repeat(64), expectedEvidenceRevision: "sha256:" + "b".repeat(64), correlationId: "01386bb6-b3bd-4985-9f43-c83206764fbb" }
beforeEach(() => jest.clearAllMocks())
it("binds preview scope to current identity and an enforced read surface", async () => {
  expect((globalThis as any).signReviewPolicy).toMatchObject({ permission: "payments.reconciliation.sign", module: { mode: "enforce", accessIntent: "read" } })
  expect(await previewReconciliationSignOffAction({ runId: "run" })).toMatchObject({ scope: { organizationId: "org", actorId: "actor" } })
  expect(previewReconciliationSignOff).toHaveBeenCalledWith({ runId: "run", organizationId: "org", actorId: "actor", actorPermissions: ["payments.reconciliation.read", "payments.reconciliation.sign"] })
})
it("forwards the exact reviewed request to canonical fresh-auth signing", async () => {
  await signReviewedReconciliationAction(command); expect(signReconciliationRunAction).toHaveBeenCalledWith(command)
})
it.each(["actorId", "organizationId", "lastAuthAt", "actorPermissions"])("rejects injected %s before signing", async key => {
  await expect(signReviewedReconciliationAction({ ...command, [key]: "forged" })).rejects.toThrow()
  await expect(previewReconciliationSignOffAction({ runId: "run", [key]: "forged" })).rejects.toThrow()
  expect(signReconciliationRunAction).not.toHaveBeenCalled(); expect(previewReconciliationSignOff).not.toHaveBeenCalled()
})
it("refuses a reviewed write without its full evidence revision", async () => {
  const { expectedEvidenceRevision: _revision, ...missing } = command
  await expect(signReviewedReconciliationAction(missing)).rejects.toThrow(); expect(signReconciliationRunAction).not.toHaveBeenCalled()
})
