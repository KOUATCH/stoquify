import { Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { readVerifiedPaymentApproval, readVerifiedPaymentRequest } from "../payment-request-evidence"

const draft = { supplierId: "s", bankAccountId: "b", method: "BANK_TRANSFER", paymentDate: "2026-08-12", documentReference: "https://example.invalid/document", documentSha256: "a".repeat(64), allocations: [{ supplierInvoiceId: "i", amount: "10.25" }] }
function fixture() {
  const at = new Date("2026-08-12T12:00:00Z")
  const payment = { id: "p", organizationId: "o", supplierId: "s", bankAccountId: "b", requestedById: "maker", approvedById: "checker", approvedAt: at, method: "BANK_TRANSFER", paymentDate: new Date("2026-08-12"), documentHash: `sha256:${draft.documentSha256}`, currency: "XAF", amount: new Prisma.Decimal("10.25"), notes: null, allocations: [{ organizationId: "o", supplierPaymentId: "p", supplierInvoiceId: "i", amount: new Prisma.Decimal("10.25") }] }
  const payload = { version: 1, paymentRequestId: "p", organizationId: "o", requesterId: "maker", draft, total: "10.25", currency: "XAF" }
  const request = { id: "request", actorId: "maker", eventSource: "INTERNAL", schemaVersion: 1, status: "APPLIED", processedAt: at, occurredAt: at, payload, payloadHash: hashBusinessPayload(payload) }
  const approvalPayload = { version: 1, paymentRequestId: "p", requestEventId: "request", requestHash: request.payloadHash, approverId: "checker", approvedAt: at.toISOString() }
  const approval = { ...request, id: "approval", actorId: "checker", payload: approvalPayload, payloadHash: hashBusinessPayload(approvalPayload) }
  const events = [request]
  const tx = { supplierPayment: { findFirst: jest.fn().mockResolvedValue(payment) }, businessEvent: { findMany: jest.fn().mockImplementation(({where}) => where.eventType === "supplier.payment.requested" ? events : [approval]) } }
  return { payment, request, approval, events, tx }
}
it("requires exactly one applied request matching the persisted terms", async () => {
  const f = fixture()
  await expect(readVerifiedPaymentRequest(f.tx as never, "o", "p")).resolves.toMatchObject({ draft })
  f.events.push(f.request)
  await expect(readVerifiedPaymentRequest(f.tx as never, "o", "p")).rejects.toThrow(/authenticated payment request/)
})
it.each(["requestedById", "bankAccountId", "documentHash", "notes"] as const)("rejects a changed %s", async key => {
  const f = fixture()
  Object.assign(f.payment, { [key]: "changed" })
  await expect(readVerifiedPaymentRequest(f.tx as never, "o", "p")).rejects.toThrow(/authenticated payment request/)
})
it("rejects changed allocations even when the payment total is unchanged", async () => {
  const f = fixture()
  f.payment.allocations[0].supplierInvoiceId = "other"
  await expect(readVerifiedPaymentRequest(f.tx as never, "o", "p")).rejects.toThrow(/authenticated payment request/)
})
it("accepts independently authenticated approval of the retained request", async () => {
  const f = fixture()
  await expect(readVerifiedPaymentApproval(f.tx as never, "o", "p")).resolves.toMatchObject({ approvalEvent: { actorId: "checker" } })
})
it.each(["hash", "version", "timestamp", "request", "actor"])("rejects approval with altered %s evidence", async kind => {
  const f = fixture()
  if (kind === "hash") f.approval.payloadHash = "changed"
  if (kind === "version") f.approval.schemaVersion = 2
  if (kind === "timestamp") f.payment.approvedAt = new Date("2026-08-13")
  if (kind === "request") { f.approval.payload.requestHash = "other"; f.approval.payloadHash = hashBusinessPayload(f.approval.payload) }
  if (kind === "actor") f.approval.actorId = "maker"
  await expect(readVerifiedPaymentApproval(f.tx as never, "o", "p")).rejects.toThrow(/independent approval/)
})
