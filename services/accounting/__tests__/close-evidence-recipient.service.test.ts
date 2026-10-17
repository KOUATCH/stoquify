jest.mock("server-only", () => ({}))
import type { Prisma } from "@prisma/client"
import { CLOSE_RECIPIENT_REPLACED, readCloseEvidenceRecipient } from "../close-evidence-recipient.service"

const request = { id: "request", organizationId: "org", findingId: "finding", periodId: "period", closeRunId: "run", createdAt: new Date("2026-10-01T12:00:00Z"), metadata: { requestedFromId: "original" } }
const change = (sequence = 1) => ({ id: `change-${sequence}`, organizationId: "org", actorId: "assigner", action: CLOSE_RECIPIENT_REPLACED, resourceType: "AccountantComment", resourceId: "request", createdAt: new Date(`2026-10-01T12:0${sequence}:00Z`),
  metadata: { version: 1, sequence, requestId: "request", findingId: "finding", periodId: "period", closeRunId: "run", originalRecipientId: "original", fromId: sequence === 1 ? "original" : `recipient-${sequence - 1}`, toId: `recipient-${sequence}`, previousRevision: sequence === 1 ? "request" : `change-${sequence - 1}`, reason: "Previous recipient has left the organization.", correlationId: `corr-${sequence}` } })
const tx = { ledgerAuditEvent: { findMany: jest.fn() } }
const read = () => readCloseEvidenceRecipient(tx as unknown as Prisma.TransactionClient, request)
beforeEach(() => { jest.resetAllMocks() })
test("retains the original recipient when no change exists", async () => {
  tx.ledgerAuditEvent.findMany.mockResolvedValue([])
  expect(await read()).toMatchObject({ recipientId: "original", revision: "request", sequence: 0, reason: null })
  expect(tx.ledgerAuditEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", action: CLOSE_RECIPIENT_REPLACED, resourceType: "AccountantComment", resourceId: "request" }, take: 2 }))
})
test("resolves a first and subsequent retained change without rewriting the original request", async () => {
  const original = JSON.stringify(request)
  for (const rows of [[change()], [change(2), change(1)], [change(3), change(2)]]) {
    tx.ledgerAuditEvent.findMany.mockResolvedValue(rows)
    expect(await read()).toMatchObject({ originalRecipientId: "original", recipientId: rows[0].metadata.toId, revision: rows[0].id, sequence: rows[0].metadata.sequence })
  }
  expect(JSON.stringify(request)).toBe(original)
})
test.each([
  { organizationId: "foreign" }, { actorId: null }, { resourceId: "foreign" }, { createdAt: new Date("2020-01-01") },
  { metadata: { ...change().metadata, periodId: "foreign" } }, { metadata: { ...change().metadata, originalRecipientId: "foreign" } },
  { metadata: { ...change().metadata, toId: "original" } }, { metadata: { ...change().metadata, previousRevision: "other" } },
  { metadata: { ...change().metadata, reason: "" } }, { metadata: { ...change().metadata, sequence: 2 } },
])("refuses an invalid current assignment record", async override => {
  tx.ledgerAuditEvent.findMany.mockResolvedValue([{ ...change(), ...override }])
  await expect(read()).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
})
test.each(["gap", "predecessor", "owner", "clock"])("refuses a conflicting %s transition", async fault => {
  const current = change(2)
  if (fault === "gap") current.metadata.sequence = 3
  if (fault === "predecessor") current.metadata.previousRevision = "other"
  if (fault === "owner") current.metadata.fromId = "other"
  if (fault === "clock") current.createdAt = change(1).createdAt
  tx.ledgerAuditEvent.findMany.mockResolvedValue([current, change(1)])
  await expect(read()).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
})
test("propagates source failure instead of falling back to original authority", async () => {
  tx.ledgerAuditEvent.findMany.mockRejectedValue(new Error("source unavailable"))
  await expect(read()).rejects.toThrow("source unavailable")
})
