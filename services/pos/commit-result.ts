import { moneyToNumber, type MoneyValue } from "./money"
import type { ReceiptDeliveryResult, SalesReceiptPayload } from "./receipt.service"

export const POS_SALE_COMMIT_RESULT_SCHEMA_VERSION = 1

export type CommitPOSSaleResult = {
  clientCommitId: string
  resultSchemaVersion: 1
  replayed: boolean
  saleId: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  amountPaid: number
  onAccountAmount: number
  changeDue: number
  accountingMovements: {
    saleJournalEntry: {
      id: string
      entryNumber: string
      postingBatchId?: string | null
    }
    paymentJournalEntries: Array<{
      id: string
      entryNumber: string
    }>
    entries: Array<{
      account: string
      debit: number
      credit: number
    }>
    totalDebits: number
    totalCredits: number
  }
  fiscalDocument?: {
    id: string
    status: string
    authorityChannel: string | null
  } | null
  fiscalization?: {
    requestId: string
    status: "PENDING"
    authoritative: false
    watermark: "NOT FOR STATUTORY USE"
  }
  receipt: SalesReceiptPayload | null
  receiptStatus: "READY" | "RETRY_REQUIRED"
  delivery: ReceiptDeliveryResult | null
}

type CommitResultInput = {
  clientCommitId: string
  sale: { id: string; orderNumber: string }
  updatedSale: { status: string; paymentStatus: string }
  total: MoneyValue
  amountPaid: MoneyValue
  onAccountAmount: MoneyValue
  changeDue: MoneyValue
  saleJournalEntry: { id: string; entryNumber: string; postingBatchId?: string | null }
  paymentJournalEntries: ReadonlyArray<{ id: string; entryNumber: string }>
  journalEntries: ReadonlyArray<{ account: string; debit: MoneyValue; credit: MoneyValue }>
  totalDebits: MoneyValue
  totalCredits: MoneyValue
  fiscalizationRequestId: string
}

// Projection only: callers retain transaction, authority, hashing and replay order.
// Receipt/fiscalization remain provisional until their existing completion paths run.
export function buildPOSCommitResult({
  clientCommitId, sale, updatedSale, total, amountPaid, onAccountAmount, changeDue,
  saleJournalEntry, paymentJournalEntries, journalEntries, totalDebits, totalCredits,
  fiscalizationRequestId,
}: CommitResultInput): CommitPOSSaleResult {
  return {
    clientCommitId,
    resultSchemaVersion: POS_SALE_COMMIT_RESULT_SCHEMA_VERSION,
    replayed: false,
    saleId: sale.id,
    orderNumber: sale.orderNumber,
    status: updatedSale.status,
    paymentStatus: updatedSale.paymentStatus,
    total: moneyToNumber(total),
    amountPaid: moneyToNumber(amountPaid),
    onAccountAmount: moneyToNumber(onAccountAmount),
    changeDue: moneyToNumber(changeDue),
    accountingMovements: {
      saleJournalEntry: {
        id: saleJournalEntry.id,
        entryNumber: saleJournalEntry.entryNumber,
        postingBatchId: saleJournalEntry.postingBatchId ?? null,
      },
      paymentJournalEntries: paymentJournalEntries.map((entry) => ({
        id: entry.id,
        entryNumber: entry.entryNumber,
      })),
      entries: journalEntries.map((entry) => ({
        account: entry.account,
        debit: moneyToNumber(entry.debit),
        credit: moneyToNumber(entry.credit),
      })),
      totalDebits: moneyToNumber(totalDebits),
      totalCredits: moneyToNumber(totalCredits),
    },
    fiscalDocument: null,
    fiscalization: {
      requestId: fiscalizationRequestId,
      status: "PENDING" as const,
      authoritative: false as const,
      watermark: "NOT FOR STATUTORY USE" as const,
    },
    receipt: null,
    receiptStatus: "RETRY_REQUIRED" as const,
    delivery: null,
  }
}
