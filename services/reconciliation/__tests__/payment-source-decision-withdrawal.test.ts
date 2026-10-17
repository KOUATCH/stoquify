jest.mock("server-only", () => ({}))
jest.mock("../payment-exception-source-evidence", () => ({ loadReconciliationExceptionLinkSourceInTx: jest.fn() }))
jest.mock("../payment-exception-closure-evidence.service", () => ({
  loadExceptionClosureReceiptInTx: jest.fn(),
  exceptionClosureStateHash: (row: any) => { const { updatedAt, ...value } = row; return require("../payment-suspense-evidence").suspenseEvidenceHash(JSON.parse(JSON.stringify(value))) },
}))
jest.mock("../payment-reconciliation-certification.service", () => ({ certificatePayloadHash: jest.fn(() => "retained-certificate-hash") }))
import { loadSourceDecisionWithdrawalInTx } from "../payment-source-decision-withdrawal"
import { loadReconciliationExceptionLinkSourceInTx } from "../payment-exception-source-evidence"
import { loadExceptionClosureReceiptInTx, exceptionClosureStateHash } from "../payment-exception-closure-evidence.service"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"

let exception: any, item: any, run: any, approval: any, proposal: any
const tx: any = { paymentException: { findFirst: jest.fn() }, ledgerPostingBatch: { count: jest.fn() }, ledgerAuditEvent: { findFirst: jest.fn() } }
beforeEach(() => {
  jest.clearAllMocks()
  exception = { id: "exception", type: "MANUAL_REVIEW_REQUIRED", evidence: { rule: "ADDITIONAL_EVIDENCE_FOR_RETAINED_SOURCE" }, status: "RESOLVED", suspenseItemId: "item", providerEventId: "event", statementLineId: null, metadata: { closureReceiptId: "approval" } }
  item = { id: "item", status: "RESOLVED", resolvedAt: new Date(), ledgerPostingBatchId: null, postedAt: null, metadata: { nonfinancialExceptionId: "exception", nonfinancialClosureReceiptId: "approval" } }
  run = { id: "run", status: "SIGNED", runById: "maker", signedById: "signer", signedAt: new Date(), certificateHash: "retained-certificate-hash", certificatePayload: { retained: true } }
  const sourceReview = { kind: "CORROBORATING_SOURCE_V1", sourceType: "PROVIDER_EVENT", sourceId: "event", matchId: "match", paymentId: "payment", amount: "100.25", currencyCode: "XAF", sourceHash: "sha256:" + "a".repeat(64), excludedApproverIds: ["maker", "recovery-actor"] }
  approval = { row: { id: "approval", payloadHash: "approval-hash", idempotencyKey: "exception-closure-decision:proposal" }, data: { kind: "EXCEPTION_CLOSURE_APPROVED_V1", exceptionId: "exception", proposalId: "proposal", proposedById: "proposer", decidedById: "approver", reviewedRevision: "original-revision", financial: null, sourceReview, sourceHash: sourceReview.sourceHash, afterExceptionHash: exceptionClosureStateHash(exception), afterSuspenseHash: exceptionClosureStateHash(item) } }
  proposal = { row: { id: "proposal", payloadHash: "proposal-hash", idempotencyKey: "exception-closure-proposal:request" }, data: { kind: "EXCEPTION_CLOSURE_PROPOSED_V1", exceptionId: "exception", proposedById: "proposer", reviewedRevision: "original-revision", financial: null, sourceReview, sourceHash: sourceReview.sourceHash } }
  tx.paymentException.findFirst.mockImplementation(async ({ where }: any) => where.organizationId === "org" && where.id === exception.id ? exception : null)
  tx.ledgerPostingBatch.count.mockResolvedValue(0); tx.ledgerAuditEvent.findFirst.mockResolvedValue({ id: "audit" })
  ;(loadReconciliationExceptionLinkSourceInTx as jest.Mock).mockImplementation(async () => ({ exception, item, run, references: [{ id: "event", currentStatus: "CHANGED_SINCE_APPROVAL" }], revision: suspenseEvidenceHash({ exception, item, run }) }))
  ;(loadExceptionClosureReceiptInTx as jest.Mock).mockImplementation(async (_tx, _org, _exception, id) => id === "approval" ? approval : proposal)
})
it("allows withdrawal of stale underlying evidence while retaining the signed certificate and independent actor exclusions", async () => {
  const result = await loadSourceDecisionWithdrawalInTx(tx, "org", "exception")
  expect(result.withdrawal).toMatchObject({ decisionId: "approval", decisionHash: "approval-hash", priorCertificateHash: "retained-certificate-hash", excludedApproverIds: ["approver", "maker", "recovery-actor", "signer"] })
  expect(result.financial).toBeNull(); expect(result.revision).toMatch(/^sha256:/)
})
it("binds the preview to the run state and the exact retained approval", async () => {
  const before = await loadSourceDecisionWithdrawalInTx(tx, "org", "exception")
  run.updatedAt = new Date(); approval.row.payloadHash = "later-approval-hash"
  expect((await loadSourceDecisionWithdrawalInTx(tx, "org", "exception")).revision).not.toBe(before.revision)
})
it.each([
  ["foreign workspace", () => tx.paymentException.findFirst.mockResolvedValue(null)],
  ["financial case", () => { exception.type = "AMOUNT_MISMATCH" }],
  ["already reopened", () => { exception.status = "REOPENED" }],
  ["posted suspense", () => { item.postedAt = new Date() }],
  ["past posting", () => tx.ledgerPostingBatch.count.mockResolvedValue(1)],
  ["modified terminal record", () => { item.resolutionNotes = "changed" }],
  ["wrong decision pointer", () => { item.metadata.nonfinancialClosureReceiptId = "another" }],
  ["wrong source identity", () => { approval.data.sourceReview = { ...approval.data.sourceReview, sourceId: "another" } }],
  ["financial decision", () => { approval.data.financial = { decisionId: "financial" } }],
  ["withdrawal used as approval", () => { approval.data.purpose = "REOPEN_SOURCE" }],
  ["original self approval", () => { approval.data.decidedById = "proposer" }],
  ["original maker approval", () => { approval.data.decidedById = "maker" }],
  ["changed proposal lineage", () => { proposal.data.reviewedRevision = "changed" }],
  ["missing audit", () => tx.ledgerAuditEvent.findFirst.mockResolvedValue(null)],
  ["certificate mismatch", () => { run.certificateHash = "tampered" }],
  ["signed without payload", () => { run.certificatePayload = null }],
  ["unsigned with signature", () => { run.status = "NEEDS_REVIEW" }],
] as const)("rejects %s without any mutation", async (_label, change) => {
  change(); await expect(loadSourceDecisionWithdrawalInTx(tx, "org", "exception")).rejects.toMatchObject({ code: "CONFLICT" })
})
it("also supports an unsigned approved investigation", async () => {
  Object.assign(run, { status: "NEEDS_REVIEW", signedAt: null, signedById: null, certificateHash: null, certificatePayload: null })
  expect((await loadSourceDecisionWithdrawalInTx(tx, "org", "exception")).withdrawal.priorCertificateHash).toBeNull()
})
