import { Prisma } from "@prisma/client"
import { netUninvoicedReceiptReturns } from "../receipt-invoice-capacity"

const d = (value: string | number) => new Prisma.Decimal(value)
const ref = { id: "line", goodsReceiptId: "receipt", purchaseOrderLineId: "po-line", itemId: "item" }
function returned(id = "return", invoiced = "0", uninvoiced = "3") {
  const amount = d(invoiced).plus(uninvoiced).times(10)
  return {
    id, organizationId: "org", supplierId: "supplier", goodsReceiptId: "receipt", purchaseOrderId: "order",
    direction: "CORRECTION", reversalOfPurchaseReturnId: null as string | null, reversalOfPurchaseReturn: null as unknown,
    lines: [{ id: id + "-line", organizationId: "org", purchaseReturnId: id, sourceGoodsReceiptLineId: "line", sourcePurchaseOrderLineId: "po-line", itemId: "item", quantity: d(invoiced).plus(uninvoiced), invoicedQuantity: d(invoiced), uninvoicedQuantity: d(uninvoiced), unitCost: d(10), inventoryAmount: amount, supplierClaimAmount: d(invoiced).times(10), grniAmount: d(uninvoiced).times(10) }],
  }
}
function reversal(original: ReturnType<typeof returned>) {
  return { ...original, id: "reversal", direction: "REVERSAL", reversalOfPurchaseReturnId: original.id, reversalOfPurchaseReturn: original, lines: original.lines.map(line => ({ ...line, id: "reverse-" + line.id, purchaseReturnId: "reversal" })) }
}
function setup(rows: ReturnType<typeof returned>[] = []) {
  const tx = { $queryRaw: jest.fn().mockResolvedValue([]), purchaseReturn: { findMany: jest.fn().mockResolvedValue(rows) } }
  const read = (lines = [ref]) => netUninvoicedReceiptReturns(tx as unknown as Prisma.TransactionClient, { organizationId: "org", supplierId: "supplier", lines })
  return { tx, read }
}

test("reads tenant-scoped immutable return facts after locking receipt capacity", async () => {
  const { tx, read } = setup([returned()])
  expect((await read()).get("line")?.toString()).toBe("3")
  expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.purchaseReturn.findMany.mock.invocationCallOrder[0])
  expect(tx.purchaseReturn.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", lines: { some: { sourceGoodsReceiptLineId: { in: ["line"] } } } } }))
})
test("does not subtract already invoiced return portions twice", async () => {
  const { read } = setup([returned("r1", "4", "0"), returned("r2", "2", "1")])
  expect((await read()).get("line")?.toString()).toBe("1")
})
test("exact reversal restores capacity once and a later return consumes it", async () => {
  const original = returned(), { read } = setup([reversal(original), original, returned("r2", "0", "2")])
  expect((await read()).get("line")?.toString()).toBe("2")
})
test("keeps fractional quantities exact", async () => {
  const { read } = setup([returned("r1", "0.1", "0.125"), returned("r2", "0", "0.075")])
  expect((await read()).get("line")?.toFixed(3)).toBe("0.200")
})
test("empty source set performs no query", async () => {
  const { tx, read } = setup()
  expect((await read([])).size).toBe(0)
  expect(tx.$queryRaw).not.toHaveBeenCalled()
})
test.each(["organizationId", "supplierId", "goodsReceiptId"] as const)("rejects mismatched return header %s", async field => {
  const row = returned(); row[field] = "other"
  await expect(setup([row]).read()).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
test.each(["organizationId", "purchaseReturnId", "sourcePurchaseOrderLineId", "itemId"] as const)("rejects mismatched line %s", async field => {
  const row = returned(); row.lines[0][field] = "other"
  await expect(setup([row]).read()).rejects.toThrow(/require review/)
})
test.each(["quantity", "invoicedQuantity", "uninvoicedQuantity"] as const)("rejects invalid quantity split %s", async field => {
  const row = returned(); row.lines[0][field] = d(-1)
  await expect(setup([row]).read()).rejects.toThrow(/require review/)
})
test("rejects orphaned or duplicate reversals instead of granting capacity", async () => {
  const original = returned(), reverse = reversal(original)
  await expect(setup([{ ...reverse, reversalOfPurchaseReturn: null }]).read()).rejects.toThrow(/require review/)
  await expect(setup([original, reverse, { ...reverse, id: "second", lines: reverse.lines.map(line => ({ ...line, purchaseReturnId: "second" })) }]).read()).rejects.toThrow(/require review/)
})
test.each(["quantity", "invoicedQuantity", "uninvoicedQuantity", "unitCost", "inventoryAmount", "supplierClaimAmount", "grniAmount"] as const)("a reversal must reproduce the original %s", async field => {
  const original = returned(), reverse = reversal(original)
  reverse.lines[0][field] = reverse.lines[0][field].plus(1)
  await expect(setup([original, reverse]).read()).rejects.toThrow(/require review/)
})
test("a reversal must reproduce the entire original line set", async () => {
  const original = returned(), reverse = reversal(original)
  original.lines.push({ ...original.lines[0], id: "other-line", sourceGoodsReceiptLineId: "other" })
  await expect(setup([original, reverse]).read()).rejects.toThrow(/require review/)
})
test("does not turn a failed return query into no returned goods", async () => {
  const { tx, read } = setup()
  tx.purchaseReturn.findMany.mockRejectedValue(new Error("database unavailable"))
  await expect(read()).rejects.toThrow("database unavailable")
})
