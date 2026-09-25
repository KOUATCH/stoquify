import { parseSuspenseResolutionRecord, suspenseResolutionRecordRevision } from "../payment-suspense-resolution-record"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"
const hash = "sha256:" + "a".repeat(64)
const body = { kind: "SUSPENSE_RESOLUTION_PROPOSED_V1", draft: { suspenseItemId: "item", clearingJournalId: "clearing", outcome: "RESOLVED", reason: "Retained source evidence" }, originalJournalId: "original", cycle: 1,
  financialHash: hash, proposedById: "maker", proposedAt: "2026-09-09T10:00:00Z", requestHash: hash }
const row = (payload: unknown = body) => ({ id: "record", externalId: "item", idempotencyKey: "suspense-resolution-proposal:request", payloadSummary: payload, payloadHash: suspenseEvidenceHash(payload).slice(7), createdAt: new Date("2026-09-09T10:00:00Z") })
it("retains explicit proposal semantics and strips unrelated private payloads", () => {
  expect(parseSuspenseResolutionRecord(row({ ...body, privateCertificate: "DO NOT EXPORT" }))).toEqual(body)
})
it.each([{ cycle: 0 }, { proposedById: "" }, { financialHash: "made-up" }, { proposedAt: "unknown" }, { kind: "SUSPENSE_RESOLUTION_RECOVERED_V1" }])("rejects structurally invalid retained evidence even with a recomputed hash: %j", patch => {
  expect(() => parseSuspenseResolutionRecord(row({ ...body, ...patch }))).toThrow()
})
it("rejects changed bytes, wrong source and mismatched record namespaces", () => {
  expect(() => parseSuspenseResolutionRecord({ ...row(), payloadHash: "b".repeat(64) })).toThrow()
  expect(() => parseSuspenseResolutionRecord({ ...row(), externalId: "other" })).toThrow()
  expect(() => parseSuspenseResolutionRecord({ ...row(), idempotencyKey: "suspense-resolution-decision:request" })).toThrow()
})
it("binds decisions to their exact proposal and source", () => {
  const decision = { ...body, kind: "SUSPENSE_RESOLUTION_APPROVED_V1", suspenseItemId: "item", proposalId: "proposal", decidedById: "checker", decidedAt: body.proposedAt, reason: "Independent review", commandHash: hash, reviewedRevision: hash, allocationId: "allocation" }
  expect(parseSuspenseResolutionRecord({ ...row(decision), idempotencyKey: "suspense-resolution-decision:proposal" }).kind).toBe(decision.kind)
  expect(() => parseSuspenseResolutionRecord({ ...row(decision), idempotencyKey: "suspense-resolution-decision:other" })).toThrow()
  expect(() => parseSuspenseResolutionRecord({ ...row({ ...decision, suspenseItemId: "other" }), idempotencyKey: "suspense-resolution-decision:proposal" })).toThrow()
})
it("binds the exported revision to identity, payload and recorded time", () => {
  const before = row(), revision = suspenseResolutionRecordRevision(before)
  for (const after of [{ ...before, id: "other" }, { ...before, payloadHash: "b".repeat(64) }, { ...before, createdAt: new Date("2026-09-10") }]) expect(suspenseResolutionRecordRevision(after)).not.toBe(revision)
})
