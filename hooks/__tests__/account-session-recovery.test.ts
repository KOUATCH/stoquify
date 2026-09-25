import { readAccountSessionRequest, saveAccountSessionRequest } from "../account-session-recovery"
const command = { requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", expectedHash: "a".repeat(64) }
beforeEach(() => sessionStorage.clear())
it("keeps only command identity scoped to the same account, organization and requesting session", () => {
  saveAccountSessionRequest(sessionStorage, "org", "actor", "session", command)
  expect(readAccountSessionRequest(sessionStorage, "org", "actor", "session")).toEqual(command)
  expect(readAccountSessionRequest(sessionStorage, "foreign", "actor", "session")).toBeNull()
  expect(readAccountSessionRequest(sessionStorage, "org", "foreign", "session")).toBeNull()
  expect(readAccountSessionRequest(sessionStorage, "org", "actor", "new-session")).toBeNull()
  expect(JSON.parse(sessionStorage.getItem(sessionStorage.key(0)!)!)).toEqual({ savedAt: expect.any(Number), command })
})
it("expires retry metadata after 24 hours", () => {
  saveAccountSessionRequest(sessionStorage, "org", "actor", "session", command)
  expect(readAccountSessionRequest(sessionStorage, "org", "actor", "session", Date.now() + 86400001)).toBeNull()
  expect(sessionStorage.length).toBe(0)
})
it("clears invalid saved commands and completed requests", () => {
  saveAccountSessionRequest(sessionStorage, "org", "actor", "session", command)
  sessionStorage.setItem(sessionStorage.key(0)!, "invalid")
  expect(readAccountSessionRequest(sessionStorage, "org", "actor", "session")).toBeNull()
  saveAccountSessionRequest(sessionStorage, "org", "actor", "session", command)
  saveAccountSessionRequest(sessionStorage, "org", "actor", "session", null)
  expect(sessionStorage.length).toBe(0)
})
