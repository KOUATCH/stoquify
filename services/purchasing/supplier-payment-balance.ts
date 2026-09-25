import { Prisma, SupplierInvoiceStatus } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"

type InvoiceBalance = { id: string; organizationId: string; supplierId: string; currency: string; total: Prisma.Decimal | string; amountPaid: Prisma.Decimal | string }

/** PAID is the existing closed-payable state; credits remain separate from actual cash paid. */
export function supplierInvoiceBalanceStatus(outstanding: Prisma.Decimal, amountPaid: Prisma.Decimal) {
  if (outstanding.lte(0)) return SupplierInvoiceStatus.PAID
  return amountPaid.gt(0) ? SupplierInvoiceStatus.PAYMENT_PENDING : SupplierInvoiceStatus.POSTED
}

/** Caller holds the invoice lock and has completed the credit or reversal in this transaction. */
export async function refreshSupplierInvoiceBalanceStatus(tx: Pick<Prisma.TransactionClient, "supplierInvoice" | "supplierCreditNote">, organizationId: string, invoice: InvoiceBalance) {
  const balances = await readSupplierPaymentBalances(tx, organizationId, [invoice], invoice.currency)
  const outstanding = balances.get(invoice.id)!
  const status = supplierInvoiceBalanceStatus(outstanding, new Prisma.Decimal(invoice.amountPaid))
  await tx.supplierInvoice.update({ where: { id: invoice.id, organizationId }, data: { status } })
  return { status, outstanding: outstanding.toFixed(2) }
}

export async function lockSupplierPaymentSources(tx: Pick<Prisma.TransactionClient, "$queryRaw">, organizationId: string, supplierId: string, invoiceIds: string[]) {
  const ids = [...new Set(invoiceIds)].sort()
  if (ids.length) await tx.$queryRaw`SELECT id FROM supplier_invoices WHERE "organizationId" = ${organizationId} AND id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM suppliers WHERE "organizationId" = ${organizationId} AND id = ${supplierId} FOR UPDATE`
}

/** Credit records are immutable posting facts; release must reread them after locking its invoices. */
export async function readSupplierPaymentBalances(tx: Pick<Prisma.TransactionClient, "supplierCreditNote">, organizationId: string, invoices: InvoiceBalance[], currency: string) {
  const credits = await tx.supplierCreditNote.findMany({
    where: { organizationId, supplierInvoiceId: { in: invoices.map(invoice => invoice.id) } },
    select: { id: true, organizationId: true, supplierId: true, supplierInvoiceId: true, currency: true, total: true, direction: true, reversalOfSupplierCreditNoteId: true, postedBusinessEventId: true },
  })
  const balances = new Map<string, Prisma.Decimal>()
  for (const invoice of invoices) {
    if (invoice.organizationId !== organizationId || invoice.currency !== currency) throw new BusinessRuleError("Supplier payment invoices must use the same currency as the payment.")
    let netCredit = new Prisma.Decimal(0)
    const notes = credits.filter(note => note.supplierInvoiceId === invoice.id), reversed = new Set<string>()
    for (const note of notes) {
      if (note.organizationId !== organizationId || note.supplierId !== invoice.supplierId || note.currency !== currency || !note.postedBusinessEventId || note.total.lte(0)) throw new BusinessRuleError("Supplier credit evidence must be reconciled before payment.")
      if (note.direction === "REVERSAL") {
        const original = notes.find(value => value.id === note.reversalOfSupplierCreditNoteId && value.direction === "CORRECTION")
        if (!original || !original.total.eq(note.total) || reversed.has(original.id)) throw new BusinessRuleError("Supplier credit reversal evidence must be reconciled before payment.")
        reversed.add(original.id)
        netCredit = netCredit.minus(note.total)
      } else netCredit = netCredit.plus(note.total)
    }
    balances.set(invoice.id, new Prisma.Decimal(invoice.total).minus(invoice.amountPaid).minus(netCredit).toDecimalPlaces(2))
  }
  return balances
}
