import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getSalesCollections, getSalesReceivables } from "../sales-collections.service"
import { getSalesProducts } from "../sales-products.service"
const d = (value: string | number) => new Prisma.Decimal(value)
const input = { organizationId: "org-1", locationId: "loc-1", preset: "custom" as const, start: "2026-09-01", end: "2026-09-02", status: "COMPLETED" as const, channel: "POS" as const, search: "ignored" }
const date = new Date("2026-09-01T12:00:00Z")
let tx: any
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-09-06T12:00:00Z"))
  tx = { organization: { findFirst: jest.fn().mockResolvedValue({ id: "org-1", currency: "XAF", timezone: "Africa/Douala" }) }, location: { findMany: jest.fn().mockResolvedValue([{ id: "loc-1" }]) },
    payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: d(90) } }), groupBy: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) }, paymentRefund: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }), count: jest.fn().mockResolvedValue(0) },
    customerSettlementAllocation: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) }, customerReceivableDocument: { findMany: jest.fn().mockResolvedValue([]) }, customerLedgerEntry: { findMany: jest.fn() },
    salesOrder: { findMany: jest.fn().mockResolvedValue([]) }, item: { findMany: jest.fn().mockResolvedValue([]) }, inventoryLevel: { findMany: jest.fn().mockResolvedValue([]) }, inventoryTransaction: { findMany: jest.fn().mockResolvedValue([]) } }
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(tx))
})
afterEach(() => jest.useRealTimers())
it("combines split tenders and later allocated receipts once, subtracting refunds and period reversals", async () => {
  tx.payment.groupBy.mockResolvedValue([{ method: "CASH", _sum: { amount: d("60.10") } }, { method: "CARD", _sum: { amount: d("40.20") } }])
  tx.paymentRefund.aggregate.mockResolvedValue({ _sum: { amount: d("10.05") } })
  tx.customerSettlementAllocation.findMany.mockResolvedValue([
    { amount: d(30), customerSettlement: { method: "CASH", settlementDate: date, reversalDate: new Date("2026-09-05"), status: "REVERSED" } },
    { amount: d(20), customerSettlement: { method: "CARD", settlementDate: new Date("2026-08-01"), reversalDate: date, status: "REVERSED" } },
  ])
  const result = await getSalesCollections(input)
  expect(result).toMatchObject({ receipts: "130.30", creditIssued: "90.00", refunds: "10.05", reversals: "20.00", net: "100.25" })
  expect(result.methods).toContainEqual({ method: "CASH", amount: "90.10", percent: "69.15" })
  const where = tx.payment.groupBy.mock.calls[0][0].where
  expect(where).toMatchObject({ organizationId: "org-1", purchaseOrderId: null, salesOrder: { organizationId: "org-1", locationId: "loc-1" }, status: { in: ["PAID", "REFUNDED"] }, processedAt: { gte: new Date("2026-08-31T23:00:00Z"), lt: new Date("2026-09-02T23:00:00Z") } })
  expect(tx.payment.aggregate.mock.calls[0][0].where).toMatchObject({ method: "CREDIT", salesOrder: { status: { in: ["COMPLETED"] }, channel: "POS", orderDate: where.processedAt } });
  expect(where.method.in).not.toContain("CREDIT"); expect(where.method.in).not.toContain("MIXED")
  expect(where.salesOrder).not.toHaveProperty("status"); expect(where.salesOrder).not.toHaveProperty("orderDate")
  expect(tx.paymentRefund.aggregate.mock.calls[0][0].where).toMatchObject({ status: "PROCESSED", payment: { organizationId: "org-1", salesOrder: { locationId: "loc-1" } } })
  expect(tx.customerSettlementAllocation.findMany.mock.calls[0][0]).toMatchObject({ take: 5001, where: { organizationId: "org-1", salesOrder: { locationId: "loc-1" }, customerSettlement: { currency: "XAF", organizationId: "org-1" } } })
})
it("keeps missing processing evidence distinct from zero and enforces the bounded read", async () => {
  tx.payment.count.mockResolvedValue(2)
  expect(await getSalesCollections(input)).toMatchObject({ receipts: "0.00", net: null, missingTimes: 2 })
  tx.customerSettlementAllocation.findMany.mockResolvedValue(Array(5001).fill({}))
  await expect(getSalesCollections(input)).rejects.toThrow(/bounded/)
})
it.each([getSalesCollections, getSalesReceivables, (scope: typeof input) => getSalesProducts(scope, { stock: true, margin: true })])("rejects a foreign location before domain data is fetched", async read => {
  await expect(read({ ...input, locationId: "foreign" })).rejects.toThrow(/location/)
  expect(tx.payment.groupBy).not.toHaveBeenCalled(); expect(tx.salesOrder.findMany).not.toHaveBeenCalled(); expect(tx.customerReceivableDocument.findMany).not.toHaveBeenCalled()
})
function doc(status = "PARTIALLY_PAID", paid = 70, unpaid = 30) {
  return { id: "doc", documentNumber: "AR-1", customerId: "customer", customer: { name: "Private name" }, customerSnapshot: {}, sourceSnapshot: {}, totalAmount: d(100), initialPaidAmount: d(10), initialUnpaidAmount: d(90), currency: "XAF", invoiceDate: new Date("2026-07-01"), dueDate: new Date("2026-08-01"), lifecycleStates: [{ status, paidAmount: d(paid), unpaidAmount: d(unpaid), version: 3 }] }
}
it("reuses latest lifecycle balances and redacts document/customer details", async () => {
  tx.customerReceivableDocument.findMany.mockResolvedValue([doc()])
  const result = await getSalesReceivables(input)
  expect(result.currencies).toEqual([{ currency: "XAF", outstanding: "30.00", overdue: "30.00", count: 1 }])
  expect(JSON.stringify(result)).not.toContain("Private name"); expect(JSON.stringify(result)).not.toContain("AR-1")
  expect(tx.customerReceivableDocument.findMany.mock.calls[0][0]).toMatchObject({ take: 1001, where: { organizationId: "org-1", sourceSalesOrder: { organizationId: "org-1", locationId: "loc-1" } }, include: { lifecycleStates: { take: 1, orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }] } } })
  expect(tx.customerLedgerEntry.findMany).not.toHaveBeenCalled()
  tx.customerReceivableDocument.findMany.mockResolvedValue([doc("PARTIALLY_PAID", 20, 80)])
  expect((await getSalesReceivables(input)).currencies[0].outstanding).toBe("80.00")
  tx.customerReceivableDocument.findMany.mockResolvedValue([doc("CANCELLED")])
  expect((await getSalesReceivables(input)).currencies[0].outstanding).toBe("0.00")
})
it("fails closed on missing receivable lifecycle or capacity instead of summing initial balances", async () => {
  tx.customerReceivableDocument.findMany.mockResolvedValue([{ ...doc(), lifecycleStates: [] }])
  await expect(getSalesReceivables(input)).rejects.toThrow(/lifecycle/)
  tx.customerReceivableDocument.findMany.mockResolvedValue(Array(1001).fill(doc()))
  await expect(getSalesReceivables(input)).rejects.toThrow(/narrower/)
})
function order(id = "sale", itemId = "item", value = 120) {
  return { id, locationId: "loc-1", orderDate: date, total: d(value + 5), taxAmount: d(20), lines: [{ id: id + "line", itemId, quantity: d(2), lineTotal: d(value), taxAmount: d(20), item: { nameEn: itemId, nameFr: "Produit", sku: itemId, organizationId: "org-1" } }] }
}
function product(id = "item") { return { id, nameEn: id, nameFr: "Produit", sku: id, isActive: false, deletedAt: null, trackInventory: true, minStockLevel: d(3), unit: { id: "kg", symbol: "kg", organizationId: "org-1" } } }
it("reconciles line/order differences, retains inactive/prior-only products, and reuses original issue costs", async () => {
  tx.salesOrder.findMany.mockResolvedValueOnce([order()]).mockResolvedValueOnce([order("prior", "old", 100)])
  tx.item.findMany.mockResolvedValue([product(), product("old")])
  tx.inventoryTransaction.findMany.mockResolvedValue([{ referenceId: "sale", itemId: "item", locationId: "loc-1", quantity: d(-2), unitCost: d(30), totalCost: d(60), timeProvenance: "EXPLICIT_SOURCE_TIME" }])
  tx.inventoryLevel.findMany.mockResolvedValue([{ itemId: "item", locationId: "loc-1", quantityOnHand: d(10), quantityReserved: d(4), quantityAvailable: d(6) }])
  const result = await getSalesProducts(input, { stock: true, margin: true })
  expect(result).toMatchObject({ lineValue: "120.00", orderValue: "125.00", orderDifference: "5.00" })
  expect(result.rows[0]).toMatchObject({ active: false, quantity: "2.000", available: "6.000", contribution: "40.00", margin: "40.00", stockStatus: "in" })
  expect(result.rows[1]).toMatchObject({ value: "0.00", available: null, stockStatus: "unknown", change: { absolute: "-100.00", percent: "-100.00" } })
  expect(tx.salesOrder.findMany.mock.calls[0][0]).toMatchObject({ take: 501, where: { organizationId: "org-1", locationId: "loc-1", status: { in: ["COMPLETED"] }, channel: "POS" } })
  expect(tx.inventoryLevel.findMany.mock.calls[0][0].where).toMatchObject({ item: { organizationId: "org-1" }, location: { organizationId: "org-1" }, locationId: { in: ["loc-1"] } })
  expect(tx.inventoryTransaction.findMany).toHaveBeenCalledTimes(1)
})
it("does not read stock or historical costs without their separate permissions", async () => {
  tx.salesOrder.findMany.mockResolvedValue([order()]); tx.item.findMany.mockResolvedValue([product()])
  const result = await getSalesProducts(input, { stock: false, margin: false })
  expect(result.rows[0]).toMatchObject({ available: null, contribution: null, margin: null, uncoveredCosts: null })
  expect(tx.inventoryTransaction.findMany).not.toHaveBeenCalled(); expect(tx.inventoryLevel.findMany).not.toHaveBeenCalled()
  expect(tx.item.findMany.mock.calls[0][0].select).not.toHaveProperty("minStockLevel")
})
it("marks missing/inconsistent cost and reservation evidence unavailable", async () => {
  tx.salesOrder.findMany.mockResolvedValue([order()]); tx.item.findMany.mockResolvedValue([product()])
  tx.inventoryLevel.findMany.mockResolvedValue([{ itemId: "item", quantityOnHand: d(10), quantityReserved: d(4), quantityAvailable: d(10) }])
  const result = await getSalesProducts(input, { stock: true, margin: true })
  expect(result.rows[0]).toMatchObject({ available: null, stockStatus: "unknown", contribution: null, margin: null, uncoveredCosts: 1 })
})
it("does not present a partial organization stock projection as a complete stock total", async () => {
  tx.location.findMany.mockResolvedValue([{ id: "loc-1" }, { id: "loc-2" }])
  tx.salesOrder.findMany.mockResolvedValue([order()]); tx.item.findMany.mockResolvedValue([product()])
  tx.inventoryLevel.findMany.mockResolvedValue([{ itemId: "item", locationId: "loc-1", quantityOnHand: d(10), quantityReserved: d(4), quantityAvailable: d(6) }])
  expect((await getSalesProducts({ ...input, locationId: undefined }, { stock: true, margin: false })).rows[0].available).toBeNull()
})
it("rejects excessive product or cost evidence without publishing truncated totals", async () => {
  tx.salesOrder.findMany.mockResolvedValue(Array(501).fill(order()))
  await expect(getSalesProducts(input, { stock: true, margin: true })).rejects.toThrow(/narrower/)
  tx.salesOrder.findMany.mockResolvedValue([order()]); tx.inventoryTransaction.findMany.mockResolvedValue(Array(20001).fill({}))
  await expect(getSalesProducts(input, { stock: true, margin: true })).rejects.toThrow(/narrower/)
})
