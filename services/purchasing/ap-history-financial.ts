import { Prisma, SupplierInvoiceStatus, SupplierPaymentStatus } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"

type Invoice = Prisma.SupplierInvoiceGetPayload<{ include: { paymentAllocations: { include: { supplierPayment: true } }; supplierCreditNotes: true } }>
type Payment = Prisma.SupplierPaymentGetPayload<Record<string, never>>
type LedgerClient = Pick<Prisma.TransactionClient, "supplierLedgerEntry" | "supplierPayment">
export type APMovement = { state: "not_recognized" | "recorded" | "unverified"; amount: string | null }
export type APCurrencyTotals = { currency: string; invoiceTotal: string; paidTotal: string | null; creditTotal: string | null; openPayable: string | null; releasedPaymentTotal: string | null; unverifiedCount: number }
const posted = new Set<SupplierInvoiceStatus>(["POSTED", "PAYMENT_PENDING", "PAID"])
const released = new Set<SupplierPaymentStatus>(["RELEASED", "POSTED"])
const zero = () => new Prisma.Decimal(0)

/** Current operational supplier-ledger evidence; not a general-ledger or historical balance certificate. */
export async function resolveAPHistoryFinancials(client: LedgerClient, organizationId: string, invoices: Invoice[], payments: Payment[], recordedThrough: Date, defaultCurrency: string, evidenceLimit?: number) {
  const invoiceBalances = new Map<string, { paid: string; credits: string; outstanding: string } | null>()
  const paymentSources = new Map(payments.map(row => [row.id, row]))
  for (const invoice of invoices) for (const allocation of invoice.paymentAllocations) paymentSources.set(allocation.supplierPayment.id, allocation.supplierPayment)
  const notes = invoices.flatMap(row => row.supplierCreditNotes)
  const ids = [...invoices.map(row => row.id), ...paymentSources.keys(), ...notes.map(row => row.id)]
  const ledger = ids.length ? await client.supplierLedgerEntry.findMany({ where: { organizationId, referenceId: { in: ids }, referenceType: { in: ["SUPPLIER_INVOICE", "SUPPLIER_PAYMENT", "SUPPLIER_CREDIT_NOTE", "SUPPLIER_CREDIT_NOTE_REVERSAL"] } }, ...(evidenceLimit ? { take: evidenceLimit + 1 } : {}) }) : []
  if (evidenceLimit && ledger.length > evidenceLimit) throw new BusinessRuleError("AP evidence exceeds the dashboard limit. Narrow the scope.")
  // Check every allocation of a relevant released payment, including invoices outside the view.
  const releasedIds = [...paymentSources.values()].filter(row => released.has(row.status)).map(row => row.id)
  const allocationSources = releasedIds.length ? await client.supplierPayment.findMany({
    where: { organizationId, id: { in: releasedIds } },
    select: { id: true, allocations: { ...(evidenceLimit ? { take: evidenceLimit + 1 } : {}), select: {
      organizationId: true, supplierPaymentId: true, supplierInvoiceId: true, amount: true, createdAt: true,
      supplierInvoice: { select: { id: true, organizationId: true, supplierId: true, currency: true } },
    } } },
  }) : []
  if (evidenceLimit && allocationSources.reduce((sum, row) => sum + row.allocations.length, 0) > evidenceLimit) throw new BusinessRuleError("AP allocation evidence exceeds the dashboard limit. Narrow the scope.")
  const validAllocations = new Map<string, boolean>()
  for (const source of allocationSources) {
    const payment = paymentSources.get(source.id)!
    let total = zero(), validScope = true
    const invoiceIds = new Set<string>()
    for (const allocation of source.allocations) {
      const invoice = allocation.supplierInvoice
      if (allocation.organizationId !== organizationId || allocation.supplierPaymentId !== payment.id || allocation.supplierInvoiceId !== invoice.id || invoice.organizationId !== organizationId || invoice.supplierId !== payment.supplierId || invoice.currency !== payment.currency || allocation.amount.lte(0) || allocation.createdAt > recordedThrough || invoiceIds.has(invoice.id)) validScope = false
      invoiceIds.add(invoice.id)
      total = total.plus(allocation.amount)
    }
    validAllocations.set(source.id, validScope && total.lte(payment.amount))
  }
  const entries = (referenceType: string, id: string) => ledger.filter(row => row.referenceType === referenceType && row.referenceId === id)
  const valid = (referenceType: string, source: {id: string; organizationId: string; supplierId: string}, amount: Prisma.Decimal, date: Date, type: string, debit: boolean) => {
    const rows = entries(referenceType, source.id), row = rows[0]
    return source.organizationId === organizationId && rows.length === 1 && row.organizationId === organizationId && row.supplierId === source.supplierId && row.type === type && amount.gte(0) && row.entryDate.getTime() === date.getTime() && row.createdAt <= recordedThrough && row.debit.eq(debit ? amount : 0) && row.credit.eq(debit ? 0 : amount)
  }
  const movements = new Map<string, APMovement>()
  for (const payment of paymentSources.values()) {
    const recorded = released.has(payment.status)
    const evidence = valid("SUPPLIER_PAYMENT", payment, payment.amount, payment.paymentDate, "PAYMENT", false)
    const cleanDraft = !recorded && !entries("SUPPLIER_PAYMENT", payment.id).length && !payment.postedBusinessEventId && !payment.ledgerPostingBatchId
    movements.set(`payment:${payment.id}`, recorded && evidence ? {state: "recorded", amount: payment.amount.neg().toFixed(2)} : cleanDraft ? {state: "not_recognized", amount: "0.00"} : {state: "unverified", amount: null})
  }
  const groups = new Map<string, {document: Prisma.Decimal; paid: Prisma.Decimal; credits: Prisma.Decimal; remainder: Prisma.Decimal; payments: Prisma.Decimal; invoiceUnknown: number; paymentUnknown: number}>()
  const group = (currency: string) => { let value = groups.get(currency); if (!value) {value = {document: zero(), paid: zero(), credits: zero(), remainder: zero(), payments: zero(), invoiceUnknown: 0, paymentUnknown: 0}; groups.set(currency, value)} return value }
  for (const invoice of invoices) {
    invoiceBalances.set(invoice.id, null)
    const totals = group(invoice.currency); totals.document = totals.document.plus(invoice.total)
    const recognized = posted.has(invoice.status)
    const evidence = valid("SUPPLIER_INVOICE", invoice, invoice.total, invoice.invoiceDate, "PURCHASE", true)
    const cleanDraft = !recognized && !entries("SUPPLIER_INVOICE", invoice.id).length && !invoice.postedBusinessEventId && !invoice.ledgerPostingBatchId && invoice.amountPaid.eq(0) && !invoice.supplierCreditNotes.length && !invoice.paymentAllocations.length
    movements.set(`invoice:${invoice.id}`, recognized && evidence ? {state: "recorded", amount: invoice.total.toFixed(2)} : cleanDraft ? {state: "not_recognized", amount: "0.00"} : {state: "unverified", amount: null})
    if (cleanDraft) continue
    if (!recognized || !evidence) {totals.invoiceUnknown++; continue}
    let paid = zero(), credits = zero(), verified = true
    for (const allocation of invoice.paymentAllocations) {
      const payment = allocation.supplierPayment, movement = movements.get(`payment:${payment.id}`)
      if (allocation.organizationId !== organizationId || allocation.supplierInvoiceId !== invoice.id || payment.supplierId !== invoice.supplierId || payment.currency !== invoice.currency || allocation.createdAt > recordedThrough || payment.updatedAt > recordedThrough || allocation.amount.lt(0) || allocation.amount.gt(payment.amount)) {verified = false; continue}
      if (movement?.state === "recorded" && validAllocations.get(payment.id) === true) paid = paid.plus(allocation.amount)
      else if (movement?.state === "recorded") verified = false
      else if (movement?.state === "unverified") verified = false
    }
    for (const note of invoice.supplierCreditNotes) {
      const reversal = note.direction === "REVERSAL", ref = reversal ? "SUPPLIER_CREDIT_NOTE_REVERSAL" : "SUPPLIER_CREDIT_NOTE"
      if (note.supplierId !== invoice.supplierId || note.currency !== invoice.currency || !note.postedBusinessEventId || note.createdAt > recordedThrough || !valid(ref, note, note.total, note.creditDate, reversal ? "DEBIT_NOTE" : "CREDIT_NOTE", reversal)) {verified = false; continue}
      if (reversal && !invoice.supplierCreditNotes.some(original => original.id === note.reversalOfSupplierCreditNoteId && original.direction === "CORRECTION" && original.total.eq(note.total))) {verified = false; continue}
      credits = reversal ? credits.minus(note.total) : credits.plus(note.total)
    }
    if (!paid.eq(invoice.amountPaid)) verified = false
    if (!verified) {totals.invoiceUnknown++; continue}
    invoiceBalances.set(invoice.id, { paid: paid.toFixed(2), credits: credits.toFixed(2), outstanding: invoice.total.minus(paid).minus(credits).toFixed(2) })
    totals.paid = totals.paid.plus(paid); totals.credits = totals.credits.plus(credits); totals.remainder = totals.remainder.plus(invoice.total.minus(paid).minus(credits))
  }
  for (const payment of payments) {
    const totals = group(payment.currency), movement = movements.get(`payment:${payment.id}`)
    if (movement?.state === "recorded" && validAllocations.get(payment.id) === true) totals.payments = totals.payments.plus(payment.amount)
    else if (movement?.state === "recorded") totals.paymentUnknown++
    else if (movement?.state === "unverified") totals.paymentUnknown++
  }
  if (!groups.size) group(defaultCurrency)
  const currencyTotals: APCurrencyTotals[] = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, g]) => ({currency, invoiceTotal: g.document.toFixed(2), paidTotal: g.invoiceUnknown ? null : g.paid.toFixed(2), creditTotal: g.invoiceUnknown ? null : g.credits.toFixed(2), openPayable: g.invoiceUnknown ? null : g.remainder.toFixed(2), releasedPaymentTotal: g.paymentUnknown ? null : g.payments.toFixed(2), unverifiedCount: g.invoiceUnknown + g.paymentUnknown}))
  return {movements, currencyTotals, invoiceBalances, unverifiedCount: currencyTotals.reduce((sum, row) => sum + row.unverifiedCount, 0)}
}
