jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: {} }))
import type { AccountantComment, Prisma } from "@prisma/client"
import { CLOSE_HISTORY_APPROVED, CLOSE_HISTORY_PROPOSED, CLOSE_HISTORY_CLOSED, closeHistoryDecisionSchema, readCloseHistoryOutcome, closeHistoryRecordHash, closeHistoryValueHash, readResolvedCloseEvidence, proposeCloseHistorySchema } from "../close-evidence-resolution-records"
const at = new Date("2026-10-04T00:00:00Z")
const record = (id: string) => ({ id, organizationId: "org", findingId: "finding", periodId: "period", closeRunId: "run", visibility: "CLIENT_ACTION_REQUIRED", authorId: "owner", body: "retained", metadata: { proof: id }, createdAt: at, updatedAt: at, evidenceItemId: null, reviewId: null, correlationId: id } as AccountantComment)
const request = record("request"), excluded = record("excluded")
const command = { periodId: "period", requestId: "request", expectedRevision: "a".repeat(64), correlationId: "key", selectedRequestId: "request", selectedResponseId: null, selectedAcceptanceId: null, reason: "Duplicate retained from legacy processing", exclusions: [{ id: "excluded", reason: "Duplicate record retained for audit review" }] }
const proposal = { version: 1, command, findingId: "finding", closeRunId: "run", previousApprovalId: null, sourceHashes: [request, excluded].map(row => ({ id: row.id, hash: closeHistoryRecordHash(row) })) }
const approved = { id: "approval", organizationId: "org", action: CLOSE_HISTORY_APPROVED, resourceType: "CloseAssuranceFinding", resourceId: "finding", actorId: "checker", createdAt: new Date(at.getTime() + 1000), metadata: { version: 1, proposalId: "proposal", proposerId: "maker", command: { proposalId: "proposal", correlationId: "approval-key", notes: "Independent duplicate evidence review" }, proposal } }
const tx = { ledgerAuditEvent: { findMany: jest.fn(), findFirst: jest.fn() }, accountantComment: { findMany: jest.fn() } }
const read = () => readResolvedCloseEvidence(tx as unknown as Prisma.TransactionClient, "org", "finding")
beforeEach(() => { jest.resetAllMocks(); tx.ledgerAuditEvent.findMany.mockResolvedValue([approved]); tx.ledgerAuditEvent.findFirst.mockResolvedValue({ id: "proposal", actorId: "maker", createdAt: at, metadata: proposal }); tx.accountantComment.findMany.mockResolvedValue([request, excluded]) })
test("without a retained approval, no records are silently selected", async () => {
  tx.ledgerAuditEvent.findMany.mockResolvedValue([]); expect(await read()).toBeNull(); expect(tx.accountantComment.findMany).not.toHaveBeenCalled()
})
test("only approved exclusions are removed from processing and later evidence stays visible", async () => {
  tx.accountantComment.findMany.mockResolvedValue([request, excluded, record("later")])
  expect(await read()).toMatchObject({ approvalId: "approval", excludedIds: ["excluded"], records: [request, record("later")] })
  expect(tx.ledgerAuditEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", action: CLOSE_HISTORY_APPROVED, resourceType: "CloseAssuranceFinding", resourceId: "finding" } }))
  expect(tx.ledgerAuditEvent.findFirst).toHaveBeenCalledWith({ where: { id: "proposal", organizationId: "org", action: CLOSE_HISTORY_PROPOSED, resourceType: "CloseAssuranceFinding", resourceId: "finding" } })
})
test.each(["selected", "excluded", "missing", "overflow"])("changed %s evidence invalidates the entire selection", async kind => {
  tx.accountantComment.findMany.mockResolvedValue(kind === "missing" ? [request] : kind === "overflow" ? Array.from({ length: 101 }, (_, i) => record(String(i))) : [{ ...request, body: kind === "selected" ? "changed" : request.body }, { ...excluded, metadata: kind === "excluded" ? {} : excluded.metadata }])
  await expect(read()).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
})
test.each(["same-actor", "missing-proposal", "changed-proposal", "malformed-approval"])("refuses %s authorization without ignoring history", async kind => {
  if (kind === "same-actor") tx.ledgerAuditEvent.findMany.mockResolvedValue([{ ...approved, actorId: "maker" }])
  if (kind === "missing-proposal") tx.ledgerAuditEvent.findFirst.mockResolvedValue(null)
  if (kind === "changed-proposal") tx.ledgerAuditEvent.findFirst.mockResolvedValue({ actorId: "maker", createdAt: at, metadata: { ...proposal, closeRunId: "other" } })
  if (kind === "malformed-approval") tx.ledgerAuditEvent.findMany.mockResolvedValue([{ ...approved, metadata: {} }])
  await expect(read()).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
})
test("canonical hashing survives JSONB key ordering and binds nested changes", () => {
  expect(closeHistoryValueHash({ b: { y: 2, x: 1 }, a: at })).toBe(closeHistoryValueHash({ a: at.toISOString(), b: { x: 1, y: 2 } }))
  expect(closeHistoryValueHash({ a: 1 })).not.toBe(closeHistoryValueHash({ a: 2 }))
})
test("strict commands require an explicit reason for every exclusion and reject client authority", () => {
  expect(proposeCloseHistorySchema.safeParse(command).success).toBe(true)
  for (const value of [{ ...command, actorId: "forged" }, { ...command, exclusions: [] }, { ...command, exclusions: [{ id: "excluded", reason: "short" }] }]) expect(proposeCloseHistorySchema.safeParse(value).success).toBe(false)
})
test("history query failure is not an empty approval history", async () => {
  tx.ledgerAuditEvent.findMany.mockRejectedValue(new Error("unavailable")); await expect(read()).rejects.toThrow("unavailable")
})

test.each(["WITHDRAWN", "REJECTED"] as const)("retains %s reason and reference with scope and proposer binding", async decision => {
  const retained = { id: "proposal", actorId: "maker", createdAt: at, metadata: proposal }
  const closed = { ...approved, id: "closed", action: CLOSE_HISTORY_CLOSED, actorId: decision === "WITHDRAWN" ? "maker" : "checker", metadata: {
    version: 1, proposalId: "proposal", proposerId: "maker", proposalHash: closeHistoryValueHash(proposal), command: { proposalId: "proposal", correlationId: "close-key", decision, reason: "This pending selection needs revision" },
  } }
  tx.ledgerAuditEvent.findMany.mockResolvedValue([closed])
  expect(await readCloseHistoryOutcome(tx as unknown as Prisma.TransactionClient, "org", "finding", retained)).toMatchObject({ id: "closed", state: decision, reason: closed.metadata.command.reason })
  for (const change of [{ actorId: decision === "WITHDRAWN" ? "checker" : "maker" }, { organizationId: "foreign" }, { createdAt: at }, { metadata: { ...closed.metadata, proposalHash: "b".repeat(64) } }]) {
    tx.ledgerAuditEvent.findMany.mockResolvedValue([{ ...closed, ...change }])
    await expect(readCloseHistoryOutcome(tx as unknown as Prisma.TransactionClient, "org", "finding", retained)).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
  }
  tx.ledgerAuditEvent.findMany.mockResolvedValue([closed, approved])
  await expect(readCloseHistoryOutcome(tx as unknown as Prisma.TransactionClient, "org", "finding", retained)).rejects.toMatchObject({ code: "REVIEW_REQUIRED" })
})

test("closing commands reject client authority, short reasons and unsupported states", () => {
  const value = { proposalId: "proposal", correlationId: "key", decision: "WITHDRAWN", reason: "Revise the proposed selection" }
  expect(closeHistoryDecisionSchema.safeParse(value).success).toBe(true)
  for (const extra of [{ actorId: "forged" }, { organizationId: "foreign" }, { reason: "short" }, { decision: "APPROVED" }]) expect(closeHistoryDecisionSchema.safeParse({ ...value, ...extra }).success).toBe(false)
})
