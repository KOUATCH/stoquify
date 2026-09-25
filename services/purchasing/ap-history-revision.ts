import { createHash } from "node:crypto"
import type { Prisma } from "@prisma/client"

export type APHistoryRevisionClient = Pick<Prisma.TransactionClient, "supplierInvoice" | "supplierPayment" | "supplierPaymentAllocation" | "supplierCreditNote" | "supplierLedgerEntry" | "supplier" | "supplierBankAccount">

/** Tenant-wide continuity fence, read in the caller's transaction. Includes sources that moved out of a filter. */
export async function readAPHistorySourceRevision(client: APHistoryRevisionClient, organizationId: string) {
  const where = { organizationId }, orderBy = { id: "asc" as const }
  const sources = await Promise.all([
    client.supplierInvoice.findMany({ where, orderBy, select: { id: true, supplierId: true, invoiceNumber: true, invoiceDate: true, dueDate: true, status: true, total: true, amountPaid: true, currency: true, purchaseOrderId: true, postedBusinessEventId: true, ledgerPostingBatchId: true, documentHash: true, evidenceHash: true, notes: true, deletedAt: true, createdAt: true, updatedAt: true } }),
    client.supplierPayment.findMany({ where, orderBy, select: { id: true, supplierId: true, bankAccountId: true, paymentNumber: true, status: true, method: true, amount: true, currency: true, paymentDate: true, postedBusinessEventId: true, ledgerPostingBatchId: true, documentHash: true, evidenceHash: true, notes: true, deletedAt: true, createdAt: true, updatedAt: true } }),
    client.supplier.findMany({ where, orderBy, select: { id: true, name: true, updatedAt: true } }),
    client.supplierBankAccount.findMany({ where, orderBy, select: { id: true, bankName: true, accountNumberMasked: true, mobileMoneyPhoneMasked: true, mobileMoneyProvider: true, updatedAt: true } }),
    // These immutable source tables have no updatedAt. Bind the fields used by the financial read model.
    client.supplierPaymentAllocation.findMany({ where, orderBy, select: { id: true, supplierPaymentId: true, supplierInvoiceId: true, amount: true, createdAt: true } }),
    client.supplierCreditNote.findMany({ where, orderBy, select: { id: true, supplierId: true, supplierInvoiceId: true, total: true, currency: true, direction: true, reversalOfSupplierCreditNoteId: true, postedBusinessEventId: true, creditDate: true, createdAt: true } }),
    client.supplierLedgerEntry.findMany({ where, orderBy, select: { id: true, supplierId: true, type: true, debit: true, credit: true, entryDate: true, referenceType: true, referenceId: true, createdAt: true } }),
  ])
  return createHash("sha256").update(JSON.stringify({ organizationId, sources })).digest("hex")
}
