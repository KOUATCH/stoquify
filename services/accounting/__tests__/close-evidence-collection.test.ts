jest.mock("server-only", () => ({}))

import {
  buildCloseEvidenceCollectionReceipt, isCloseEvidenceCollectionEligible, verifyCloseEvidenceCollectionReceipt,
  type CloseEvidenceCollectionChecklist, type CloseEvidenceCollectionRow,
} from "../close-evidence-collection"

const checklist: CloseEvidenceCollectionChecklist = {
  id: "checklist-1", organizationId: "org-1", periodId: "period-1", closeRunId: "run-1",
  key: "ledger-reconciliation", domain: "LEDGER", sourceService: "services/accounting/reconciliations.service.ts",
  status: "PASSED", detail: "Posted entries balance.", evidenceCount: 1, blockerReason: null,
}
const row: CloseEvidenceCollectionRow = {
  id: "evidence-1", organizationId: "org-1", periodId: "period-1", closeRunId: "run-1", checklistItemId: "checklist-1",
  findingId: null, evidenceType: "REPORT_EXPORT", sourceTable: "journal_entry_lines", sourceType: "TrialBalanceCurrency",
  sourceId: "XAF", sourceLabel: "Trial balance XAF: debit 10 / credit 10", sourceDate: new Date("2026-10-01T12:00:00.000Z"),
  sourceHash: null, available: true, provenance: "POSTED", unavailableReason: null,
  metadata: { summary: { credit: "10", debit: "10" }, currencies: ["XAF", "EUR"] }, correlationId: "collection-1",
}
const build = (rows: readonly CloseEvidenceCollectionRow[] = [row], control = checklist) =>
  buildCloseEvidenceCollectionReceipt(control, rows, true)

it("binds the exact collection while preserving absent domain hashes and input records", () => {
  const before = JSON.stringify({ checklist, row })
  const receipt = build()
  expect(receipt).toMatchObject({ version: 1, collectionSucceeded: true, hash: expect.stringMatching(/^[a-f0-9]{64}$/) })
  expect(receipt.evidence).toEqual([{ id: row.id, hash: expect.stringMatching(/^[a-f0-9]{64}$/) }])
  expect(verifyCloseEvidenceCollectionReceipt(checklist, [row], JSON.parse(JSON.stringify(receipt)))).toBe(true)
  expect(isCloseEvidenceCollectionEligible(checklist, [row])).toBe(true)
  expect(row.sourceHash).toBeNull()
  expect(JSON.stringify({ checklist, row })).toBe(before)
})

it("canonicalizes row order, JSON object order and source-date representations", () => {
  const other = { ...row, id: "evidence-2", sourceId: "EUR" }
  const equivalent = { ...row, sourceDate: "2026-10-01T14:00:00+02:00", metadata: { currencies: ["XAF", "EUR"], summary: { debit: "10", credit: "10" } } }
  expect(build([row, other])).toEqual(build([other, equivalent]))
})

it("does not bind mutable row timestamps or recursively include checklist receipt metadata", () => {
  const evidence = { ...row, createdAt: new Date(), updatedAt: new Date() }
  const control = { ...checklist, metadata: { collectionReceipt: build() }, ownerId: "new-owner", updatedAt: new Date() }
  expect(build([evidence], control)).toEqual(build())
})

it.each([
  ["source hash", { sourceHash: "different-domain-hash" }],
  ["source identifier", { sourceId: "EUR" }],
  ["source table", { sourceTable: "other_rows" }],
  ["source type", { sourceType: "OtherCollector" }],
  ["source date", { sourceDate: new Date("2026-10-02T12:00:00Z") }],
  ["source label", { sourceLabel: "Trial balance changed" }],
  ["availability", { available: false }],
  ["provenance", { provenance: "UNAVAILABLE" }],
  ["finding", { findingId: "finding-2" }],
  ["metadata", { metadata: { summary: { debit: "100", credit: "10" } } }],
  ["JSON array order", { metadata: { summary: { credit: "10", debit: "10" }, currencies: ["EUR", "XAF"] } }],
  ["correlation", { correlationId: "other-collection" }],
])("rejects changed %s", (_label, patch) => {
  expect(verifyCloseEvidenceCollectionReceipt(checklist, [{ ...row, ...patch }], build())).toBe(false)
})

it.each([
  { status: "WARNING" as const }, { detail: "Changed observation" }, { blockerReason: "Changed blocker" },
  { evidenceCount: 2 }, { key: "payment-reconciliation" }, { domain: "TAX" as const }, { sourceService: "other/service.ts" },
])("rejects changed checklist payload %j", patch => {
  expect(verifyCloseEvidenceCollectionReceipt({ ...checklist, ...patch }, [row], build())).toBe(false)
})

it.each(["organizationId", "periodId", "closeRunId", "checklistItemId"] as const)("rejects foreign %s before issuing a receipt", field => {
  const foreign = { ...row, [field]: "foreign-id" }
  expect(() => build([foreign])).toThrow(/foreign evidence/)
  expect(verifyCloseEvidenceCollectionReceipt(checklist, [foreign], build())).toBe(false)
  expect(isCloseEvidenceCollectionEligible(checklist, [foreign])).toBe(false)
})

it("rejects missing, extra and duplicate evidence rows or manifest entries", () => {
  const receipt = build()
  expect(verifyCloseEvidenceCollectionReceipt(checklist, [], receipt)).toBe(false)
  expect(verifyCloseEvidenceCollectionReceipt(checklist, [row, { ...row, id: "extra" }], receipt)).toBe(false)
  expect(() => build([row, row])).toThrow(/duplicate/)
  expect(verifyCloseEvidenceCollectionReceipt(checklist, [row, row], receipt)).toBe(false)
  expect(verifyCloseEvidenceCollectionReceipt(checklist, [row], { ...receipt, evidence: [...receipt.evidence, ...receipt.evidence] })).toBe(false)
  expect(verifyCloseEvidenceCollectionReceipt(checklist, [row], { ...receipt, evidence: [] })).toBe(false)
})

it.each([null, {}, { version: 2 }, { version: 1, hash: "untrusted", evidence: [] }])("rejects absent or malformed receipts %j", receipt => {
  expect(verifyCloseEvidenceCollectionReceipt(checklist, [row], receipt)).toBe(false)
})

it("requires explicit actual collector success, including for zero rows", () => {
  const empty = { ...checklist, evidenceCount: 0 }
  expect(() => buildCloseEvidenceCollectionReceipt(empty, [], false)).toThrow(/unsuccessful/)
  const receipt = build([], empty)
  expect(receipt.evidence).toEqual([])
  expect(verifyCloseEvidenceCollectionReceipt(empty, [], receipt)).toBe(true)
  expect(isCloseEvidenceCollectionEligible(empty, [])).toBe(true)
  expect(verifyCloseEvidenceCollectionReceipt(empty, [], { ...receipt, collectionSucceeded: false })).toBe(false)
  const { collectionSucceeded: _omitted, ...legacy } = receipt
  expect(verifyCloseEvidenceCollectionReceipt(empty, [], legacy)).toBe(false)
})

it("preserves failed-control state while allowing a successfully observed missing source to be replaced", () => {
  const failed = { ...checklist, status: "FAILED" as const, blockerReason: "Journal is unbalanced." }
  expect(verifyCloseEvidenceCollectionReceipt(failed, [row], build([row], failed))).toBe(true)
  expect(isCloseEvidenceCollectionEligible(failed, [row])).toBe(true)
  expect(failed.status).toBe("FAILED")
})

it.each([
  { key: "unknown-collector" }, { key: "period-state", sourceService: "services/accounting/periods.service.ts" },
  { key: "toString" }, { domain: "TAX" as const }, { sourceService: "other/service.ts" },
  { status: "UNAVAILABLE" as const }, { status: "NOT_APPLICABLE" as const },
])("does not offer replacement for an unsupported or unavailable collector %j", patch => {
  expect(isCloseEvidenceCollectionEligible({ ...checklist, ...patch }, [row])).toBe(false)
})

it.each([{ available: false }, { provenance: "UNAVAILABLE" }, { unavailableReason: "Collector failed." }])("does not offer unavailable evidence %j", patch => {
  expect(isCloseEvidenceCollectionEligible(checklist, [{ ...row, ...patch }])).toBe(false)
})

it("fails verification when a receipt is copied with a different fully consistent tenant or period chain", () => {
  for (const field of ["organizationId", "periodId", "closeRunId"] as const) {
    expect(verifyCloseEvidenceCollectionReceipt({ ...checklist, [field]: "other" }, [{ ...row, [field]: "other" }], build())).toBe(false)
  }
})
