jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: {} }))
import type { Prisma } from "@prisma/client"
import { readCloseEvidenceRequestTrackingInTx } from "../close-evidence-request-tracking"
import { closeEvidenceNextCursor } from "../close-evidence-pagination"

const actor = { organizationId: "org", actorId: "requester" }, at = new Date("2026-10-03T12:00:00Z")
const comment = { organizationId: "org", periodId: "period", closeRunId: "run", findingId: "finding", createdAt: at }
const request = { ...comment, id: "request", authorId: "requester", visibility: "CLIENT_ACTION_REQUIRED", body: "Original authored request", correlationId: "req-key",
  metadata: { requestType: "MISSING_CLOSE_EVIDENCE", requestedById: "requester", requestedFromId: "owner", correlationId: "req-key", dueAt: "2026-10-04T12:00:00Z" } }
const response = { ...comment, id: "response", authorId: "owner", visibility: "CLIENT_RESPONSE_SUBMITTED", body: "PRIVATE RESPONSE", correlationId: "resp-key",
  metadata: { responseType: "MISSING_CLOSE_EVIDENCE_RESPONSE", requestId: "request", requestCorrelationId: "req-key", requestedById: "requester", requestedFromId: "owner", respondedById: "owner", correlationId: "resp-key" } }
const binding = { kind: "CLOSE_EVIDENCE_REPLACEMENT", version: 1, organizationId: "org", periodId: "period", findingId: "finding", originalRunId: "run", originalChecklistId: "old", replacementRunId: "new", replacementChecklistId: "new-check",
  originalFindingHash: "a".repeat(64), originalChecklistHash: "b".repeat(64), replacementReceiptHash: "c".repeat(64), originalEvidence: [{ id: "proof", hash: "d".repeat(64) }] }
const acceptance = { ...comment, id: "acceptance", authorId: "reviewer", visibility: "ACCOUNTANT_RESPONSE_ACCEPTED", body: "PRIVATE REVIEW NOTES", correlationId: "accept-key",
  metadata: { acceptanceType: "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE", requestId: "request", responseId: "response", requestCorrelationId: "req-key", responseCorrelationId: "resp-key", findingId: "finding", periodId: "period", closeRunId: "run", respondedById: "owner", acceptedById: "reviewer", decision: "ACCEPTED", findingStatus: "RESOLVED", resolvedAt: at.toISOString(), correlationId: "accept-key", replacementBinding: binding } }
const owner = { id: "owner", organizationId: "org", name: "Response owner", isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null,
  roles: [{ organizationId: "org", permissions: ["accounting.close.read", "accounting.close.finding.comment"] }] }
const fixture = (status = "ASSIGNED", comments: unknown[] = [request]) => ({ ...request, finding: { id: "finding", organizationId: "org", periodId: "period", closeRunId: "run", title: "Retained finding", ownerId: "owner", status, resolvedAt: status === "RESOLVED" ? at : null, comments } })
const tx = { accountantComment: { findMany: jest.fn() }, user: { findMany: jest.fn() }, ledgerAuditEvent: { findMany: jest.fn() } }
const read = (cursor?: string) => readCloseEvidenceRequestTrackingInTx(tx as unknown as Prisma.TransactionClient, actor, "period", cursor)
const supervise = (cursor?: string) => readCloseEvidenceRequestTrackingInTx(tx as unknown as Prisma.TransactionClient, { ...actor, actorId: "supervisor" }, "period", cursor, true)

test("supervision preserves original authorship and validates the linked response against it", async () => {
  tx.accountantComment.findMany.mockResolvedValue([fixture("IN_REVIEW", [request, response])])
  tx.user.findMany.mockResolvedValue([owner, { ...owner, id: "requester", name: "Former requester", isActive: false }])
  const result = await supervise()
  expect(result.items[0]).toMatchObject({ state: "AWAITING_REVIEW", requester: { name: "Former requester", available: false } })
  expect(tx.accountantComment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", periodId: "period", authorId: { not: "supervisor" }, visibility: "CLIENT_ACTION_REQUIRED" } }))
  expect(JSON.stringify(result)).not.toContain("PRIVATE RESPONSE")
  tx.accountantComment.findMany.mockResolvedValue([fixture("IN_REVIEW", [request, { ...response, metadata: { ...response.metadata, requestedById: "supervisor" } }])])
  expect((await supervise()).items[0].state).toBe("REVIEW_REQUIRED")
})

test("missing requester account is unknown and does not prevent supervision", async () => {
  const result = await supervise()
  expect(result.items[0]).toMatchObject({ state: "AWAITING_RESPONSE", requester: { name: null, available: null } })
  expect(tx.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", id: { in: ["owner", "requester"] } } }))
  expect((await read()).items[0]).not.toHaveProperty("requester")
})

test.each(["organizationId", "actorId", "periodId", "kind"])("supervision refuses another %s cursor before querying", async key => {
  const scope = { organizationId: "org", actorId: "supervisor", periodId: "period", kind: "supervision" as const }
  const cursor = closeEvidenceNextCursor({ ...scope, [key]: key === "kind" ? "tracking" : "other" }, { id: "last", createdAt: at })!
  await expect(supervise(cursor)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect(tx.accountantComment.findMany).not.toHaveBeenCalled()
})
beforeEach(() => { jest.resetAllMocks(); tx.ledgerAuditEvent.findMany.mockResolvedValue([]); tx.accountantComment.findMany.mockResolvedValue([fixture()]); tx.user.findMany.mockResolvedValue([owner]) })

test("restricts request discovery by current tenant, period and author with bounded nested evidence", async () => {
  expect((await read()).items[0]).toMatchObject({ state: "AWAITING_RESPONSE", recipientName: "Response owner", recipientAvailable: true })
  expect(tx.accountantComment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", periodId: "period", authorId: "requester", visibility: "CLIENT_ACTION_REQUIRED" }, take: 101,
    include: { finding: { select: expect.objectContaining({ comments: expect.objectContaining({ take: 4, where: expect.objectContaining({ organizationId: "org", periodId: "period" }) }) }) } } }))
})
test.each([["IN_REVIEW", [request, response], "AWAITING_REVIEW"], ["RESOLVED", [request, response, acceptance], "ACCEPTED"]])("derives retained %s status without private response or reviewer text", async (status, comments, expected) => {
  tx.accountantComment.findMany.mockResolvedValue([fixture(status as string, comments as unknown[])])
  const result = await read(); expect(result.items[0].state).toBe(expected)
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE|replacementBinding|requestedById|respondedById|acceptedById/)
})
test.each([null, { ...owner, isActive: false }, { ...owner, isLocked: true }, { ...owner, roles: [] }, { ...owner, roles: [{ organizationId: "foreign", permissions: ["*"] }] }])("retains the obligation while marking an ineligible owner unavailable", async candidate => {
  tx.user.findMany.mockResolvedValue(candidate ? [candidate] : [])
  expect((await read()).items[0]).toMatchObject({ state: "AWAITING_RESPONSE", recipientAvailable: false })
})
test.each([
  fixture("ASSIGNED", [request, { ...request, id: "duplicate" }]),
  fixture("IN_REVIEW", [request]),
  fixture("RESOLVED", [request, response]),
  fixture("RESOLVED", [request, response, { ...acceptance, metadata: { ...acceptance.metadata, replacementBinding: null } }]),
  fixture("RESOLVED", [request, response, { ...acceptance, metadata: { ...acceptance.metadata, responseId: "foreign" } }]),
  fixture("RESOLVED", [request, response, { ...acceptance, metadata: { ...acceptance.metadata, replacementBinding: { ...binding, organizationId: "foreign" } } }]),
  fixture("RESOLVED", [request, { ...response, metadata: { ...response.metadata, requestCorrelationId: "wrong" } }, acceptance]),
])("does not label malformed, missing or ambiguous evidence accepted", async row => {
  tx.accountantComment.findMany.mockResolvedValue([row])
  expect(await read()).toMatchObject({ evidenceIssue: true, items: [expect.objectContaining({ state: "REVIEW_REQUIRED", acceptedAt: null })] })
})
test("withholds a linked foreign finding's title", async () => {
  const row = fixture(); row.finding.organizationId = "foreign"; row.finding.title = "PRIVATE FOREIGN TITLE"; tx.accountantComment.findMany.mockResolvedValue([row])
  expect((await read()).items[0]).toMatchObject({ title: null, findingId: null, state: "REVIEW_REQUIRED" })
})
test("advances a page even if records need investigation and does not expand the colleague directory", async () => {
  tx.accountantComment.findMany.mockResolvedValue(Array.from({ length: 101 }, (_, i) => ({ ...fixture(), id: String(i), metadata: {} })))
  const result = await read(); expect(result.items).toHaveLength(100); expect(result.nextCursor).toBeTruthy(); expect(result.evidenceIssue).toBe(true)
  expect(tx.user.findMany).not.toHaveBeenCalled()
})
test("rejects another actor's continuation before reading records", async () => {
  const cursor = closeEvidenceNextCursor({ organizationId: "org", actorId: "foreign", periodId: "period", kind: "tracking" }, { id: "request", createdAt: at })!
  await expect(read(cursor)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" }); expect(tx.accountantComment.findMany).not.toHaveBeenCalled()
})
test("propagates a failed source query", async () => {
  tx.accountantComment.findMany.mockRejectedValue(new Error("unavailable")); await expect(read()).rejects.toThrow("unavailable")
})
