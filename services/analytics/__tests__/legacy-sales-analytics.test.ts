/** @jest-environment node */
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), pOSSession: { count: jest.fn() }, item: { count: jest.fn() } } }))

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getCashReconciliationReportsReadModel, getDashboardSummaryReadModel, getProductPerformanceReadModel, getSalesAnalyticsReadModel, getUserPerformanceReadModel } from "../sales-analytics.service"

const input = { organizationId: "org", locationId: "loc", startDate: new Date("2026-09-10T12:00:00Z"), endDate: new Date("2026-09-10T12:00:00Z") }
const d = (value: number) => new Prisma.Decimal(value)
function setup() {
  const tx = { organization: { findFirst: jest.fn().mockResolvedValue({ id: "org", currency: "XAF", timezone: "Africa/Douala" }) }, location: { findFirst: jest.fn().mockResolvedValue({ id: "loc" }) }, salesOrder: { findMany: jest.fn().mockResolvedValue([]) }, pOSSession: { findMany: jest.fn().mockResolvedValue([]) }, cashDrawerTransaction: { findMany: jest.fn().mockResolvedValue([]) }, item: { findMany: jest.fn().mockResolvedValue([]) }, inventoryTransaction: { findMany: jest.fn().mockResolvedValue([]) } }
  jest.mocked(db.$transaction).mockImplementation((async (fn: (value: unknown) => unknown) => fn(tx)) as typeof db.$transaction)
  return tx
}
beforeEach(() => jest.clearAllMocks())
it.each([getCashReconciliationReportsReadModel, getDashboardSummaryReadModel, getProductPerformanceReadModel, getSalesAnalyticsReadModel, getUserPerformanceReadModel])("rejects foreign location before any business query: %p", async reader => {
  const tx = setup(); tx.location.findFirst.mockResolvedValue(null)
  await expect(reader(input)).rejects.toThrow()
  for (const query of [tx.salesOrder.findMany, tx.pOSSession.findMany, tx.cashDrawerTransaction.findMany, tx.item.findMany, db.pOSSession.count]) expect(query).not.toHaveBeenCalled()
})
it("reads completed order dates and PAID tenders, preserving organization calendar buckets and Decimal sums", async () => {
  const tx = setup()
  tx.salesOrder.findMany.mockResolvedValue([0.1, 0.2].map((value, index) => ({ id: String(index), orderDate: new Date("2026-09-09T23:30:00Z"), total: d(value), lines: [{ itemId: "item", quantity: d(1), lineTotal: d(value), item: { nameEn: "Owned", sku: "SKU" } }], payments: [{ method: "CASH", amount: d(value) }] })))
  const report = await getSalesAnalyticsReadModel(input)
  expect(report.totalSales).toBe(0.3); expect(report.totalTransactions).toBe(2)
  expect(report.salesByHour[0]).toMatchObject({ sales: 0.3, transactions: 2 }); expect(report.salesByDay).toEqual([{ date: "2026-09-10", sales: 0.3, transactions: 2 }])
  expect(report.paymentMethods).toEqual([{ method: "CASH", amount: 0.3, count: 2, percentage: 100 }])
  expect(tx.salesOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", locationId: "loc", deletedAt: null, status: { in: ["COMPLETED", "DELIVERED"] }, orderDate: { gte: new Date("2026-09-09T23:00:00Z"), lt: new Date("2026-09-10T23:00:00Z") } }), select: expect.objectContaining({ payments: expect.objectContaining({ where: { deletedAt: null, status: "PAID" } }) }) }))
})
it("propagates source failure instead of returning zero rows", async () => {
  const tx = setup(); tx.salesOrder.findMany.mockRejectedValue(new Error("private database failure"))
  await expect(getSalesAnalyticsReadModel(input)).rejects.toThrow("Failed to get sales analytics")
  tx.cashDrawerTransaction.findMany.mockRejectedValue(new Error("private database failure"))
  await expect(getCashReconciliationReportsReadModel(input)).rejects.toThrow("Failed to get cash reconciliation reports")
})
it("returns genuine empty period buckets without fabricated user or product scores", async () => {
  setup(); const report = await getSalesAnalyticsReadModel(input)
  expect(report.totalSales).toBe(0); expect(report.salesByDay).toEqual([{ date: "2026-09-10", sales: 0, transactions: 0 }])
  expect(await getUserPerformanceReadModel(input)).toEqual([]); expect(await getProductPerformanceReadModel(input)).toEqual([])
})
it("keeps aggregate-location session counts tenant scoped", async () => {
  const tx = setup()
  Object.assign(tx.pOSSession, { count: db.pOSSession.count }); Object.assign(tx.item, { count: db.item.count }); Object.assign(tx, { inventoryLevel: { findMany: jest.fn().mockResolvedValue([]) } })
  jest.mocked(db.pOSSession.count).mockResolvedValue(0); jest.mocked(db.item.count).mockResolvedValue(0)
  await getDashboardSummaryReadModel({ organizationId: "org", locationId: "all" })
  expect(db.pOSSession.count).toHaveBeenCalledWith({ where: { organizationId: "org", status: "ACTIVE" } })
})
