import { Prisma } from "@prisma/client"
import { readSupplierPaymentBalances, refreshSupplierInvoiceBalanceStatus, supplierInvoiceBalanceStatus } from "../supplier-payment-balance"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { allocateReceiptCost } from "@/services/inventory/receipt-cost-allocation"
jest.mock("@/prisma/db", () => ({ db: {} }))
const money = (n: string) => new Prisma.Decimal(n)
const invoice = { id: "i", organizationId: "o", supplierId: "s", currency: "XAF", total: money("100.25"), amountPaid: money("30.25") }
const credit = { id: "c", organizationId: "o", supplierId: "s", supplierInvoiceId: "i", currency: "XAF", total: money("20"), direction: "CORRECTION", reversalOfSupplierCreditNoteId: null, postedBusinessEventId: "event" }
const run = (credits: unknown[], invoices = [invoice], currency = "XAF") => readSupplierPaymentBalances({supplierCreditNote:{findMany:jest.fn().mockResolvedValue(credits)}} as never,"o",invoices,currency)
it("subtracts posted credits from the payable amount with exact decimals",async()=>expect((await run([credit])).get("i")?.toFixed(2)).toBe("50.00"))
it("restores the amount due after a matching posted reversal",async()=>expect((await run([credit,{...credit,id:"r",direction:"REVERSAL",reversalOfSupplierCreditNoteId:"c"}])).get("i")?.toFixed(2)).toBe("70.00"))
it.each([{currency:"EUR"},{supplierId:"other"},{organizationId:"foreign"},{total:money("-1")},{postedBusinessEventId:null}])("rejects inconsistent credit scope or evidence",async patch=>{await expect(run([{...credit,...patch}])).rejects.toThrow(/credit evidence/)})
it.each([[],[credit]].map(credits=>({credits})))("rejects mixed invoice currencies",async ({credits})=>{await expect(run(credits,[invoice,{...invoice,id:"i2",currency:"EUR"}])).rejects.toThrow(/same currency/)})
it("rejects a reversal without its original",async()=>{await expect(run([{...credit,id:"r",direction:"REVERSAL",reversalOfSupplierCreditNoteId:"missing"}])).rejects.toThrow(/reversal evidence/)})
it("preserves a supplier credit position as negative available payment, never a positive payment allowance",async()=>expect((await run([{...credit,total:money("80")}])).get("i")?.toFixed(2)).toBe("-10.00"))
it.each([
  ["0.00","80.00","PAID"], ["0.00","0.00","PAID"], ["-10.00","100.00","PAID"],
  ["20.00","80.00","PAYMENT_PENDING"], ["20.00","0.00","POSTED"], ["0.01","99.99","PAYMENT_PENDING"],
])("classifies outstanding %s with cash paid %s as %s",(outstanding,paid,status)=>expect(supplierInvoiceBalanceStatus(money(outstanding),money(paid))).toBe(status))
it("refreshes a credit-covered invoice without changing cash paid",async()=>{
  const tx={supplierCreditNote:{findMany:jest.fn().mockResolvedValue([{...credit,total:money("70")}])},supplierInvoice:{update:jest.fn()}}
  expect(await refreshSupplierInvoiceBalanceStatus(tx as never,"o",invoice)).toEqual({status:"PAID",outstanding:"0.00"})
  expect(tx.supplierInvoice.update).toHaveBeenCalledWith({where:{id:"i",organizationId:"o"},data:{status:"PAID"}})
})
it("reopens a covered invoice after its credit is reversed without creating a payment",async()=>{
  const tx={supplierCreditNote:{findMany:jest.fn().mockResolvedValue([credit,{...credit,id:"r",direction:"REVERSAL",reversalOfSupplierCreditNoteId:"c"}])},supplierInvoice:{update:jest.fn()}}
  expect(await refreshSupplierInvoiceBalanceStatus(tx as never,"o",invoice)).toEqual({status:"PAYMENT_PENDING",outstanding:"70.00"})
  expect(tx.supplierInvoice.update).toHaveBeenCalledWith({where:{id:"i",organizationId:"o"},data:{status:"PAYMENT_PENDING"}})
})
it("does not change invoice state when credit evidence cannot be read",async()=>{
  const tx={supplierCreditNote:{findMany:jest.fn().mockRejectedValue(new Error("unavailable"))},supplierInvoice:{update:jest.fn()}}
  await expect(refreshSupplierInvoiceBalanceStatus(tx as never,"o",invoice)).rejects.toThrow("unavailable")
  expect(tx.supplierInvoice.update).not.toHaveBeenCalled()
})

function zeroCredit() {
  const date = new Date("2026-09-30T12:00:00Z")
  const allocation = allocateReceiptCost({ sourceQuantity: "1", sourceValue: ".01", consumedQuantity: 0, consumedValue: 0, quantity: ".3" })
  const proof = { version: 2, organizationId: "o", supplierId: "s", invoiceId: "i", returnId: "return", creditId: "c", currency: "XAF", direction: "CORRECTION", reversalOfCreditId: null, returnRecognitionHash: "a".repeat(64), returnJournalId: null, lines: [{ returnLineId: "returned-line", invoiceLineId: "invoice-line", receiptLineId: "receipt-line", quantity: "0.300", claimAmount: "0.00", invoiceLineHash: "b".repeat(64), netAllocation: allocation, taxAllocation: { ...allocation, sourceValue: "0.00" } }] }
  const row = { ...credit, total: money("0"), subtotal: money("0"), taxAmount: money("0"), purchaseReturnId: "return", creditDate: date, postedById: "actor", documentHash: "sha256:credit", ledgerPostingBatchId: null, journalEntryId: null, lines: [{ sourcePurchaseReturnLineId: "returned-line", sourceSupplierInvoiceLineId: "invoice-line", sourceGoodsReceiptLineId: "receipt-line", quantity: money(".3"), taxAmount: money("0"), lineTotal: money("0") }] }
  const payload = { receiptCreditRecognition: proof, ledgerStatus: "NOT_REQUIRED" }
  const event = { eventSource: "INTERNAL", schemaVersion: 1, status: "APPLIED", processedAt: date, sourceType: "SUPPLIER_CREDIT_NOTE", sourceId: "c", actorId: "actor", occurredAt: date, documentHash: row.documentHash, postingBatchId: null, payload, payloadHash: hashBusinessPayload(payload), eventType: "purchase.supplier_credit.posted" }
  const tx = { supplierCreditNote: { findMany: jest.fn().mockResolvedValue([row]), findFirst: jest.fn().mockResolvedValue(row) }, businessEvent: { findFirst: jest.fn().mockResolvedValue(event) }, ledgerPostingBatch: { count: jest.fn().mockResolvedValue(0) }, journalEntry: { count: jest.fn().mockResolvedValue(0) }, accountingSourceLink: { count: jest.fn().mockResolvedValue(0) } }
  return { row, event, tx }
}
it("accepts a source-proven zero credit without changing the payable amount", async () => {
  const f = zeroCredit()
  expect((await readSupplierPaymentBalances(f.tx as never, "o", [invoice], "XAF")).get("i")?.toFixed(2)).toBe("70.00")
  expect(f.tx.businessEvent.findFirst).toHaveBeenCalledWith({ where: { id: "event", organizationId: "o" } })
})
it.each(["missing source", "changed event", "false journal", "hidden journal"])("rejects zero credit with %s", async kind => {
  const f = zeroCredit()
  if (kind === "missing source") f.tx.supplierCreditNote.findFirst.mockResolvedValue(null)
  if (kind === "changed event") f.event.payloadHash = "changed"
  if (kind === "false journal") f.row.journalEntryId = "invented" as never
  if (kind === "hidden journal") f.tx.journalEntry.count.mockResolvedValue(1)
  await expect(readSupplierPaymentBalances(f.tx as never, "o", [invoice], "XAF")).rejects.toThrow(/evidence|effects/)
})
