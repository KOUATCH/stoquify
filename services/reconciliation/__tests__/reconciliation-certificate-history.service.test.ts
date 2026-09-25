/** @jest-environment node */
import { createHash } from "node:crypto"
import { db } from "@/prisma/db"
import { readReconciliationCertificateHistory } from "../reconciliation-certificate-history.service"
import { certificateHistorySchema } from "../reconciliation-certificate-history.contracts"
import { certificatePayloadHash } from "../payment-reconciliation-certification.service"
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), user: { findFirst: jest.fn() }, reconciliationRun: { findMany: jest.fn(), findFirst: jest.fn() }, paymentReconciliationInboxItem: { findMany: jest.fn() } } }))
const control = { organizationId: "org", actorId: "actor", actorPermissions: ["payments.reconciliation.read"] }
const run = { id: "run", organizationId: "org", status: "SIGNED", certificateHash: "a".repeat(64), signedAt: new Date(), businessDate: new Date(), createdAt: new Date(), providerAccount: { organizationId: "org", displayName: "Owned provider", currencyCode: "XAF" } }
const requestId = "abcde123-1234-4123-8123-abcdef123456", receiptId = "bcdef123-1234-4123-8123-abcdef123456"
function receipt(actorId = "actor") {
  const content = '{"private":"download body"}', result = { runId: run.id, fileName: "recon-cert-run.json", mimeType: "application/json", content, certificateHash: run.certificateHash, sha256: createHash("sha256").update(content).digest("hex"), watermarkId: "watermark", rowCount: 1, inboxItemId: receiptId, correlationId: "correlation", replayed: false }
  const payloadSummary = { kind: "RECONCILIATION_CERTIFICATE_EXPORT_V2", result, requestHash: certificatePayloadHash({ runId: run.id, certificateHash: run.certificateHash, actorId, fileType: "json", idempotencyKey: requestId }) }
  return { id: receiptId, status: "PROCESSED", createdAt: new Date(), idempotencyKey: "reconciliation-certificate-export:" + requestId, payloadSummary, payloadHash: certificatePayloadHash(payloadSummary) }
}
beforeEach(() => {
  jest.clearAllMocks(); (db.$transaction as jest.Mock).mockImplementation(work => work(db))
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ id: "actor" })
  ;(db.reconciliationRun.findFirst as jest.Mock).mockResolvedValue(run)
  ;(db.reconciliationRun.findMany as jest.Mock).mockResolvedValue([run])
  ;(db.paymentReconciliationInboxItem.findMany as jest.Mock).mockResolvedValue([receipt()])
})
it("returns minimal scoped summaries and a same-actor recovery command without bytes", async () => {
  const page = await readReconciliationCertificateHistory({ kind: "exports", runId: run.id }, control)
  expect(page.kind).toBe("exports"); if (page.kind !== "exports") throw new Error("wrong page")
  expect(page.receipts[0]).toMatchObject({ state: "verified", recoveryRequest: { idempotencyKey: requestId, expectedCertificateHash: run.certificateHash } })
  expect(JSON.stringify(page)).not.toMatch(/private|download body|payloadSummary|content|requestHash/)
  expect(db.paymentReconciliationInboxItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", externalId: "run", source: "CERTIFICATE_EXPORT" }), take: 21 }))
})
it("does not give another actor the original actor's request identity", async () => {
  ;(db.paymentReconciliationInboxItem.findMany as jest.Mock).mockResolvedValue([receipt("other")])
  const page = await readReconciliationCertificateHistory({ kind: "exports", runId: run.id }, control)
  expect(page.kind === "exports" && page.receipts[0]).toMatchObject({ state: "verified", recoveryRequest: null })
})
it("distinguishes legacy and corrupt receipts without inventing recovered evidence", async () => {
  ;(db.paymentReconciliationInboxItem.findMany as jest.Mock).mockResolvedValue([{ ...receipt(), payloadHash: "changed" }, { ...receipt(), idempotencyKey: "legacy-key" }])
  const page = await readReconciliationCertificateHistory({ kind: "exports", runId: run.id }, control)
  expect(page.kind === "exports" && page.receipts.map(r => [r.state, r.recoveryRequest, r.sha256])).toEqual([["requires_review", null, null], ["legacy", null, null]])
})
it("pages deterministically across equal timestamps and rejects changed filters", async () => {
  ;(db.reconciliationRun.findMany as jest.Mock).mockResolvedValue(Array.from({ length: 21 }, (_, i) => ({ ...run, id: `run-${99-i}` })))
  const page = await readReconciliationCertificateHistory({ kind: "runs", search: "Owned" }, control)
  expect(page.kind === "runs" && page.runs.length).toBe(20)
  expect(page.nextCursor?.id).toBe("run-80")
  await readReconciliationCertificateHistory({ kind: "runs", search: "Owned", cursor: page.nextCursor }, control)
  expect(db.reconciliationRun.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], where: expect.objectContaining({ organizationId: "org", AND: expect.arrayContaining([expect.objectContaining({ OR: [{ createdAt: { lt: run.createdAt } }, { createdAt: run.createdAt, id: { lt: "run-80" } }] })]) }) }))
  await expect(readReconciliationCertificateHistory({ kind: "runs", search: "Changed", cursor: page.nextCursor }, control)).rejects.toMatchObject({ code: "CONFLICT" })
})
it("refuses missing permission, inactive actor and foreign linked provider", async () => {
  await expect(readReconciliationCertificateHistory({ kind: "runs" }, { ...control, actorPermissions: [] })).rejects.toMatchObject({ code: "FORBIDDEN" })
  ;(db.user.findFirst as jest.Mock).mockResolvedValueOnce(null)
  await expect(readReconciliationCertificateHistory({ kind: "runs" }, control)).rejects.toMatchObject({ code: "FORBIDDEN" })
  ;(db.reconciliationRun.findMany as jest.Mock).mockResolvedValue([{ ...run, providerAccount: { ...run.providerAccount, organizationId: "foreign" } }])
  await expect(readReconciliationCertificateHistory({ kind: "runs" }, control)).rejects.toMatchObject({ code: "CONFLICT" })
})
it("refuses unavailable runs and does not convert query errors to zero results", async () => {
  ;(db.reconciliationRun.findFirst as jest.Mock).mockResolvedValue(null)
  await expect(readReconciliationCertificateHistory({ kind: "exports", runId: "foreign" }, control)).rejects.toMatchObject({ code: "NOT_FOUND" })
  ;(db.reconciliationRun.findMany as jest.Mock).mockRejectedValue(new Error("query failed"))
  await expect(readReconciliationCertificateHistory({ kind: "runs" }, control)).rejects.toThrow("query failed")
})
it.each([{ kind: "runs", organizationId: "foreign" }, { kind: "exports" }, { kind: "runs", search: "x".repeat(101) }])("rejects malformed or caller authority input %j", input => { expect(certificateHistorySchema.safeParse(input).success).toBe(false) })
