import { Prisma } from "@prisma/client"
import { readSupplierPaymentBalances, refreshSupplierInvoiceBalanceStatus, supplierInvoiceBalanceStatus } from "../supplier-payment-balance"
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
