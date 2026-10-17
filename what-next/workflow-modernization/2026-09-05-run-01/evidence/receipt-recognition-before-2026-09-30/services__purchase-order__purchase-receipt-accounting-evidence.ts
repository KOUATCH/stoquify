import { Prisma } from "@prisma/client"

export const receiptPostingEvidenceSelect = {
  id: true, organizationId: true, sourceType: true, sourceId: true, postingPurpose: true,
  status: true, postedAt: true, reversedAt: true, periodId: true,
  sourceLinks: { select: { organizationId: true, sourceType: true, sourceId: true, journalEntryId: true, sourceNumber: true, sourceDate: true, metadata: true } },
  journalEntries: { select: {
    id: true, organizationId: true, sourceType: true, sourceId: true, postingPurpose: true,
    postingBatchId: true, periodId: true, status: true, postedAt: true, reversedAt: true,
    reversalOfEntryId: true, entryDate: true, currency: true,
    reversedByEntries: { select: { id: true } },
    lines: { select: {
      organizationId: true, debit: true, credit: true, currency: true,
      account: { select: { organizationId: true, mappingKey: true } },
    } },
  } },
} satisfies Prisma.LedgerPostingBatchSelect

type PostingEvidence = Prisma.LedgerPostingBatchGetPayload<{ select: typeof receiptPostingEvidenceSelect }>

/** Batch status alone is not evidence of an accounting outcome. This is a
 * read-only corroboration check; it never repairs or creates missing effects. */
export function hasVerifiedReceiptPosting(input: {
  organizationId: string
  receiptId: string
  receiptNumber: string
  receiptDate: Date
  documentHashes: string[]
  currency: string
  value: Prisma.Decimal
  batches: PostingEvidence[]
}) {
  if (!input.documentHashes.length || input.value.lte(0) || input.batches.length !== 1) return false
  const batch = input.batches[0]
  const matchesSource = (row: { organizationId: string; sourceType: string | null; sourceId: string | null }) =>
    row.organizationId === input.organizationId && row.sourceType === "GOODS_RECEIPT" && row.sourceId === input.receiptId
  if (!matchesSource(batch) || batch.postingPurpose !== "GOODS_RECEIPT" || batch.status !== "POSTED" ||
    !batch.postedAt || batch.reversedAt || !batch.periodId || batch.journalEntries.length !== 1 || batch.sourceLinks.length !== 1) return false
  const entry = batch.journalEntries[0], link = batch.sourceLinks[0]
  const metadata = link.metadata && typeof link.metadata === "object" && !Array.isArray(link.metadata) ? link.metadata : null
  if (!matchesSource(entry) || entry.postingPurpose !== "GOODS_RECEIPT" || entry.postingBatchId !== batch.id ||
    entry.periodId !== batch.periodId || entry.status !== "POSTED" || !entry.postedAt || entry.reversedAt ||
    entry.reversalOfEntryId || entry.reversedByEntries.length || entry.entryDate.getTime() !== input.receiptDate.getTime() ||
    entry.currency !== input.currency || !matchesSource(link) || link.journalEntryId !== entry.id ||
    link.sourceNumber !== input.receiptNumber || link.sourceDate?.getTime() !== input.receiptDate.getTime() ||
    typeof metadata?.documentHash !== "string" || !input.documentHashes.includes(metadata.documentHash) || entry.lines.length < 2) return false

  let debit = new Prisma.Decimal(0), credit = new Prisma.Decimal(0), inventoryDebit = new Prisma.Decimal(0), inventoryCredit = new Prisma.Decimal(0)
  for (const line of entry.lines) {
    if (line.organizationId !== input.organizationId || line.account.organizationId !== input.organizationId ||
      line.currency !== input.currency || line.debit.lt(0) || line.credit.lt(0) || (line.debit.gt(0) && line.credit.gt(0))) return false
    debit = debit.plus(line.debit); credit = credit.plus(line.credit)
    if (line.account.mappingKey === "INVENTORY") { inventoryDebit = inventoryDebit.plus(line.debit); inventoryCredit = inventoryCredit.plus(line.credit) }
  }
  return debit.gt(0) && debit.eq(credit) && inventoryDebit.eq(input.value) && inventoryCredit.eq(0)
}
