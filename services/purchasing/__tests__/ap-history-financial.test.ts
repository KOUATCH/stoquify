import { Prisma } from "@prisma/client"
import { resolveAPHistoryFinancials } from "../ap-history-financial"
const money = (n: string) => new Prisma.Decimal(n)
const date = new Date("2026-09-01T00:00:00Z"), boundary = new Date("2026-09-02T00:00:00Z")
const invoice = (patch = {}) => ({id: "i", organizationId: "o", supplierId: "s", currency: "XAF", invoiceDate: date, status: "POSTED", total: money("100.25"), amountPaid: money("0"), paymentAllocations: [], supplierCreditNotes: [], updatedAt: date, deletedAt: null, ...patch})
const payment = (patch = {}) => ({id: "p", organizationId: "o", supplierId: "s", currency: "XAF", paymentDate: date, status: "RELEASED", amount: money("30.25"), updatedAt: date, ...patch})
const ledger = (patch = {}) => ({id: "l", organizationId: "o", supplierId: "s", referenceType: "SUPPLIER_INVOICE", referenceId: "i", type: "PURCHASE", entryDate: date, createdAt: date, debit: money("100.25"), credit: money("0"), ...patch})
const resolve = (invoices: unknown[], payments: unknown[], entries: unknown[]) => {
  const typedInvoices = invoices as Parameters<typeof resolveAPHistoryFinancials>[2]
  const typedPayments = payments as Parameters<typeof resolveAPHistoryFinancials>[3]
  const allocations = typedInvoices.flatMap(invoice => invoice.paymentAllocations.map(row => ({...row, supplierPaymentId: row.supplierPayment.id, supplierInvoice: invoice})))
  const sources = [...new Map([...typedPayments, ...allocations.map(row => row.supplierPayment)].map(row => [row.id, row])).values()]
  return resolveAPHistoryFinancials({supplierLedgerEntry: {findMany: jest.fn().mockResolvedValue(entries)}, supplierPayment: {findMany: jest.fn().mockResolvedValue(sources.map(row => ({...row, allocations: allocations.filter(a => a.supplierPaymentId === row.id)})))}} as never, "o", invoices as never, payments as never, boundary, "XAF")
}

it.each(["DRAFT", "MATCHED", "DISPUTED", "CANCELLED"])("keeps %s document value out of recognized liability", async status => {
  const result = await resolve([invoice({status})], [], [])
  expect(result.movements.get("invoice:i")).toEqual({state: "not_recognized", amount: "0.00"})
  expect(result.currencyTotals[0]).toMatchObject({invoiceTotal: "100.25", openPayable: "0.00"})
})
it.each(["DRAFT", "APPROVED", "FAILED", "CANCELLED"])("does not count %s payment as a released reduction", async status => {
  const result = await resolve([], [payment({status})], [])
  expect(result.movements.get("payment:p")).toEqual({state: "not_recognized", amount: "0.00"})
  expect(result.currencyTotals[0].releasedPaymentTotal).toBe("0.00")
})
it.each([[], [ledger(), ledger({id:"duplicate"})], [ledger({supplierId:"other"})], [ledger({organizationId:"other"})], [ledger({debit:money("1")})], [ledger({createdAt:new Date("2026-09-03")})]].map(entries => [entries]))("marks missing/conflicting posting evidence unavailable", async entries => {
  const result = await resolve([invoice()], [], entries)
  expect(result.movements.get("invoice:i")).toEqual({state:"unverified",amount:null})
  expect(result.currencyTotals[0].openPayable).toBeNull()
})
it("preserves recognized archived obligations and the cents in their source currency", async () => {
  const result = await resolve([invoice({deletedAt:date})], [], [ledger()])
  expect(result.currencyTotals[0].openPayable).toBe("100.25")
  expect(result.movements.get("invoice:i")?.amount).toBe("100.25")
})
it("uses recorded allocations and credits, then restores a reversed credit", async () => {
  const p = payment(), allocation = {organizationId:"o",supplierInvoiceId:"i",createdAt:date,amount:money("30.25"),supplierPayment:p}
  const note = {id:"c",organizationId:"o",supplierId:"s",currency:"XAF",direction:"CORRECTION",total:money("20"),creditDate:date,createdAt:date,postedBusinessEventId:"e"}
  const entries=[ledger(),ledger({id:"lp",referenceType:"SUPPLIER_PAYMENT",referenceId:"p",type:"PAYMENT",debit:money("0"),credit:money("30.25")}),ledger({id:"lc",referenceType:"SUPPLIER_CREDIT_NOTE",referenceId:"c",type:"CREDIT_NOTE",debit:money("0"),credit:money("20")})]
  const i=invoice({amountPaid:money("30.25"),paymentAllocations:[allocation],supplierCreditNotes:[note]})
  expect((await resolve([i],[p],entries)).currencyTotals[0]).toMatchObject({openPayable:"50.00",paidTotal:"30.25",creditTotal:"20.00",releasedPaymentTotal:"30.25"})
  const reversal={...note,id:"r",direction:"REVERSAL",reversalOfSupplierCreditNoteId:"c"}
  expect((await resolve([{...i,supplierCreditNotes:[note,reversal]}],[p],[...entries,ledger({id:"lr",referenceType:"SUPPLIER_CREDIT_NOTE_REVERSAL",referenceId:"r",type:"DEBIT_NOTE",debit:money("20"),credit:money("0")})])).currencyTotals[0].openPayable).toBe("70.00")
})
it("does not trust a stored paid amount without matching recorded payment allocations", async () => {
  const result=await resolve([invoice({amountPaid:money("30")})],[],[ledger()])
  expect(result.currencyTotals[0].openPayable).toBeNull()
  expect(result.currencyTotals[0].unverifiedCount).toBe(1)
})
it("does not net or relabel different source currencies", async () => {
  const result=await resolve([invoice(),invoice({id:"eur",currency:"EUR",total:money("2.50")})],[],[ledger(),ledger({id:"le",referenceId:"eur",debit:money("2.50")})])
  expect(result.currencyTotals.map(row=>[row.currency,row.openPayable])).toEqual([["EUR","2.50"],["XAF","100.25"]])
})
it("propagates ledger query failures rather than returning a zero balance", async () => {
  await expect(resolveAPHistoryFinancials({supplierLedgerEntry:{findMany:jest.fn().mockRejectedValue(new Error("database unavailable"))}} as never,"o",[invoice()] as never,[],boundary,"XAF")).rejects.toThrow("database unavailable")
})
