import { invoicePreparationDraftSchema, invoicePreparationCommandSchema } from "../invoice-preparation-contracts"

const draft = () => ({ supplierId: "supplier-1", invoiceNumber: "INV-1", invoiceDate: "2026-09-08", currency: "XAF", documentReference: "https://records.example.invalid/invoice", documentSha256: "a".repeat(64), lines: [{ goodsReceiptLineId: "receipt-1", description: "Stock", quantity: "0.125", unitCost: "2500.00", taxRate: "0" }] })
describe("reviewed supplier invoice contract", () => {
  it("accepts exact supported precision", () => { expect(invoicePreparationDraftSchema.parse(draft()).lines[0].quantity).toBe("0.125") })
  it.each(["NaN", "Infinity", "-1", "1e9", "0.0001", "1,5", "0"])("rejects invalid quantity %s", quantity => { const value = draft(); value.lines[0].quantity = quantity; expect(invoicePreparationDraftSchema.safeParse(value).success).toBe(false) })
  it("rejects dates normalized to another day and reversed due dates", () => {
    expect(invoicePreparationDraftSchema.safeParse({ ...draft(), invoiceDate: "2026-02-30" }).success).toBe(false)
    expect(invoicePreparationDraftSchema.safeParse({ ...draft(), dueDate: "2026-09-07" }).success).toBe(false)
  })
  it("rejects client authority, unsupported protocols and unbounded line counts", () => {
    expect(invoicePreparationDraftSchema.safeParse({ ...draft(), organizationId: "other" }).success).toBe(false)
    expect(invoicePreparationDraftSchema.safeParse({ ...draft(), documentReference: "javascript:alert(1)" }).success).toBe(false)
    expect(invoicePreparationDraftSchema.safeParse({ ...draft(), lines: Array(101).fill(draft().lines[0]) }).success).toBe(false)
  })
  it("requires a reviewed revision and bounded stable request", () => {
    expect(invoicePreparationCommandSchema.safeParse({ draft: draft(), expectedRevision: "a".repeat(64), idempotencyKey: "request-1" }).success).toBe(true)
    expect(invoicePreparationCommandSchema.safeParse({ draft: draft(), expectedRevision: "old", idempotencyKey: "request-1" }).success).toBe(false)
  })
})
