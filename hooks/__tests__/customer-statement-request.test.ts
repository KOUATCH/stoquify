import { readStatementRequests, saveStatementRequests } from "../customer-statement-request"
const scope = { organizationId: "org", actorId: "actor", customerId: "customer" }
const statement = { customerId: "customer", periodStart: "2026-01-01T00:00:00.000Z", periodEnd: "2026-01-31T23:59:59.999Z", currency: "XAF", idempotencyKey: "statement-request", correlationId: "statement-correlation" }
const delivery = { statementSnapshotId: "snapshot", channel: "EMAIL" as const, destination: "recipient@example.invalid", consentBasis: "EXPLICIT" as const, consentEvidenceHash: "sha256:" + "a".repeat(64), consentCapturedAt: "2026-02-01T00:00:00.000Z", idempotencyKey: "delivery-request", correlationId: "delivery-correlation" }
beforeEach(() => sessionStorage.clear())
it("roundtrips exact commands without silently expiring an unresolved request", () => { saveStatementRequests(sessionStorage, scope, { statement, delivery }); expect(readStatementRequests(sessionStorage, scope)).toEqual({ statement, delivery }) })
it.each(["organizationId", "actorId", "customerId"])("isolates %s", field => { saveStatementRequests(sessionStorage, scope, { statement, delivery }); expect(readStatementRequests(sessionStorage, { ...scope, [field]: "other" })).toEqual({ statement: null, delivery: null }) })
it("rejects unreadable or additional secret fields without treating them as a fresh empty request", () => {
  saveStatementRequests(sessionStorage, scope, { statement, delivery })
  const key = sessionStorage.key(0)!
  sessionStorage.setItem(key, "broken")
  expect(() => readStatementRequests(sessionStorage, scope)).toThrow()
  sessionStorage.setItem(key, JSON.stringify({ version: 1, ...scope, statement, delivery, password: "never-retain" }))
  expect(() => readStatementRequests(sessionStorage, scope)).toThrow()
})
it("removes retained request details on an explicit new statement", () => { saveStatementRequests(sessionStorage, scope, { statement, delivery }); saveStatementRequests(sessionStorage, scope, { statement: null, delivery: null }); expect(sessionStorage.length).toBe(0) })
it("retains a historical reference and exact delivery command without a fabricated create command", () => {
  const saved = { statement: null, historicalStatementId: "snapshot", delivery }
  saveStatementRequests(sessionStorage, scope, saved)
  expect(readStatementRequests(sessionStorage, scope)).toEqual(saved)
  expect(sessionStorage.getItem(sessionStorage.key(0)!)).not.toContain("closingBalance")
})
it("rejects a historical reference that disagrees with the retained delivery", () => {
  saveStatementRequests(sessionStorage, scope, { statement: null, historicalStatementId: "another-snapshot", delivery })
  expect(() => readStatementRequests(sessionStorage, scope)).toThrow("scope mismatch")
})
it("retains an exact retry command across reload without a password or a cached outcome", () => {
  const retry = { customerId: "customer", statementId: "statement", deliveryId: "delivery", expectedRevision: "a".repeat(64), reason: "Setup reviewed", idempotencyKey: "a0000000-0000-4000-8000-000000000001" }
  saveStatementRequests(sessionStorage, scope, { statement: null, delivery: null, retry })
  expect(readStatementRequests(sessionStorage, scope)).toEqual({ statement: null, delivery: null, retry })
  const raw = sessionStorage.getItem(sessionStorage.key(0)!)!
  expect(raw).not.toMatch(/password|replayed|requestedAt/)
  sessionStorage.setItem(sessionStorage.key(0)!, raw.replace('"customerId":"customer","statementId"', '"customerId":"other","statementId"'))
  expect(() => readStatementRequests(sessionStorage, scope)).toThrow("retry scope mismatch")
})
