import { Prisma } from "@prisma/client"
import { z } from "zod"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { receiptCostAllocationSchema } from "@/services/inventory/receipt-cost-allocation"
const money = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value).toDecimalPlaces(2)
export const creditProofSchema = z.object({ version: z.literal(2), organizationId: z.string(), supplierId: z.string(), invoiceId: z.string(), returnId: z.string(), creditId: z.string(), currency: z.string(), direction: z.enum(["CORRECTION", "REVERSAL"]), reversalOfCreditId: z.string().nullable(), returnRecognitionHash: z.string(), returnJournalId: z.string().nullable(), lines: z.array(z.object({ returnLineId: z.string(), invoiceLineId: z.string(), receiptLineId: z.string(), quantity: z.string(), claimAmount: z.string(), invoiceLineHash: z.string(), netAllocation: receiptCostAllocationSchema, taxAllocation: receiptCostAllocationSchema }).strict()).min(1) }).strict()
type CreditRecord = Prisma.SupplierCreditNoteGetPayload<{ include: { lines: true } }>
export type CreditEvidenceReader = Pick<Prisma.TransactionClient, "businessEvent" | "ledgerPostingBatch" | "journalEntry" | "accountingSourceLink">
const objectRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
export async function readSupplierCreditAllocationProof(tx: CreditEvidenceReader, row: CreditRecord) {
  const event = await tx.businessEvent.findFirst({ where: { id: row.postedBusinessEventId, organizationId: row.organizationId } })
  if (!event || event.eventSource !== "INTERNAL" || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.sourceType !== "SUPPLIER_CREDIT_NOTE" || event.sourceId !== row.id || event.actorId !== row.postedById || event.occurredAt.getTime() !== row.creditDate.getTime() || event.documentHash !== row.documentHash || event.postingBatchId !== row.ledgerPostingBatchId || event.payloadHash !== hashBusinessPayload(event.payload) || event.eventType !== (row.direction === "REVERSAL" ? "purchase.supplier_credit.reversed" : "purchase.supplier_credit.posted")) throw new BusinessRuleError("Supplier credit source evidence requires review.", "INVOICE_EVIDENCE_REQUIRED")
  const raw = objectRecord(event.payload).receiptCreditRecognition
  if (raw == null) {
    if (row.total.lte(0) || row.lines.some(line => line.lineTotal.lte(0))) throw new BusinessRuleError("Zero-value credit requires its verified allocation evidence.", "INVOICE_EVIDENCE_REQUIRED")
    return null
  }
  const parsed = creditProofSchema.safeParse(raw)
  if (!parsed.success) throw new BusinessRuleError("Supplier credit allocation evidence is invalid.", "INVOICE_EVIDENCE_REQUIRED")
  const proof = parsed.data
  const noValue = proof.lines.every(line => money(line.claimAmount).eq(0) && money(line.netAllocation.allocatedValue).eq(0) && money(line.taxAllocation.allocatedValue).eq(0))
  if (noValue && (objectRecord(event.payload).ledgerStatus !== "NOT_REQUIRED" || row.journalEntryId || row.ledgerPostingBatchId)) throw new BusinessRuleError("Zero-value credit accounting evidence is inconsistent.", "INVOICE_EVIDENCE_REQUIRED")
  if (noValue) {
    const where = { organizationId: row.organizationId, sourceType: "SUPPLIER_CREDIT_NOTE" as const, sourceId: row.id }
    if (await tx.ledgerPostingBatch.count({ where }) || await tx.journalEntry.count({ where }) || await tx.accountingSourceLink.count({ where })) throw new BusinessRuleError("Zero-value credit has unexpected accounting effects.", "INVOICE_EVIDENCE_REQUIRED")
  }
  if (proof.organizationId !== row.organizationId || proof.supplierId !== row.supplierId || proof.invoiceId !== row.supplierInvoiceId || proof.returnId !== row.purchaseReturnId || proof.creditId !== row.id || proof.currency !== row.currency || proof.direction !== row.direction || proof.reversalOfCreditId !== row.reversalOfSupplierCreditNoteId || proof.lines.length !== row.lines.length || new Set(proof.lines.map(line => line.returnLineId)).size !== row.lines.length) throw new BusinessRuleError("Supplier credit allocation source changed.", "INVOICE_EVIDENCE_REQUIRED")
  for (const line of row.lines) {
    const frozen = proof.lines.find(value => value.returnLineId === line.sourcePurchaseReturnLineId)
    if (!frozen || frozen.invoiceLineId !== line.sourceSupplierInvoiceLineId || frozen.receiptLineId !== line.sourceGoodsReceiptLineId || frozen.quantity !== line.quantity.toFixed(3) || frozen.netAllocation.quantity !== frozen.quantity || frozen.taxAllocation.quantity !== frozen.quantity || !money(frozen.claimAmount).gte(0) || !money(frozen.taxAllocation.allocatedValue).eq(line.taxAmount) || !money(frozen.netAllocation.allocatedValue).plus(line.taxAmount).eq(line.lineTotal)) throw new BusinessRuleError("Supplier credit values changed from their frozen allocation.", "INVOICE_EVIDENCE_REQUIRED")
  }
  const tax = row.lines.reduce((sum, line) => sum.plus(line.taxAmount), new Prisma.Decimal(0)), gross = row.lines.reduce((sum, line) => sum.plus(line.lineTotal), new Prisma.Decimal(0))
  if (!gross.eq(row.total) || !tax.eq(row.taxAmount) || !gross.minus(tax).eq(row.subtotal)) throw new BusinessRuleError("Supplier credit header differs from its retained line allocations.", "INVOICE_EVIDENCE_REQUIRED")
  return proof
}


