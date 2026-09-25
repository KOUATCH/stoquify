import { readSuspenseRecovery, saveSuspenseRecovery, suspenseRecoveryKey } from "../suspense-recovery"

const scope = { organizationId: "org-1", actorId: "actor-1" }
const saved = { drafts: { item1: { targetType: "UNKNOWN_CREDIT", reason: "Keep original evidence", expectedEvidenceRevision: `sha256:${"a".repeat(64)}`, idempotencyKey: "proposal-request-1234", suspenseLedgerAccountId: "account-1" } }, approval: { suspenseItemId: "item2", expectedEvidenceRevision: `sha256:${"b".repeat(64)}` } }
beforeEach(() => sessionStorage.clear())
it("roundtrips exact request references and clears only its own recovery after completion", () => {
  sessionStorage.setItem("unrelated", "keep")
  saveSuspenseRecovery(sessionStorage, scope, saved)
  expect(readSuspenseRecovery(sessionStorage, scope)).toEqual(saved)
  saveSuspenseRecovery(sessionStorage, scope, { drafts: {}, approval: null })
  expect(readSuspenseRecovery(sessionStorage, scope)).toEqual({ drafts: {}, approval: null })
  expect(sessionStorage.getItem("unrelated")).toBe("keep")
})
it.each([{ organizationId: "other", actorId: scope.actorId }, { ...scope, actorId: "other" }])("isolates recovery from %p", other => {
  saveSuspenseRecovery(sessionStorage, scope, saved)
  expect(readSuspenseRecovery(sessionStorage, other)).toEqual({ drafts: {}, approval: null })
  sessionStorage.setItem(suspenseRecoveryKey(other), sessionStorage.getItem(suspenseRecoveryKey(scope))!)
  expect(() => readSuspenseRecovery(sessionStorage, other)).toThrow("scope mismatch")
})
it.each(["not json", "x".repeat(300001), JSON.stringify({ version: 1, ...scope, ...saved, password: "do not retain" }), JSON.stringify({ version: 1, ...scope, ...saved, approval: { suspenseItemId: "item2", expectedEvidenceRevision: "unverified" } })])("rejects invalid or excessive browser data", raw => {
  sessionStorage.setItem(suspenseRecoveryKey(scope), raw)
  expect(() => readSuspenseRecovery(sessionStorage, scope)).toThrow()
})
it("never adds source snapshots, passwords or authentication claims to the stored record", () => {
  saveSuspenseRecovery(sessionStorage, scope, saved)
  expect(Object.keys(JSON.parse(sessionStorage.getItem(suspenseRecoveryKey(scope))!)).sort()).toEqual(["actorId", "approval", "drafts", "organizationId", "version"])
  expect(Object.keys(readSuspenseRecovery(sessionStorage, scope).approval!).sort()).toEqual(["expectedEvidenceRevision", "suspenseItemId"])
})
it("reports unavailable storage rather than claiming a request was retained", () => {
  expect(() => saveSuspenseRecovery({ setItem: () => { throw new Error("Quota") }, removeItem: jest.fn() }, scope, saved)).toThrow("Quota")
})
