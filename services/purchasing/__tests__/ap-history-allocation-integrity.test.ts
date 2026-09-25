import { Prisma } from "@prisma/client"
import { resolveAPHistoryFinancials } from "../ap-history-financial"
const d = (value: string) => new Prisma.Decimal(value)
const date = new Date("2026-08-10"), boundary = new Date("2026-09-01")
const payment = { id: "p", organizationId: "o", supplierId: "s", currency: "XAF", amount: d("100"), paymentDate: date, updatedAt: date, status: "RELEASED" }
const invoice = { id: "i1", organizationId: "o", supplierId: "s", currency: "XAF", total: d("200"), amountPaid: d("75"), invoiceDate: date, status: "POSTED", supplierCreditNotes: [] }
const allocation = (id: string, amount: string, patch = {}) => ({ id, organizationId: "o", supplierPaymentId: "p", supplierInvoiceId: id, amount: d(amount), createdAt: date, supplierPayment: payment, supplierInvoice: { ...invoice, id }, ...patch })
const ledger = [
 { organizationId: "o", supplierId: "s", referenceType: "SUPPLIER_INVOICE", referenceId: "i1", type: "PURCHASE", entryDate: date, createdAt: date, debit: d("200"), credit: d("0") },
 { organizationId: "o", supplierId: "s", referenceType: "SUPPLIER_PAYMENT", referenceId: "p", type: "PAYMENT", entryDate: date, createdAt: date, debit: d("0"), credit: d("100") },
]
function run(otherAmount: string, patch = {}) {
 const allocations = [allocation("i1", "75"), allocation("outside-filter", otherAmount, patch)]
 const client = {supplierLedgerEntry: { findMany: jest.fn().mockResolvedValue(ledger) }, supplierPayment: { findMany: jest.fn().mockResolvedValue([{...payment, allocations}]) }}
 return { client, result: resolveAPHistoryFinancials(client as never, "o", [{...invoice, paymentAllocations: [allocations[0]]}] as never, [payment] as never, boundary, "XAF") }
}
it("rejects settlement totals when a payment is overallocated outside the selected invoice scope", async () => {
 const { result } = run("75")
 expect((await result).currencyTotals[0]).toMatchObject({paidTotal: null, openPayable: null})
})
it("keeps exact valid split allocations and queries the trusted payment scope", async () => {
 const { result, client } = run("25")
 expect((await result).currencyTotals[0]).toMatchObject({paidTotal: "75.00", openPayable: "125.00", releasedPaymentTotal: "100.00"})
 expect(client.supplierPayment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "o", id: { in: ["p"] } } }))
})
it.each([
 { organizationId: "foreign" },
 { supplierInvoice: {...invoice, id: "outside-filter", organizationId: "foreign"} },
 { supplierInvoice: {...invoice, id: "outside-filter", supplierId: "other"} },
 { supplierInvoice: {...invoice, id: "outside-filter", currency: "EUR"} },
 { amount: d("-1") },
 { createdAt: new Date("2026-09-02") },
])("rejects inconsistent allocation evidence outside the filter", async patch => {
 expect((await run("25", patch).result).currencyTotals[0].openPayable).toBeNull()
})
