import { parseSuspenseCorrectionRecord, suspenseCorrectionRecordRevision } from "../payment-suspense-correction-record"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"
import { suspenseCorrectionExportSchema } from "../payment-suspense-correction.contracts"
const hash = "sha256:" + "a".repeat(64)
const body = { kind: "SUSPENSE_CORRECTION_PROPOSED_V1", suspenseItemId: "item", cycle: 1, proposedById: "proposer", originalJournalId: "journal", originalJournalHash: hash,
  originalApproval: { inboxItemId: "approval", approvedById: "checker", proposedById: "maker", ledgerPostingBatchId: "batch", reviewedRevision: hash, sourceHash: hash, proposalHash: hash, approvedAt: "2026-09-09T10:00:00Z" },
  draft: { suspenseItemId: "item", reason: "Correct retained source", reversalDate: "2026-09-09" }, proposedAt: "2026-09-09T11:00:00Z", originalPostedById: "checker", originalPostingBatchId: "batch", financialHash: hash, requestHash: hash }
const row = { id: "record", externalId: "item", payloadSummary: body, payloadHash: suspenseEvidenceHash(body).slice(7), createdAt: new Date("2026-09-09T11:00:00Z") }
it("rejects altered bytes, malformed cycles and foreign source linkage", () => {
  expect(parseSuspenseCorrectionRecord(row).cycle).toBe(1)
  expect(() => parseSuspenseCorrectionRecord({ ...row, externalId: "foreign" })).toThrow()
  expect(() => parseSuspenseCorrectionRecord({ ...row, payloadSummary: { ...body, proposedById: "forged" } })).toThrow()
  const malformed = { ...body, cycle: -1 }
  expect(() => parseSuspenseCorrectionRecord({ ...row, payloadSummary: malformed, payloadHash: suspenseEvidenceHash(malformed).slice(7) })).toThrow()
})
it("binds preview revision to record identity, payload and recorded time", () => {
  const revision = suspenseCorrectionRecordRevision(row)
  for (const changed of [{ ...row, id: "other" }, { ...row, payloadHash: "b".repeat(64) }, { ...row, createdAt: new Date("2026-09-10") }]) expect(suspenseCorrectionRecordRevision(changed)).not.toBe(revision)
})
it("requires a stable export UUID/revision and rejects client authority", () => {
  const command = { suspenseItemId: "item", recordId: "record", expectedRevision: hash, idempotencyKey: "abcde123-1234-4123-8123-abcdef123456" }
  expect(suspenseCorrectionExportSchema.safeParse(command).success).toBe(true)
  for (const changed of [{ ...command, idempotencyKey: "random" }, { ...command, expectedRevision: "" }, { ...command, actorId: "forged" }, { ...command, lastAuthAt: Date.now() }]) expect(suspenseCorrectionExportSchema.safeParse(changed).success).toBe(false)
})
