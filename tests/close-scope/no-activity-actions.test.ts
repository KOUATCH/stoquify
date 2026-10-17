jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/lib/security/auth-session", () => ({ SESSION_ASSURANCE_LEVEL: { PASSWORD: 1 } }))
jest.mock("@/services/_shared/protect", () => {
  const state = { context: {} as any, policies: [] as any[] }
  return { state, protect: (policy: unknown, handler: Function) => { state.policies.push(policy); return (input: unknown) => handler(input, state.context) } }
})
jest.mock("@/services/reconciliation/no-activity-evidence.service", () => ({
  ...jest.requireActual("@/services/reconciliation/no-activity-evidence.service"),
  proposeNoActivityEvidence: jest.fn(), decideNoActivityEvidence: jest.fn(), readNoActivityEvidence: jest.fn(),
}))
import { proposeNoActivityEvidenceAction, decideNoActivityEvidenceAction, readNoActivityEvidenceAction } from "@/actions/payments/no-activity-evidence.actions"
import { decideNoActivityEvidence, readNoActivityEvidence, proposeNoActivityEvidence } from "@/services/reconciliation/no-activity-evidence.service"
import { SESSION_ASSURANCE_LEVEL } from "@/lib/security/auth-session"
const state = jest.requireMock("@/services/_shared/protect").state
const decision = { evidenceId: "evidence", expectedEvidenceHash: "sha256:" + "a".repeat(64), decision: "APPROVE" }
beforeEach(() => {
  jest.clearAllMocks()
  const now = new Date()
  state.context = { orgId: "server-org", userId: "server-reviewer", permissions: ["payments.reconciliation.sign"], freshAuth: { lastAuthAt: now, claims: { userId: "server-reviewer", tenantId: "server-org", assuranceOrganizationId: "server-org", assuranceLevel: SESSION_ASSURANCE_LEVEL.PASSWORD, lastAuthAt: +now } } }
})
it("registers fresh permission and module enforcement for each mutation", () => {
  expect(state.policies).toEqual(expect.arrayContaining([
    expect.objectContaining({ permission: "payments.reconciliation.run", freshAuth: { maxAgeSeconds: 300 }, module: expect.objectContaining({ mode: "enforce", accessIntent: "write" }) }),
    expect.objectContaining({ permission: "payments.reconciliation.sign", freshAuth: { maxAgeSeconds: 300 }, module: expect.objectContaining({ mode: "enforce", accessIntent: "write" }) }),
    expect.objectContaining({ permission: "payments.reconciliation.read", module: expect.objectContaining({ mode: "enforce", accessIntent: "read" }) }),
  ]))
})
it("uses only the authenticated tenant and actor and rejects client authority fields", async () => {
  await decideNoActivityEvidenceAction(decision)
  expect(decideNoActivityEvidence).toHaveBeenCalledWith(decision, expect.objectContaining({ organizationId: "server-org", actorId: "server-reviewer", lastAuthAt: state.context.freshAuth.lastAuthAt }))
  jest.mocked(decideNoActivityEvidence).mockClear()
  await expect(decideNoActivityEvidenceAction({ ...decision, organizationId: "foreign", actorId: "maker" })).rejects.toThrow()
  expect(decideNoActivityEvidence).not.toHaveBeenCalled()
})
it("rejects missing or cross-tenant assurance before invoking the evidence service", async () => {
  state.context.freshAuth.claims.assuranceOrganizationId = "foreign"
  await expect(decideNoActivityEvidenceAction(decision)).rejects.toThrow("Fresh")
  state.context.freshAuth = undefined
  await expect(proposeNoActivityEvidenceAction({})).rejects.toThrow("Fresh")
  expect(decideNoActivityEvidence).not.toHaveBeenCalled()
  expect(proposeNoActivityEvidence).not.toHaveBeenCalled()
})
it("reads the reviewable proposal under the server-owned tenant", async () => {
  await readNoActivityEvidenceAction({ evidenceId: "evidence" })
  expect(readNoActivityEvidence).toHaveBeenCalledWith({ evidenceId: "evidence" }, expect.objectContaining({ organizationId: "server-org", actorId: "server-reviewer" }))
})
