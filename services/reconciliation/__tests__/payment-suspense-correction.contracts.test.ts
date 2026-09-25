import { suspenseCorrectionDraftSchema, suspenseCorrectionProposalSchema, suspenseCorrectionDecisionSchema } from "../payment-suspense-correction.contracts"
import { suspenseApprovalKey, suspensePostingDate, suspensePostingSourceHash, type SuspenseReviewSource } from "../payment-suspense-evidence"

const draft = { suspenseItemId: "suspense", reason: "Incorrect source classification", reversalDate: "2026-09-09" }
const reviewed = { ...draft, expectedRevision: `sha256:${"a".repeat(64)}`, idempotencyKey: "abcde123-1234-4123-8123-abcdef123456" }
const decision = { suspenseItemId: "suspense", proposalId: "proposal", expectedRevision: reviewed.expectedRevision, decision: "APPROVE", reason: "Independent reviewed correction" }

describe("suspense correction public contracts", () => {
  it.each(["2026-02-30", "2026-13-01", "2026-09-09T10:00:00Z", "09/09/2026"])("rejects invalid or ambiguous accounting date %s", reversalDate => {
    expect(suspenseCorrectionDraftSchema.safeParse({ ...draft, reversalDate }).success).toBe(false)
  })
  it.each(["actorId", "organizationId", "actorPermissions", "lastAuthAt", "postingCycle", "ledgerPostingBatchId"])("does not accept client authority or reserved financial field %s", field => {
    expect(suspenseCorrectionProposalSchema.safeParse({ ...reviewed, [field]: "client-supplied" }).success).toBe(false)
    expect(suspenseCorrectionDecisionSchema.safeParse({ ...decision, [field]: "client-supplied" }).success).toBe(false)
  })
  it("requires the reviewed revision and stable proposal UUID", () => {
    expect(suspenseCorrectionProposalSchema.safeParse(reviewed).success).toBe(true)
    expect(suspenseCorrectionProposalSchema.safeParse({ ...reviewed, idempotencyKey: "random" }).success).toBe(false)
    expect(suspenseCorrectionProposalSchema.safeParse({ ...reviewed, expectedRevision: "" }).success).toBe(false)
    expect(suspenseCorrectionDecisionSchema.safeParse({ ...decision, reason: " " }).success).toBe(false)
  })
})

describe("cycle-aware source evidence compatibility", () => {
  const now = new Date("2026-09-09T12:00:00Z")
  const item: SuspenseReviewSource = { id: "s", organizationId: "o", providerAccountId: null, reconciliationRunId: "run", status: "REOPENED", type: "OTHER", amount: "100.25", currencyCode: "XAF", ownerId: null, suspenseLedgerAccountId: "account", updatedAt: now, metadata: {}, reconciliationRun: { businessDate: new Date("2026-08-10") } }
  const cycle = { number: 2, postingDate: "2026-09-09", previousPostingBatchId: "original", reversalJournalEntryId: "reversal", correctionReceiptId: "receipt" }
  it("retains original approval keys and run dates for historical first-cycle items", () => {
    expect(suspenseApprovalKey(item)).toBe("s:posting-approval")
    expect(suspensePostingDate(item, now).toISOString().slice(0, 10)).toBe("2026-08-10")
  })
  it("uses the reviewed correction date and a distinct approval receipt for later cycles", () => {
    const corrected = { ...item, metadata: { postingCycle: cycle } }
    expect(suspenseApprovalKey(corrected)).toBe("s:posting-approval:cycle:2")
    expect(suspensePostingDate(corrected, now).toISOString().slice(0, 10)).toBe("2026-09-09")
    expect(suspensePostingSourceHash(corrected, now)).not.toBe(suspensePostingSourceHash(item, now))
    expect(suspensePostingSourceHash({ ...corrected, metadata: { postingCycle: { ...cycle, correctionReceiptId: "another" } } }, now)).not.toBe(suspensePostingSourceHash(corrected, now))
  })
  it("rejects corrupted cycle state instead of silently falling back to a historical posting", () => {
    expect(() => suspenseApprovalKey({ ...item, metadata: { postingCycle: { number: 2 } } })).toThrow()
    expect(() => suspensePostingDate({ ...item, metadata: { postingCycle: { ...cycle, number: 1 } } }, now)).toThrow()
  })
})
