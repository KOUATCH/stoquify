import { readStatementReview, saveStatementReview } from "../customer-statement-review-request"
const scope = { organizationId: "org", actorId: "actor", customerId: "customer" }
const draft = { actionId: "response", expectedStateHash: "a".repeat(64), outcome: "ACKNOWLEDGED" as const, reason: "Check source quantity" }
const command = { ...draft, customerId: "customer", requestId: "a0000000-0000-4000-8000-000000000001" }
beforeEach(() => sessionStorage.clear())
it("retains drafts without claiming a submitted decision", () => {
  saveStatementReview(sessionStorage, scope, { draft, command: null })
  expect(readStatementReview(sessionStorage, scope)).toEqual({ draft, command: null })
})
it("uses the immutable pending command when a separate draft differs", () => {
  saveStatementReview(sessionStorage, scope, { draft: { ...draft, reason: "different" }, command })
  expect(readStatementReview(sessionStorage, scope)).toEqual({ draft, command })
})
it("isolates recovery across tenants, actors and customers", () => {
  saveStatementReview(sessionStorage, scope, { draft, command })
  for (const other of [{ ...scope, organizationId: "other" }, { ...scope, actorId: "other" }, { ...scope, customerId: "other" }]) expect(readStatementReview(sessionStorage, other)).toEqual({ draft: null, command: null })
})
it("refuses malformed storage and unavailable persistence", () => {
  expect(() => readStatementReview({ getItem: () => "invalid" }, scope)).toThrow()
  expect(() => saveStatementReview({ setItem: () => { throw new Error("quota") }, removeItem: jest.fn() }, scope, { draft, command })).toThrow("quota")
})
it("removes recovery only when explicitly cleared", () => {
  saveStatementReview(sessionStorage, scope, { draft, command })
  saveStatementReview(sessionStorage, scope, { draft: null, command: null })
  expect(readStatementReview(sessionStorage, scope)).toEqual({ draft: null, command: null })
})
