import { suspenseEvidenceHash, suspenseEvidenceRevision, suspensePostingSourceHash, type SuspenseReviewSource } from "../payment-suspense-evidence"

const now = new Date("2026-09-09T12:00:00Z")
const item: SuspenseReviewSource = { id: "s1", organizationId: "o1", providerAccountId: "p1", reconciliationRunId: null, status: "RESOLUTION_PROPOSED", type: "UNKNOWN_CREDIT", amount: "100.25", currencyCode: "XAF", ownerId: "u1", suspenseLedgerAccountId: "a1", updatedAt: now, metadata: { reclassification: { proposedById: "maker", reason: "Evidence A" } } }
describe("suspense review evidence", () => {
  it("retains the same hash after JSON object key reordering", () => {
    expect(suspenseEvidenceHash({ b: { d: 2, c: 1 }, a: 3 })).toBe(suspenseEvidenceHash({ a: 3, b: { c: 1, d: 2 } }))
  })
  it.each([
    { organizationId: "foreign" }, { amount: "101.25" }, { currencyCode: "EUR" },
    { suspenseLedgerAccountId: "other" }, { ownerId: "other" }, { status: "ASSIGNED" },
    { updatedAt: new Date(now.getTime() + 1) }, { metadata: { reclassification: { proposedById: "maker", reason: "Evidence B" } } },
  ])("changes the reviewed revision when source or proposal evidence changes: %p", patch => {
    expect(suspenseEvidenceRevision({ ...item, ...patch }, now)).not.toBe(suspenseEvidenceRevision(item, now))
  })
  it("requires renewed review across a posting-day change for standalone suspense", () => {
    expect(suspenseEvidenceRevision(item, new Date("2026-09-10"))).not.toBe(suspenseEvidenceRevision(item, now))
  })
  it("uses a linked run business date rather than the current clock", () => {
    const linked = { ...item, reconciliationRunId: "run", reconciliationRun: { businessDate: now } }
    expect(suspenseEvidenceRevision(linked, new Date("2026-09-10"))).toBe(suspenseEvidenceRevision(linked, now))
  })
  it("keeps posting-source identity stable across its own terminal transition", () => {
    expect(suspensePostingSourceHash({ ...item, status: "POSTED_TO_SUSPENSE", updatedAt: new Date(), metadata: { postingApproval: {} } }, now)).toBe(suspensePostingSourceHash(item, now))
  })
})
