import { Prisma } from "@prisma/client"
import { invoiceApprovalCommandSchema, invoiceApprovalDecisionSchema } from "../invoice-approval-contracts"
import { invoicePreparationSourceHash } from "../invoice-source-evidence"

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: (value: unknown) => require("node:crypto").createHash("sha256").update(JSON.stringify(value)).digest("hex"),
}))

const command = { invoiceId: "invoice", expectedRevision: "a".repeat(64), idempotencyKey: "request-1" }
const decision = {
  organizationId: "org", actorId: "checker", invoiceId: "invoice", invoiceNumber: "INV",
  requestReference: "request-1", reviewedRevision: "a".repeat(64), recordedAt: "2026-09-08T00:00:00.000Z",
  approvalEventId: "approval", supplierLiabilityId: "liability", postingBatchId: "batch",
  ledgerStatus: "BLOCKED_PENDING_RULES", journalEntryId: null, accountingSourceLinkId: null,
  blockerCode: "AP_POSTING_RULE_REVIEW", total: "2500.00", currency: "XAF",
}

test.each(["organizationId", "approvedById", "sessionToken", "total"])("approval commands reject client authority/amount field %s", key => {
  expect(invoiceApprovalCommandSchema.safeParse({ ...command, [key]: "untrusted" }).success).toBe(false)
})
test("approval requires a bound revision and exact request reference", () => {
  expect(invoiceApprovalCommandSchema.safeParse(command).success).toBe(true)
  expect(invoiceApprovalCommandSchema.safeParse({ invoiceId: "invoice" }).success).toBe(false)
})
test("payable approval cannot imply a posted journal without its source links", () => {
  expect(invoiceApprovalDecisionSchema.safeParse(decision).success).toBe(true)
  expect(invoiceApprovalDecisionSchema.safeParse({ ...decision, ledgerStatus: "POSTED", blockerCode: null }).success).toBe(false)
  expect(invoiceApprovalDecisionSchema.safeParse({ ...decision, journalEntryId: "journal" }).success).toBe(false)
  expect(invoiceApprovalDecisionSchema.safeParse({ ...decision, ledgerStatus: "POSTED", blockerCode: null, journalEntryId: "journal", accountingSourceLinkId: "source" }).success).toBe(true)
})

function source() {
  return {
    id: "invoice", organizationId: "org", supplierId: "supplier", purchaseOrderId: null,
    createdById: "maker", invoiceNumber: "INV", invoiceDate: new Date("2026-08-10"), dueDate: null,
    subtotal: new Prisma.Decimal(2500), taxAmount: new Prisma.Decimal(0), discount: new Prisma.Decimal(0), total: new Prisma.Decimal(2500), currency: "XAF", documentHash: "sha256:document", evidenceHash: "evidence", notes: null,
    lines: [{ id: "b", quantity: new Prisma.Decimal(1), unitCost: new Prisma.Decimal(2500), goodsReceiptLineId: "receipt-b" }, { id: "a", quantity: new Prisma.Decimal(1), unitCost: new Prisma.Decimal(0), goodsReceiptLineId: "receipt-a" }],
    threeWayMatches: [{ id: "match", varianceAmount: new Prisma.Decimal(0), priceVariance: new Prisma.Decimal(0) }],
  } as unknown as Parameters<typeof invoicePreparationSourceHash>[0]
}
test("maker source hash is stable across relation order and later operational metadata", () => {
  const original = source(), reordered = { ...original, lines: [...original.lines].reverse(), metadata: { ledgerStatus: "POSTED" }, updatedAt: new Date() }
  expect(invoicePreparationSourceHash(reordered)).toBe(invoicePreparationSourceHash(original))
})
test.each(["quantity", "document", "maker", "variance"])("maker source hash detects changed %s evidence", kind => {
  const original = source(), changed = source()
  if (kind === "quantity") changed.lines[0].quantity = new Prisma.Decimal(2)
  if (kind === "document") changed.documentHash = "sha256:other"
  if (kind === "maker") changed.createdById = "other-maker"
  if (kind === "variance") changed.threeWayMatches[0].varianceAmount = new Prisma.Decimal(100)
  expect(invoicePreparationSourceHash(changed)).not.toBe(invoicePreparationSourceHash(original))
})
