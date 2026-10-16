import { z } from "zod"
import { boundedArray, MAX_MANUAL_JOURNAL_LINES, MAX_AP_BATCH_ENTRIES, MAX_POS_TENDERS } from "@/lib/validation/bounded-array"
import { postSupplierInvoiceInputSchema, approveSupplierPaymentInputSchema, releaseSupplierPaymentInputSchema } from "@/services/purchasing/ap-control.schemas"
import { invoicePreparationDraftSchema } from "@/services/purchasing/invoice-preparation-contracts"
import { paymentRequestDraftSchema } from "@/services/purchasing/payment-request-contracts"
import { commitSaleSchema } from "@/services/pos/pos.schemas"
import { createManualJournalEntryAction } from "@/actions/accounting/journals.actions"
import { createManualJournalEntry } from "@/services/accounting/journals.service"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/services/_shared/protect", () => ({ protect: (_options: unknown, handler: Function) => (input: unknown) => handler(input, { orgId: "org", userId: "user" }) }))
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ RbacError: class extends Error {}, requirePermission: jest.fn() }))
jest.mock("@/services/accounting/journals.service", () => ({ createManualJournalEntry: jest.fn(), listJournalEntries: jest.fn(), listJournals: jest.fn() }))
jest.mock("@/services/accounting/posting.service", () => ({ postJournalEntry: jest.fn(), reverseJournalEntry: jest.fn() }))

function unreadableArray(length: number) {
  const values = new Array(length)
  Object.defineProperty(values, 0, { get() { throw new Error("Array element must not be visited") } })
  return values
}

describe("array limits before element validation", () => {
  beforeEach(() => jest.clearAllMocks())
  it("short-circuits one million invalid entries with one issue, synchronously and asynchronously", async () => {
    const item = jest.fn((value) => value)
    const schema = boundedArray(z.array(z.preprocess(item, z.string())).min(1), 100)
    const values = unreadableArray(1_000_000)
    const result = schema.safeParse(values)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues).toHaveLength(1)
    expect((await schema.safeParseAsync(values)).success).toBe(false)
    expect(item).not.toHaveBeenCalled()
  })
  it("preserves transforms, minimums, optional arrays, element paths and non-array errors", () => {
    const schema = boundedArray(z.array(z.coerce.number().positive()).min(1), 2)
    expect(schema.parse(["1", "2"])).toEqual([1, 2])
    expect(schema.safeParse([]).success).toBe(false)
    expect(schema.optional().parse(undefined)).toBeUndefined()
    expect(schema.safeParse("1").success).toBe(false)
    const failure = z.object({ values: schema }).safeParse({ values: [-1] })
    if (failure.success) throw new Error("Expected element validation error")
    expect(failure.error.issues[0].path).toEqual(["values", 0])
  })

  const invoice = { organizationId: "org", supplierId: "supplier", invoiceNumber: "INV-1", lines: [{ goodsReceiptLineId: "receipt", description: "Item", quantity: "1", unitCost: "10" }] }
  const approval = { organizationId: "org", supplierId: "supplier", bankAccountId: "bank", method: "CASH", requestedById: "maker", approvedById: "checker", allocations: [{ supplierInvoiceId: "invoice", amount: "10" }] }
  const release = { organizationId: "org", supplierPaymentId: "payment", releasedById: "releaser", allocations: approval.allocations }
  const sale = { clientCommitId: "sale-command", salesOrderId: "sale", locationId: "location", terminalId: "terminal", sessionId: "session", tenders: [{ method: "CASH", amount: 1 }] }
  const preparation = { supplierId: "supplier", invoiceNumber: "INV-1", invoiceDate: "2026-10-16", currency: "XAF", documentReference: "https://example.test/invoice", documentSha256: "a".repeat(64), lines: [{ goodsReceiptLineId: "receipt", description: "Item", quantity: "1", unitCost: "10", taxRate: "0" }] }
  const request = { supplierId: "supplier", bankAccountId: "bank", method: "CASH", paymentDate: "2026-10-16", documentReference: "https://example.test/payment", documentSha256: "a".repeat(64), allocations: approval.allocations }
  const cases = [
    ["supplier invoice", postSupplierInvoiceInputSchema, invoice, "lines", MAX_AP_BATCH_ENTRIES],
    ["payment approval", approveSupplierPaymentInputSchema, approval, "allocations", MAX_AP_BATCH_ENTRIES],
    ["payment release", releaseSupplierPaymentInputSchema, release, "allocations", MAX_AP_BATCH_ENTRIES],
    ["POS tenders", commitSaleSchema, sale, "tenders", MAX_POS_TENDERS],
    ["invoice preparation", invoicePreparationDraftSchema, preparation, "lines", MAX_AP_BATCH_ENTRIES],
    ["payment request", paymentRequestDraftSchema, request, "allocations", MAX_AP_BATCH_ENTRIES],
  ] as const
  it.each(cases)("%s accepts valid inputs and rejects oversize before reading any item", (_name, schema, input, field, maximum) => {
    expect(schema.safeParse(input).success).toBe(true)
    const invalid = schema.safeParse({ ...input, [field]: unreadableArray(maximum + 1) })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues).toHaveLength(1)
      expect(invalid.error.issues[0].path).toEqual([field])
    }
  })
  it("accepts maximum-size invoices, tender lists and unique payment allocations", () => {
    expect(postSupplierInvoiceInputSchema.safeParse({ ...invoice, lines: Array.from({ length: MAX_AP_BATCH_ENTRIES }, () => invoice.lines[0]) }).success).toBe(true)
    expect(commitSaleSchema.safeParse({ ...sale, tenders: Array.from({ length: MAX_POS_TENDERS }, () => sale.tenders[0]) }).success).toBe(true)
    expect(paymentRequestDraftSchema.safeParse({ ...request, allocations: Array.from({ length: MAX_AP_BATCH_ENTRIES }, (_, i) => ({ supplierInvoiceId: `invoice-${i}`, amount: "10" })) }).success).toBe(true)
    expect(releaseSupplierPaymentInputSchema.safeParse({ ...release, allocations: undefined }).success).toBe(true)
  })
  it("rejects oversized journal lines before calling the journal service", async () => {
    await expect(createManualJournalEntryAction({ journalId: "journal", entryDate: "2026-10-16", lines: unreadableArray(MAX_MANUAL_JOURNAL_LINES + 1) })).rejects.toBeInstanceOf(z.ZodError)
    expect(createManualJournalEntry).not.toHaveBeenCalled()
  })
  it("accepts the journal boundary and retains its two-line minimum", async () => {
    const line = { accountId: "account", debit: "1" }
    await createManualJournalEntryAction({ journalId: "journal", entryDate: "2026-10-16", lines: Array.from({ length: MAX_MANUAL_JOURNAL_LINES }, () => line) })
    expect(createManualJournalEntry).toHaveBeenCalledTimes(1)
    await expect(createManualJournalEntryAction({ journalId: "journal", entryDate: "2026-10-16", lines: [line] })).rejects.toBeInstanceOf(z.ZodError)
    expect(createManualJournalEntry).toHaveBeenCalledTimes(1)
  })
})
