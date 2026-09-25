/** @jest-environment node */
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { completedReportScope, completedReportSales, completedSalesEvidence, reportGrowth } from "../completed-sales-evidence"
import { getFinancialSummaryReportReadModel } from "../financial-reports.service"

const d = (value: number) => new Prisma.Decimal(value)
const line = (id = "line-1", quantity = 2) => ({ id, itemId: "item-1", quantity: d(quantity), lineTotal: d(quantity * 120), taxAmount: d(quantity * 20), item: { nameEn: "Product", nameFr: "Produit", sku: "SKU" } })
const order = { id: "sale-1", locationId: "location-1", total: d(240), taxAmount: d(40), orderDate: new Date("2026-03-29T12:00:00Z"), lines: [line()], payments: [{ method: "CASH" as const, amount: d(240) }] }
const movement = (overrides = {}) => ({ referenceId: "sale-1", itemId: "item-1", locationId: "location-1", quantity: d(-2), unitCost: d(30), totalCost: d(60), timeProvenance: "EXPLICIT_SOURCE_TIME", ...overrides })
function client(movements = [movement()]) {
  const tx = {
    inventoryTransaction: { findMany: jest.fn().mockResolvedValue(movements) },
    organization: { findFirst: jest.fn().mockResolvedValue({ id: "org-1", currency: "XAF", timezone: "Europe/Paris" }) },
    location: { findFirst: jest.fn().mockResolvedValue({ id: "location-1" }) },
    salesOrder: { findMany: jest.fn().mockResolvedValue([order]) },
  }
  return { tx: tx as unknown as Prisma.TransactionClient, mocks: tx }
}
const input = { organizationId: "org-1", locationId: "location-1", startDate: new Date("2026-03-29T12:00:00Z"), endDate: new Date("2026-03-29T12:00:00Z") }

describe("completed sale cost evidence", () => {
  it("uses original stock costs and removes tax before calculating margin", async () => {
    const { tx, mocks } = client()
    const result = await completedSalesEvidence(tx, "org-1", [order])
    expect(result.cost?.toNumber()).toBe(60)
    expect(result.profit?.toNumber()).toBe(140)
    expect(result.revenue.toNumber()).toBe(240)
    expect(result.net.toNumber()).toBe(200)
    expect(mocks.inventoryTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", type: "SALE", referenceType: "SALES_ORDER", referenceId: { in: ["sale-1", "line-1"] } } }))
  })
  it("supports multiple delivery issues referenced by sale line", async () => {
    const { tx } = client([movement({ referenceId: "line-1", quantity: d(-1), totalCost: d(30) }), movement({ referenceId: "line-1", quantity: d(-1), unitCost: d(40), totalCost: d(40) })])
    expect((await completedSalesEvidence(tx, "org-1", [order])).cost?.toNumber()).toBe(70)
  })
  it.each([
    ["missing", []], ["partial quantity", [movement({ quantity: d(-1), totalCost: d(30) })]],
    ["duplicate quantity", [movement(), movement()]], ["foreign location", [movement({ locationId: "other" })]],
    ["legacy timestamp", [movement({ timeProvenance: "LEGACY_CREATED_AT_APPROXIMATION" })]],
    ["inconsistent cost", [movement({ totalCost: d(59) })]], ["unexpected item", [movement(), movement({ itemId: "extra-item" })]],
  ])("keeps %s evidence unavailable instead of using zero or catalogue cost", async (_name, rows) => {
    const { tx } = client(rows as ReturnType<typeof movement>[])
    const result = await completedSalesEvidence(tx, "org-1", [order])
    expect(result.cost).toBeNull(); expect(result.profit).toBeNull()
    expect(result.items.get("item-1")?.cost).toBeNull()
    expect(result.costEvidence.uncoveredGroups).toBe(1)
  })
  it("accepts a recorded zero cost with complete quantity evidence", async () => {
    const { tx } = client([movement({ unitCost: d(0), totalCost: d(0) })])
    expect((await completedSalesEvidence(tx, "org-1", [order])).cost?.toNumber()).toBe(0)
  })
  it("does not discard an incomplete group when another group is covered", async () => {
    const second = { ...order, id: "sale-2", lines: [line("line-2")] }
    const { tx } = client()
    const result = await completedSalesEvidence(tx, "org-1", [order, second])
    expect(result.costEvidence).toMatchObject({ coveredGroups: 1, uncoveredGroups: 1 })
    expect(result.cost).toBeNull(); expect(result.items.get("item-1")?.cost).toBeNull()
  })
  it("fails inconsistent source amounts and database errors without an empty result", async () => {
    const { tx, mocks } = client()
    await expect(completedSalesEvidence(tx, "org-1", [{ ...order, total: d(241) }])).rejects.toThrow("do not match")
    mocks.inventoryTransaction.findMany.mockRejectedValue(new Error("read unavailable"))
    await expect(completedSalesEvidence(tx, "org-1", [order])).rejects.toThrow("read unavailable")
  })
  it("does not query costs for a genuine empty period", async () => {
    const { tx, mocks } = client()
    const result = await completedSalesEvidence(tx, "org-1", [])
    expect(result.cost?.toNumber()).toBe(0); expect(result.costEvidence.uncoveredGroups).toBe(0)
    expect(mocks.inventoryTransaction.findMany).not.toHaveBeenCalled()
    expect(reportGrowth(d(100), d(0))).toBeNull(); expect(reportGrowth(null, d(100))).toBeNull()
  })
})

describe("scoped report snapshot", () => {
  it("uses local calendar days across DST and disjoint preceding periods", async () => {
    const { tx } = client(), scope = await completedReportScope(tx, input)
    expect(scope.start.toISOString()).toBe("2026-03-28T23:00:00.000Z")
    expect(scope.endExclusive.toISOString()).toBe("2026-03-29T22:00:00.000Z")
    expect(scope.previousStart.toISOString()).toBe("2026-03-27T23:00:00.000Z")
    expect(scope.calendarDays).toBe(1)
  })
  it("rejects missing organizations, foreign locations and invalid periods", async () => {
    const { tx, mocks } = client()
    await expect(completedReportScope(tx, { ...input, endDate: new Date("invalid") })).rejects.toThrow()
    mocks.organization.findFirst.mockResolvedValueOnce(null)
    await expect(completedReportScope(tx, input)).rejects.toThrow("Organization not found")
    mocks.location.findFirst.mockResolvedValueOnce(null)
    await expect(completedReportScope(tx, input)).rejects.toThrow("Report location not found")
  })
  it("filters cancelled/draft/deleted sales and unpaid payments in the authoritative query", async () => {
    const { tx, mocks } = client(), scope = await completedReportScope(tx, input)
    await completedReportSales(tx, scope)
    expect(mocks.salesOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", locationId: "location-1", deletedAt: null, status: { in: ["COMPLETED", "DELIVERED"] }, orderDate: { gte: scope.start, lt: scope.endExclusive } }, select: expect.objectContaining({ payments: { where: { deletedAt: null, status: "PAID" }, select: { method: true, amount: true } } }) }))
  })
  it("produces one repeatable snapshot with nullable comparison and a correct tax-exclusive margin", async () => {
    const { tx, mocks } = client()
    mocks.salesOrder.findMany.mockResolvedValueOnce([order]).mockResolvedValueOnce([])
    ;(db.$transaction as jest.Mock).mockImplementation(async callback => callback(tx))
    const result = await getFinancialSummaryReportReadModel(input)
    expect(result).toMatchObject({ totalRevenue: 240, netRevenue: 200, totalCost: 60, grossProfit: 140, grossMargin: 70, cashSales: 240, profitChange: null })
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
    const calls = mocks.salesOrder.findMany.mock.calls
    expect(calls[1][0].where.orderDate.lt).toEqual(calls[0][0].where.orderDate.gte)
  })
})
