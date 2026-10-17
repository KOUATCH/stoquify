import { Prisma } from "@prisma/client"
import { hasVerifiedReceiptPosting } from "../purchase-receipt-accounting-evidence"

type Input = Parameters<typeof hasVerifiedReceiptPosting>[0]
const decimal = (n: string | number) => new Prisma.Decimal(n)

function evidence(): Input {
  const when = new Date("2026-09-30T12:00:00Z"), source = { organizationId: "org-1", sourceType: "GOODS_RECEIPT" as const, sourceId: "receipt-1" }
  return {
    organizationId: "org-1", receiptId: "receipt-1", receiptNumber: "GR-1", receiptDate: when,
    documentHashes: ["sha256:source"], currency: "XAF", value: decimal(2500),
    batches: [{ ...source, id: "batch-1", postingPurpose: "GOODS_RECEIPT", status: "POSTED", postedAt: when, reversedAt: null, periodId: "period-1",
      sourceLinks: [{ ...source, journalEntryId: "entry-1", sourceNumber: "GR-1", sourceDate: when, metadata: { documentHash: "sha256:source" } }],
      journalEntries: [{ ...source, id: "entry-1", postingPurpose: "GOODS_RECEIPT", postingBatchId: "batch-1", periodId: "period-1", status: "POSTED", postedAt: when, reversedAt: null, reversalOfEntryId: null, entryDate: when, currency: "XAF", reversedByEntries: [],
        lines: [
          { organizationId: "org-1", debit: decimal(2500), credit: decimal(0), currency: "XAF", account: { organizationId: "org-1", mappingKey: "INVENTORY" } },
          { organizationId: "org-1", debit: decimal(0), credit: decimal(2500), currency: "XAF", account: { organizationId: "org-1", mappingKey: "GRNI" } },
        ],
      }],
    }],
  }
}

it("recognizes corroborated receipt values and source linkage without changing evidence", () => {
  const input = evidence(), before = JSON.stringify(input)
  expect(hasVerifiedReceiptPosting(input)).toBe(true)
  expect(JSON.stringify(input)).toBe(before)
})

const corruptions: Array<[string, (input: Input) => void]> = [
  ["no batch", x => { x.batches = [] }],
  ["duplicate batch", x => { x.batches.push(x.batches[0]) }],
  ["posted flag without journal", x => { x.batches[0].journalEntries = [] }],
  ["duplicate journal", x => { x.batches[0].journalEntries.push(x.batches[0].journalEntries[0]) }],
  ["missing link", x => { x.batches[0].sourceLinks = [] }],
  ["different linked source", x => { x.batches[0].sourceLinks[0].sourceId = "receipt-2" }],
  ["wrong document hash", x => { x.batches[0].sourceLinks[0].metadata = { documentHash: "changed" } }],
  ["missing source hash", x => { x.documentHashes = [] }],
  ["wrong source date", x => { x.batches[0].sourceLinks[0].sourceDate = new Date(0) }],
  ["foreign batch", x => { x.batches[0].organizationId = "org-2" }],
  ["foreign journal", x => { x.batches[0].journalEntries[0].organizationId = "org-2" }],
  ["foreign account", x => { x.batches[0].journalEntries[0].lines[0].account.organizationId = "org-2" }],
  ["foreign line", x => { x.batches[0].journalEntries[0].lines[0].organizationId = "org-2" }],
  ["failed batch", x => { x.batches[0].status = "FAILED" }],
  ["unposted journal", x => { x.batches[0].journalEntries[0].status = "DRAFT" }],
  ["reversed journal", x => { x.batches[0].journalEntries[0].reversedByEntries = [{ id: "reversal" }] }],
  ["different posting period", x => { x.batches[0].journalEntries[0].periodId = "period-2" }],
  ["different posting date", x => { x.batches[0].journalEntries[0].entryDate = new Date(0) }],
  ["different currency", x => { x.batches[0].journalEntries[0].currency = "USD" }],
  ["different line currency", x => { x.batches[0].journalEntries[0].lines[0].currency = "USD" }],
  ["unbalanced entry", x => { x.batches[0].journalEntries[0].lines[1].credit = decimal(2400) }],
  ["balanced wrong value", x => { x.value = decimal(2000) }],
  ["wrong inventory direction", x => { x.batches[0].journalEntries[0].lines.forEach(line => { [line.debit, line.credit] = [line.credit, line.debit] }) }],
  ["unmapped inventory leg", x => { x.batches[0].journalEntries[0].lines[0].account.mappingKey = null }],
  ["zero value", x => { x.value = decimal(0) }],
]

it.each(corruptions)("does not claim posting for %s", (_name, corrupt) => {
  const input = evidence(); corrupt(input)
  expect(hasVerifiedReceiptPosting(input)).toBe(false)
})
