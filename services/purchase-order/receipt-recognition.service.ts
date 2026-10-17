import "server-only"
import { Prisma } from "@prisma/client"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { createAPLedgerPosting, type APPostingStatus } from "@/services/purchasing/ap-control.service"
import { validateReceiptReturnStockForRecognition } from "@/services/purchasing/receipt-return-recognition"
import { readReceiptRecognitionEvidence, readReceiptRecognitionSource, receiptRecognitionReviewRequired } from "./receipt-recognition-source"

/** The receiving transaction or authorized recovery owns identity and locking.
 * This kernel posts only the frozen source; it never recreates stock or upgrades
 * an unmarked historical receipt. */
export async function postReceiptRecognitionInTx(tx: Prisma.TransactionClient, input: { organizationId: string; receiptId: string; actorId: string }): Promise<APPostingStatus | { ledgerStatus: "NOT_REQUIRED"; ledgerBatch: null }> {
  const source = await readReceiptRecognitionSource(tx, input.organizationId, input.receiptId)
  if (!source) throw receiptRecognitionReviewRequired()
  const evidence = await readReceiptRecognitionEvidence(tx, source)
  if (!evidence.stockVerified || evidence.accountingStatus === "UNVERIFIED") throw receiptRecognitionReviewRequired()
  if (evidence.accountingStatus === "NOT_REQUIRED") return { ledgerStatus: "NOT_REQUIRED", ledgerBatch: null }
  if (evidence.accountingStatus === "POSTED") {
    const ledgerBatch = await tx.ledgerPostingBatch.findUniqueOrThrow({ where: { id: evidence.batchId!, organizationId: input.organizationId } })
    const link = await tx.accountingSourceLink.findFirstOrThrow({ where: { organizationId: input.organizationId, postingBatchId: ledgerBatch.id, journalEntryId: evidence.journalId!, sourceType: "GOODS_RECEIPT", sourceId: input.receiptId }, select: { id: true } })
    return { ledgerStatus: "POSTED", ledgerBatch, journalEntryId: evidence.journalId!, accountingSourceLinkId: link.id }
  }
  const { manifest } = source, receiptLineIds = manifest.lines.map(line => line.receiptLineId)
  const invoice = await tx.supplierInvoice.findFirst({ where: { organizationId: input.organizationId, lines: { some: { goodsReceiptLineId: { in: receiptLineIds } } }, OR: [{ approvedById: { not: null } }, { postedAt: { not: null } }, { ledgerPostingBatchId: { not: null } }, { status: { in: ["POSTED", "PAYMENT_PENDING", "PAID"] } }] }, select: { id: true } })
  if (invoice) throw receiptRecognitionReviewRequired()
  await validateReceiptReturnStockForRecognition(tx, source)
  const effectiveAt = new Date(manifest.effectiveAt), period = await getOpenPeriodForDate(input.organizationId, effectiveAt, tx)
  return createAPLedgerPosting(tx, {
    organizationId: input.organizationId, periodId: period.id, sourceType: "GOODS_RECEIPT", sourceId: input.receiptId,
    sourceNumber: manifest.receiptNumber, sourceDate: effectiveAt, postingPurpose: "GOODS_RECEIPT", journalType: "INVENTORY", journalPrefix: "APGR",
    actorId: input.actorId, supplierId: manifest.supplierId, currency: manifest.currency, memo: `Goods receipt ${manifest.receiptNumber}`,
    documentHash: source.sourceHash, amounts: { sourceAmount: source.inventoryValue, netAmount: source.inventoryValue, grossAmount: source.inventoryValue, costAmount: source.inventoryValue, taxAmount: new Prisma.Decimal(0) },
    metadata: { receiptRecognitionSourceHash: source.sourceHash, receiptRecognitionSourceEventId: source.eventId, receiptRecognitionVersion: manifest.version },
    blockerCode: "GOODS_RECEIPT_POSTING_RULE_REVIEW", blockerMessage: "Receipt inventory recognition requires a configured inventory journal and inventory / goods-received accrual posting rule.",
  })
}
