jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/lib/security/auth-session", () => ({ SESSION_ASSURANCE_LEVEL: { PASSWORD: 1 } }))
jest.mock("@/services/_shared/protect", () => {
  const state = { context: {} as any, policies: [] as any[] }
  return { state, protect: (policy: unknown, handler: Function) => { state.policies.push(policy); return (input: unknown) => handler(input, state.context) } }
})
jest.mock("@/services/accounting/balance-sheet-evidence.service", () => ({
  ...jest.requireActual("@/services/accounting/balance-sheet-evidence.service"),
  proposeBalanceSheetEvidence: jest.fn(), decideBalanceSheetEvidence: jest.fn(), readBalanceSheetEvidence: jest.fn(),
}))
import { proposeBalanceSheetEvidenceAction, decideBalanceSheetEvidenceAction, readBalanceSheetEvidenceAction } from "@/actions/accounting/balance-sheet-evidence.actions"
import { decideBalanceSheetEvidence, readBalanceSheetEvidence, proposeBalanceSheetEvidence } from "@/services/accounting/balance-sheet-evidence.service"
import { SESSION_ASSURANCE_LEVEL } from "@/lib/security/auth-session"
const state = jest.requireMock("@/services/_shared/protect").state
const decision = { evidenceId: "evidence", expectedEvidenceHash: "sha256:" + "a".repeat(64), decision: "APPROVE" }
beforeEach(() => {
  jest.clearAllMocks()
  const now = new Date()
  state.context = { orgId: "server-org", userId: "server-reviewer", permissions: ["accounting.close.certify"], freshAuth: { lastAuthAt: now, claims: { userId: "server-reviewer", tenantId: "server-org", assuranceOrganizationId: "server-org", assuranceLevel: SESSION_ASSURANCE_LEVEL.PASSWORD, lastAuthAt: +now } } }
})
it("registers fresh permission and module enforcement for each mutation", () => {
  expect(state.policies).toEqual(expect.arrayContaining([
    expect.objectContaining({ permission: "accounting.close.run", freshAuth: { maxAgeSeconds: 300 }, module: expect.objectContaining({ mode: "enforce", accessIntent: "write" }) }),
    expect.objectContaining({ permission: "accounting.close.certify", freshAuth: { maxAgeSeconds: 300 }, module: expect.objectContaining({ mode: "enforce", accessIntent: "write" }) }),
    expect.objectContaining({ permission: "accounting.close.read", module: expect.objectContaining({ mode: "enforce", accessIntent: "read" }) }),
  ]))
})
it("uses only the authenticated tenant and actor and rejects client authority fields", async () => {
  await decideBalanceSheetEvidenceAction(decision)
  expect(decideBalanceSheetEvidence).toHaveBeenCalledWith(decision, expect.objectContaining({ organizationId: "server-org", actorId: "server-reviewer", lastAuthAt: state.context.freshAuth.lastAuthAt }))
  jest.mocked(decideBalanceSheetEvidence).mockClear()
  await expect(decideBalanceSheetEvidenceAction({ ...decision, organizationId: "foreign", actorId: "maker" })).rejects.toThrow()
  expect(decideBalanceSheetEvidence).not.toHaveBeenCalled()
})
it("rejects missing or cross-tenant assurance before invoking the evidence service", async () => {
  state.context.freshAuth.claims.assuranceOrganizationId = "foreign"
  await expect(decideBalanceSheetEvidenceAction(decision)).rejects.toThrow("Fresh")
  state.context.freshAuth = undefined
  await expect(proposeBalanceSheetEvidenceAction({})).rejects.toThrow("Fresh")
  expect(decideBalanceSheetEvidence).not.toHaveBeenCalled()
  expect(proposeBalanceSheetEvidence).not.toHaveBeenCalled()
})
it("reads the reviewable proposal under the server-owned tenant", async () => {
  await readBalanceSheetEvidenceAction({ evidenceId: "evidence" })
  expect(readBalanceSheetEvidence).toHaveBeenCalledWith({ evidenceId: "evidence" }, expect.objectContaining({ organizationId: "server-org", actorId: "server-reviewer" }))
})
