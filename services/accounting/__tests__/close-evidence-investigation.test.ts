jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: {} }))
import type { Prisma } from "@prisma/client"
import { readCloseEvidenceInvestigationInTx } from "../close-evidence-investigation"
const at = new Date("2026-10-04T00:00:00Z")
const request = { id: "request", organizationId: "org", periodId: "period", closeRunId: "run", findingId: "finding", authorId: "author", body: "Retained request", visibility: "CLIENT_ACTION_REQUIRED", correlationId: "key", createdAt: at, updatedAt: at,
  metadata: { requestType: "MISSING_CLOSE_EVIDENCE", requestedFromId: "owner", correlationId: "key", privateData: "PRIVATE-METADATA" } }
const finding = { id: "finding", periodId: "period", closeRunId: "run", title: "Finding", status: "ASSIGNED", ownerId: "owner", resolvedAt: null, updatedAt: at }
const tx = { accountantComment: { findFirst: jest.fn(), findMany: jest.fn() }, closeAssuranceFinding: { findFirst: jest.fn() }, ledgerAuditEvent: { findMany: jest.fn() } }
const read = () => readCloseEvidenceInvestigationInTx(tx as unknown as Prisma.TransactionClient, "org", "period", "request")
beforeEach(() => { jest.resetAllMocks(); tx.accountantComment.findFirst.mockResolvedValue(request); tx.accountantComment.findMany.mockResolvedValue([request]); tx.closeAssuranceFinding.findFirst.mockResolvedValue(finding); tx.ledgerAuditEvent.findMany.mockResolvedValue([]) })
test("uses tenant/period authority anchors, retains malformed history and redacts private metadata", async () => {
  tx.accountantComment.findMany.mockResolvedValue([request, { ...request, id: "duplicate", periodId: "wrong", metadata: {} }])
  const result = await read()
  expect(result.issues).toEqual(expect.arrayContaining(["MULTIPLE_REQUESTS", "SCOPE_MISMATCH", "MALFORMED_RECORD", "ASSIGNMENT_HISTORY"]))
  expect(result.records).toHaveLength(2)
  expect(tx.accountantComment.findFirst).toHaveBeenCalledWith({ where: { id: "request", organizationId: "org", periodId: "period", visibility: "CLIENT_ACTION_REQUIRED" } })
  expect(tx.closeAssuranceFinding.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "finding", organizationId: "org", periodId: "period" } }))
  expect(tx.accountantComment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", findingId: "finding", visibility: { in: expect.any(Array) } }, take: 101 }))
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE-METADATA|authorId|metadata|ownerId/)
})
test.each(["request", "finding"])("refuses absent or foreign %s before exposing evidence", async key => {
  if (key === "request") tx.accountantComment.findFirst.mockResolvedValue(null)
  else tx.closeAssuranceFinding.findFirst.mockResolvedValue(null)
  await expect(read()).rejects.toMatchObject({ code: "NOT_FOUND" }); expect(tx.accountantComment.findMany).not.toHaveBeenCalled()
})
test("snapshot changes for private source changes and finding changes, but not the observation time", async () => {
  const original = await read(); expect((await read()).revision).toBe(original.revision)
  tx.accountantComment.findMany.mockResolvedValue([{ ...request, metadata: { ...request.metadata, privateData: "changed" } }])
  expect((await read()).revision).not.toBe(original.revision)
  tx.accountantComment.findMany.mockResolvedValue([request]); tx.closeAssuranceFinding.findFirst.mockResolvedValue({ ...finding, status: "IN_REVIEW" })
  expect((await read()).revision).not.toBe(original.revision)
})
test("detects linked evidence outside the finding without fetching it", async () => {
  tx.accountantComment.findMany.mockResolvedValue([request, { ...request, id: "response", visibility: "CLIENT_RESPONSE_SUBMITTED", metadata: { responseType: "MISSING_CLOSE_EVIDENCE_RESPONSE", correlationId: "key", requestId: "foreign", requestCorrelationId: "key" } }])
  expect((await read()).records[1].issues).toContain("BROKEN_LINK")
  expect(tx.accountantComment.findFirst).toHaveBeenCalledTimes(1)
})
test("marks capped evidence incomplete rather than implying a complete snapshot", async () => {
  tx.accountantComment.findMany.mockResolvedValue(Array.from({ length: 101 }, (_, i) => ({ ...request, id: String(i), visibility: "CLIENT_RESPONSE_SUBMITTED" })))
  const result = await read(); expect(result.truncated).toBe(true); expect(result.records).toHaveLength(100); expect(result.counts.responses).toBe(100); expect(result.issues).toContain("TRUNCATED")
})
test("retains only safe assignment references and marks capped history incomplete", async () => {
  tx.ledgerAuditEvent.findMany.mockImplementation(query => query.take === 2 ? [] : Array.from({ length: 101 }, (_, i) => ({ id: String(i), resourceId: "request", actorId: "PRIVATE-ACTOR", metadata: { secret: "PRIVATE-METADATA" }, createdAt: at })))
  const result = await read(); expect(result.truncated).toBe(true); expect(result.assignmentChanges).toHaveLength(100)
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE/)
})
test("does not turn a failed history read into a clean snapshot", async () => {
  tx.ledgerAuditEvent.findMany.mockRejectedValue(new Error("history unavailable"))
  await expect(read()).rejects.toThrow("history unavailable")
})
