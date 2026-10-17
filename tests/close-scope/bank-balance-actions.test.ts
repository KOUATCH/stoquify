jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/lib/security/auth-session", () => ({ SESSION_ASSURANCE_LEVEL: { PASSWORD: 1 } }))
jest.mock("@/services/_shared/protect", () => {
  const state = { context: {} as any, policies: [] as any[] }
  return { state, protect: (policy: unknown, handler: Function) => { state.policies.push(policy); return (input: unknown) => handler(input, state.context) } }
})
jest.mock("@/services/reconciliation/bank-balance-evidence.service", () => ({
  ...jest.requireActual("@/services/reconciliation/bank-balance-evidence.service"),
  proposeBankBalanceEvidence: jest.fn(), decideBankBalanceEvidence: jest.fn(), readBankBalanceEvidence: jest.fn(),
}))
import { proposeBankBalanceEvidenceAction, decideBankBalanceEvidenceAction, readBankBalanceEvidenceAction } from "@/actions/payments/bank-balance-evidence.actions"
import { decideBankBalanceEvidence, readBankBalanceEvidence, proposeBankBalanceEvidence } from "@/services/reconciliation/bank-balance-evidence.service"
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
  await decideBankBalanceEvidenceAction(decision)
  expect(decideBankBalanceEvidence).toHaveBeenCalledWith(decision, expect.objectContaining({ organizationId: "server-org", actorId: "server-reviewer", lastAuthAt: state.context.freshAuth.lastAuthAt }))
  jest.mocked(decideBankBalanceEvidence).mockClear()
  await expect(decideBankBalanceEvidenceAction({ ...decision, organizationId: "foreign", actorId: "maker" })).rejects.toThrow()
  expect(decideBankBalanceEvidence).not.toHaveBeenCalled()
})
it("rejects missing or cross-tenant assurance before invoking the evidence service", async () => {
  state.context.freshAuth.claims.assuranceOrganizationId = "foreign"
  await expect(decideBankBalanceEvidenceAction(decision)).rejects.toThrow("Fresh")
  state.context.freshAuth = undefined
  await expect(proposeBankBalanceEvidenceAction({})).rejects.toThrow("Fresh")
  expect(decideBankBalanceEvidence).not.toHaveBeenCalled()
  expect(proposeBankBalanceEvidence).not.toHaveBeenCalled()
})
it("reads the reviewable proposal under the server-owned tenant", async () => {
  await readBankBalanceEvidenceAction({ evidenceId: "evidence" })
  expect(readBankBalanceEvidence).toHaveBeenCalledWith({ evidenceId: "evidence" }, expect.objectContaining({ organizationId: "server-org", actorId: "server-reviewer" }))
})
