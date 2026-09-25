import { readSelfProfileDraft, saveSelfProfileDraft } from "../self-profile-draft"
const value = { expectedHash: "a".repeat(64), fields: { firstName: "", lastName: "Draft", jobTitle: "" }, pending: null }
beforeEach(() => { sessionStorage.clear(); jest.useRealTimers() })
it("isolates drafts by organization and actor, allowing temporarily incomplete edits", () => {
  saveSelfProfileDraft(sessionStorage, "org", "actor", value)
  expect(readSelfProfileDraft(sessionStorage, "org", "actor")).toMatchObject(value)
  expect(readSelfProfileDraft(sessionStorage, "foreign", "actor")).toBeNull()
  expect(readSelfProfileDraft(sessionStorage, "org", "foreign")).toBeNull()
})
it("retains the exact original request for recovery and clears it after receipt", () => {
  const fields = { ...value.fields, firstName: "Alex" }, pending = { requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", expectedHash: value.expectedHash, fields }
  saveSelfProfileDraft(sessionStorage, "org", "actor", { ...value, fields, pending })
  expect(readSelfProfileDraft(sessionStorage, "org", "actor")?.pending).toEqual(pending)
  saveSelfProfileDraft(sessionStorage, "org", "actor", null)
  expect(readSelfProfileDraft(sessionStorage, "org", "actor")).toBeNull()
})
it("discards expired, future-dated and corrupt local metadata", () => {
  jest.useFakeTimers().setSystemTime(100000000)
  saveSelfProfileDraft(sessionStorage, "org", "actor", value)
  expect(readSelfProfileDraft(sessionStorage, "org", "actor", 100000000 + 86400001)).toBeNull()
  saveSelfProfileDraft(sessionStorage, "org", "actor", value)
  expect(readSelfProfileDraft(sessionStorage, "org", "actor", 99999999)).toBeNull()
  saveSelfProfileDraft(sessionStorage, "org", "actor", value)
  sessionStorage.setItem(sessionStorage.key(0)!, "{broken")
  expect(readSelfProfileDraft(sessionStorage, "org", "actor")).toBeNull()
})
