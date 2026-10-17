import { closeRecoveryDraftKey, readCloseRecoveryDraft, saveCloseRecoveryDraft, type CloseRecoveryDraft } from "../accounting/close-evidence-resolution-draft"

const scope = { organizationId: "org", actorId: "reviewer", periodId: "period", requestId: "request" }
const value: CloseRecoveryDraft = { revision: "a".repeat(64), selected: { request: "request", response: "", acceptance: "" }, reason: "Unfinished investigation", exclusions: { excluded: "Needs further source review" }, notes: {}, closeReasons: {}, pending: null }
beforeEach(() => sessionStorage.clear())
test("drafts are isolated by server-owned user, organization, period and request", () => {
  saveCloseRecoveryDraft(sessionStorage, scope, value)
  expect(readCloseRecoveryDraft(sessionStorage, scope)).toMatchObject(value)
  for (const key of ["organizationId", "actorId", "periodId", "requestId"] as const) expect(readCloseRecoveryDraft(sessionStorage, { ...scope, [key]: "other" })).toBeNull()
  expect(closeRecoveryDraftKey({ ...scope, actorId: "a:b", periodId: "c" })).not.toBe(closeRecoveryDraftKey({ ...scope, actorId: "a", periodId: "b:c" }))
})
test.each(["expired", "future", "malformed", "password", "authority", "scope", "revision"])("rejects %s saved data without restoring a command", kind => {
  const now = Date.now(), pending = { kind: "propose", input: { periodId: "period", requestId: "request", expectedRevision: value.revision, selectedRequestId: "request", selectedResponseId: null, selectedAcceptanceId: null, reason: "Retain valid source request", exclusions: [{ id: "excluded", reason: "Retain duplicate without processing" }], correlationId: "retry-key" } }
  const raw = { ...value, version: 1, savedAt: now, pending }
  if (kind === "expired") raw.savedAt = now - 86400001
  if (kind === "future") raw.savedAt = now + 1
  if (kind === "password") Object.assign(raw, { password: "never persist" })
  if (kind === "authority") Object.assign(pending.input, { actorId: "forged" })
  if (kind === "scope") pending.input.requestId = "other"
  if (kind === "revision") pending.input.expectedRevision = "b".repeat(64)
  sessionStorage.setItem(closeRecoveryDraftKey(scope), kind === "malformed" ? "{" : JSON.stringify(raw))
  expect(readCloseRecoveryDraft(sessionStorage, scope, now)).toBeNull(); expect(sessionStorage.getItem(closeRecoveryDraftKey(scope))).toBeNull()
})
test("valid pending decisions retain exact input and removal clears only this draft", () => {
  const pending = { kind: "close" as const, input: { proposalId: "proposal", decision: "REJECTED" as const, reason: "Independent review found an incorrect selection", correlationId: "same-key" } }
  saveCloseRecoveryDraft(sessionStorage, scope, { ...value, pending }); sessionStorage.setItem("unrelated", "keep")
  expect(readCloseRecoveryDraft(sessionStorage, scope)?.pending).toEqual(pending)
  saveCloseRecoveryDraft(sessionStorage, scope, null); expect(readCloseRecoveryDraft(sessionStorage, scope)).toBeNull(); expect(sessionStorage.getItem("unrelated")).toBe("keep")
})
test("unavailable storage is reported to the caller rather than treated as saved", () => {
  const store = { getItem: () => { throw new Error("denied") }, setItem: () => { throw new Error("full") }, removeItem: jest.fn() }
  expect(() => readCloseRecoveryDraft(store, scope)).toThrow("denied"); expect(() => saveCloseRecoveryDraft(store, scope, value)).toThrow("full")
})
