import "server-only"
import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { resolveAPHistoryFinancials } from "@/services/purchasing/ap-history-financial"

const reasonLabels: Record<string, string> = {
  CURRENCY_UNAVAILABLE: "The invoice currency is missing",
  DISPUTED_INVOICE: "The invoice is disputed",
  UNRESOLVED_MATCH_EXCEPTION: "A matching exception needs resolution or current independent approval",
  UNVERIFIED_BALANCE: "The supplier ledger, payment allocations or credits do not substantiate the balance",
  MISSING_LEDGER_POSTING: "The invoice lacks a matching posted ledger batch",
  CUTOFF_EVIDENCE_UNAVAILABLE: "The balance cannot be established at the selected period and evidence cutoff",
  INVALID_BALANCE: "The evidenced balance is negative or inconsistent",
  PAID_BALANCE_MISMATCH: "The invoice is marked paid but retains an outstanding balance",
}
export function closePayableReasonLabel(reason: string) { return reasonLabels[reason] ?? "The invoice requires reconciliation review" }

export type ClosePayableBalance = {
  invoiceId: string; currency: string; classification: "NORMAL_UNPAID" | "SETTLED" | "EXCEPTION"
  outstanding: string | null; maturity: "NOT_DUE" | "OVERDUE" | "DUE_DATE_UNKNOWN" | "SETTLED"
  reasons: string[]
}
export type ClosePayableBalances = {
  version: 1; organizationId: string; economicThrough: string; recordedThrough: string; evidenceHash: string
  normalUnpaidCount: number; settledCount: number; exceptionCount: number
  balances: ClosePayableBalance[]
  currencies: Array<{ currency: string; normalUnpaid: string; overdue: string; exceptionCount: number }>
}

/** Classifies obligations, not bank settlement or a historical AP/GL tie-out.
 * Retain archived obligations and all child evidence: filtering bad/late children
 * out could turn an unknown balance into an apparently normal unpaid invoice.
 */
export async function readClosePayableBalances(client: Prisma.TransactionClient, input: {
  organizationId: string; economicThrough: Date; recordedThrough: Date; createdFrom?: Date
}): Promise<ClosePayableBalances> {
  const invoices = await client.supplierInvoice.findMany({
    where: { organizationId: input.organizationId, invoiceDate: { lte: input.economicThrough },
      createdAt: { lte: input.recordedThrough, ...(input.createdFrom ? { gte: input.createdFrom } : {}) },
      OR: [{ status: { in: ["POSTED", "PAYMENT_PENDING", "PAID", "DISPUTED"] } },
        { postedAt: { not: null } }, { ledgerPostingBatchId: { not: null } }],
    },
    include: { paymentAllocations: { include: { supplierPayment: true } }, supplierCreditNotes: true, matchExceptions: true },
    orderBy: { id: "asc" },
  })
  const financials = await resolveAPHistoryFinancials(client, input.organizationId, invoices, [], input.recordedThrough, "XAF")
  const batchIds = invoices.flatMap(row => row.ledgerPostingBatchId ? [row.ledgerPostingBatchId] : [])
  const batches = batchIds.length ? await client.ledgerPostingBatch.findMany({
    where: { organizationId: input.organizationId, id: { in: batchIds }, status: "POSTED", createdAt: { lte: input.recordedThrough }, postedAt: { lte: input.recordedThrough } },
    select: { id: true, sourceType: true, sourceId: true },
  }) : []
  const balances: ClosePayableBalance[] = invoices.map(invoice => {
    const reasons: string[] = []
    const balance = financials.invoiceBalances.get(invoice.id)
    if (!invoice.currency.trim()) reasons.push("CURRENCY_UNAVAILABLE")
    if (invoice.status === "DISPUTED") reasons.push("DISPUTED_INVOICE")
    if (invoice.matchExceptions.some(row => {
      const resolved = row.status === "RESOLVED" && row.resolvedAt && row.resolvedAt <= input.recordedThrough
      const approved = row.status === "APPROVED" && row.approvedById && row.approvedById !== row.requestedById &&
        row.decidedAt && row.decidedAt <= input.recordedThrough && row.expiresAt > input.recordedThrough
      return row.organizationId !== input.organizationId || row.createdAt > input.recordedThrough || !(resolved || approved)
    })) reasons.push("UNRESOLVED_MATCH_EXCEPTION")
    if (!balance) reasons.push("UNVERIFIED_BALANCE")
    if (!batches.some(batch => batch.id === invoice.ledgerPostingBatchId && batch.sourceType === "SUPPLIER_INVOICE" && batch.sourceId === invoice.id)) reasons.push("MISSING_LEDGER_POSTING")
    if (!invoice.postedAt || invoice.postedAt > input.recordedThrough || invoice.updatedAt > input.recordedThrough ||
      invoice.paymentAllocations.some(row => row.supplierPayment.paymentDate > input.economicThrough) ||
      invoice.supplierCreditNotes.some(row => row.creditDate > input.economicThrough)) reasons.push("CUTOFF_EVIDENCE_UNAVAILABLE")
    if (balance && (new Prisma.Decimal(balance.outstanding).lt(0) || invoice.amountPaid.lt(0) || invoice.total.lt(0))) reasons.push("INVALID_BALANCE")
    if (balance && invoice.status === "PAID" && !new Prisma.Decimal(balance.outstanding).eq(0)) reasons.push("PAID_BALANCE_MISMATCH")
    const outstanding = reasons.length ? null : balance!.outstanding
    const classification = reasons.length ? "EXCEPTION" : new Prisma.Decimal(outstanding!).eq(0) ? "SETTLED" : "NORMAL_UNPAID"
    const maturity = classification === "SETTLED" ? "SETTLED" : !invoice.dueDate ? "DUE_DATE_UNKNOWN" : invoice.dueDate < input.economicThrough ? "OVERDUE" : "NOT_DUE"
    return { invoiceId: invoice.id, currency: invoice.currency, classification, outstanding, maturity, reasons }
  })
  const currencies = [...new Set(balances.map(row => row.currency))].sort().map(currency => {
    const rows = balances.filter(row => row.currency === currency)
    const sum = (values: ClosePayableBalance[]) => values.reduce((total, row) => total.plus(row.outstanding!), new Prisma.Decimal(0)).toFixed(2)
    const normal = rows.filter(row => row.classification === "NORMAL_UNPAID")
    return { currency, normalUnpaid: sum(normal), overdue: sum(normal.filter(row => row.maturity === "OVERDUE")), exceptionCount: rows.filter(row => row.classification === "EXCEPTION").length }
  })
  const result = { version: 1 as const, organizationId: input.organizationId, economicThrough: input.economicThrough.toISOString(), recordedThrough: input.recordedThrough.toISOString(),
    normalUnpaidCount: balances.filter(row => row.classification === "NORMAL_UNPAID").length,
    settledCount: balances.filter(row => row.classification === "SETTLED").length,
    exceptionCount: balances.filter(row => row.classification === "EXCEPTION").length, balances, currencies }
  return { ...result, evidenceHash: createHash("sha256").update(JSON.stringify(result)).digest("hex") }
}
