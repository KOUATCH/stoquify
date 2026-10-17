import { Prisma } from "@prisma/client"
import { readClosePayableBalances } from "../close-payable-balances.service"

const date = new Date("2026-09-01"), end = new Date("2026-09-30T23:59:59.999Z"), cutoff = new Date("2026-10-05")
const d = (value: string) => new Prisma.Decimal(value)
const invoice = (patch = {}) => ({ id: "i", organizationId: "o", supplierId: "s", status: "POSTED", currency: "XAF", total: d("100.25"), amountPaid: d("0"), invoiceDate: date, dueDate: new Date("2026-10-30"), postedAt: date, ledgerPostingBatchId: "b", updatedAt: date, paymentAllocations: [], supplierCreditNotes: [], matchExceptions: [], ...patch })
const ledger = (patch = {}) => ({ organizationId: "o", supplierId: "s", referenceType: "SUPPLIER_INVOICE", referenceId: "i", type: "PURCHASE", entryDate: date, createdAt: date, debit: d("100.25"), credit: d("0"), ...patch })
function reader(invoices = [invoice()], entries = [ledger()]) {
  return { supplierInvoice: { findMany: jest.fn().mockResolvedValue(invoices) }, supplierLedgerEntry: { findMany: jest.fn().mockResolvedValue(entries) },
    supplierPayment: { findMany: jest.fn().mockResolvedValue([]) }, ledgerPostingBatch: { findMany: jest.fn().mockResolvedValue(invoices.map(row => ({ id: row.ledgerPostingBatchId, sourceType: "SUPPLIER_INVOICE", sourceId: row.id }))) } }
}
const read = (client: ReturnType<typeof reader>) => readClosePayableBalances(client as never, { organizationId: "o", economicThrough: end, recordedThrough: cutoff })

it.each([new Date("2026-10-30"), new Date("2026-08-30"), null])("keeps evidenced unpaid balances normal regardless of due-date maturity (%s)", async dueDate => {
  const result = await read(reader([invoice({ dueDate, deletedAt: date })]))
  expect(result).toMatchObject({ normalUnpaidCount: 1, exceptionCount: 0, currencies: [{ currency: "XAF", normalUnpaid: "100.25" }] })
  expect(result.balances[0]).toMatchObject({ classification: "NORMAL_UNPAID", outstanding: "100.25", maturity: !dueDate ? "DUE_DATE_UNKNOWN" : dueDate < end ? "OVERDUE" : "NOT_DUE" })
})
it.each([
  [{ status: "DISPUTED" }, "DISPUTED_INVOICE"],
  [{ status: "PAID" }, "PAID_BALANCE_MISMATCH"],
  [{ amountPaid: d("10") }, "UNVERIFIED_BALANCE"],
  [{ updatedAt: new Date("2026-10-06") }, "CUTOFF_EVIDENCE_UNAVAILABLE"],
  [{ postedAt: null }, "CUTOFF_EVIDENCE_UNAVAILABLE"],
  [{ matchExceptions: [{ organizationId: "o", status: "OPEN", createdAt: date }] }, "UNRESOLVED_MATCH_EXCEPTION"],
])("does not infer normality from an invoice status or unexplained balance (%s)", async (patch, reason) => {
  const result = await read(reader([invoice(patch as object)]))
  expect(result.balances[0].classification).toBe("EXCEPTION")
  expect(result.balances[0].outstanding).toBeNull()
  expect(result.balances[0].reasons).toContain(reason)
})
it("fails missing or mismatched supplier-ledger and posting evidence", async () => {
  const client = reader([invoice()], []); client.ledgerPostingBatch.findMany.mockResolvedValue([])
  expect((await read(client)).balances[0].reasons).toEqual(expect.arrayContaining(["UNVERIFIED_BALANCE", "MISSING_LEDGER_POSTING"]))
})
it("treats a verified partial payment as a normal remaining payable", async () => {
  const payment = { id: "p", organizationId: "o", supplierId: "s", currency: "XAF", status: "POSTED", amount: d("30.25"), paymentDate: date, updatedAt: date }
  const allocation = { organizationId: "o", supplierInvoiceId: "i", supplierPaymentId: "p", createdAt: date, amount: payment.amount, supplierPayment: payment }
  const row = invoice({ status: "PAYMENT_PENDING", amountPaid: payment.amount, paymentAllocations: [allocation] })
  const client = reader([row], [ledger(), ledger({ referenceType: "SUPPLIER_PAYMENT", referenceId: "p", type: "PAYMENT", debit: d("0"), credit: payment.amount })])
  client.supplierPayment.findMany.mockResolvedValue([{ id: "p", allocations: [{ ...allocation, supplierInvoice: row }] }])
  expect((await read(client)).balances[0]).toMatchObject({ classification: "NORMAL_UNPAID", outstanding: "70.00" })
})
it.each([false, true])("requires current independent approval for a matching exception (expired: %s)", async expired => {
  const match = { organizationId: "o", status: "APPROVED", createdAt: date, requestedById: "maker", approvedById: "checker", decidedAt: date, expiresAt: expired ? date : new Date("2026-11-01") }
  const result = await read(reader([invoice({ matchExceptions: [match] })]))
  expect(result.balances[0].classification).toBe(expired ? "EXCEPTION" : "NORMAL_UNPAID")
})
it("retains currencies separately and hashes the classified evidence", async () => {
  const client = reader([invoice(), invoice({ id: "eur", currency: "EUR", total: d("2.50"), ledgerPostingBatchId: "be" })], [ledger(), ledger({ referenceId: "eur", debit: d("2.50") })])
  const result = await read(client)
  expect(result.currencies.map(row => [row.currency, row.normalUnpaid])).toEqual([["EUR", "2.50"], ["XAF", "100.25"]])
  expect(result.evidenceHash).toMatch(/^[a-f0-9]{64}$/)
  expect((await read(client)).evidenceHash).toBe(result.evidenceHash)
})
it("uses posted credits and detects excess credit rather than clamping a negative balance", async () => {
  const credit = { id: "c", organizationId: "o", supplierId: "s", currency: "XAF", total: d("100.25"), direction: "CORRECTION", postedBusinessEventId: "e", createdAt: date, creditDate: date }
  const creditLedger = ledger({ referenceType: "SUPPLIER_CREDIT_NOTE", referenceId: "c", type: "CREDIT_NOTE", debit: d("0"), credit: credit.total })
  expect((await read(reader([invoice({ status: "PAID", supplierCreditNotes: [credit] })], [ledger(), creditLedger]))).balances[0].classification).toBe("SETTLED")
  credit.total = d("101")
  expect((await read(reader([invoice({ supplierCreditNotes: [credit] })], [ledger(), { ...creditLedger, credit: credit.total }]))).balances[0].reasons).toContain("INVALID_BALANCE")
})
it("does not use a post-period credit to reduce a period-end balance", async () => {
  const credit = { id: "c", organizationId: "o", supplierId: "s", currency: "XAF", total: d("10"), direction: "CORRECTION", postedBusinessEventId: "e", createdAt: date, creditDate: new Date("2026-10-02") }
  const result = await read(reader([invoice({ supplierCreditNotes: [credit] })], [ledger(), ledger({ referenceType: "SUPPLIER_CREDIT_NOTE", referenceId: "c", type: "CREDIT_NOTE", entryDate: credit.creditDate, debit: d("0"), credit: credit.total })]))
  expect(result.balances[0].reasons).toContain("CUTOFF_EVIDENCE_UNAVAILABLE")
})
it("scopes the full population to the tenant, economic end and recording cutoff without hiding archives", async () => {
  const client = reader([]); await read(client)
  const where = client.supplierInvoice.findMany.mock.calls[0][0].where
  expect(where).toMatchObject({ organizationId: "o", invoiceDate: { lte: end }, createdAt: { lte: cutoff } })
  expect(where.deletedAt).toBeUndefined()
})
it("propagates collection failure rather than returning an empty clean result", async () => {
  const client = reader(); client.supplierLedgerEntry.findMany.mockRejectedValue(new Error("unavailable"))
  await expect(read(client)).rejects.toThrow("unavailable")
})
