jest.mock("server-only", () => ({}))
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { dailySalesPeriod } from "../daily-sales-period"
import { getDailySalesReadModel, getLatestDailySalesDay } from "../daily-sales-read.service"

const decimal = (value: string) => new Prisma.Decimal(value)
const input = { organizationId: "org-1", locationId: "location-1", date: "2026-09-06" }
let tx: any
beforeEach(() => {
  tx = {
    organization: { findFirst: jest.fn().mockResolvedValue({ id: "org-1", currency: "XAF", timezone: "Africa/Douala" }) },
    location: { findMany: jest.fn().mockResolvedValue([{ id: "location-1", name: "Douala", isActive: true, deletedAt: null }]) },
    dailySalesReport: { findFirst: jest.fn().mockResolvedValue(null) },
    salesOrder: { aggregate: jest.fn().mockResolvedValue({ _sum: { total: null }, _count: { _all: 0 } }) },
    salesOrderLine: { aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: null }, _count: { _all: 0 } }), groupBy: jest.fn().mockResolvedValue([]) },
    item: { findMany: jest.fn().mockResolvedValue([]) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation((work: any) => work(tx))
})

it.each([
  ["2026-03-29", "Europe/Paris", "2026-03-28T23:00:00.000Z", "2026-03-29T22:00:00.000Z"],
  ["2026-10-25", "Europe/Paris", "2026-10-24T22:00:00.000Z", "2026-10-25T23:00:00.000Z"],
  ["2026-09-06", "Africa/Douala", "2026-09-05T23:00:00.000Z", "2026-09-06T23:00:00.000Z"],
])("uses the organization-local half-open day %s %s", (date, timezone, start, end) => {
  const period = dailySalesPeriod(date, timezone)
  expect(period.start.toISOString()).toBe(start); expect(period.endExclusive.toISOString()).toBe(end)
  expect(period.calendarDate.toISOString()).toBe(`${date}T00:00:00.000Z`)
})
it.each(["2026-02-30", "2026-13-01", "invalid", "2026-09-06T00:00:00Z"])("rejects invalid calendar date %s", date => {
  expect(() => dailySalesPeriod(date, "Africa/Douala")).toThrow()
})
it("uses organization-local today and refuses invalid timezone and skipped or ambiguous midnight", () => {
  expect(dailySalesPeriod(undefined, "Africa/Douala", new Date("2026-09-05T23:30:00Z")).date).toBe("2026-09-06")
  expect(() => dailySalesPeriod("2026-09-06", "Invalid/Zone")).toThrow()
  expect(() => dailySalesPeriod("2011-12-30", "Pacific/Apia")).toThrow()
  expect(() => dailySalesPeriod("2026-11-01", "America/Havana")).toThrow(/ambiguous/)
})
it("returns an honest empty order summary with unavailable cash and session facts", async () => {
  const result = await getDailySalesReadModel(input)
  expect(result.source.kind).toBe("ORDER_AGGREGATION")
  expect(result.metrics).toEqual({ value: "0.00", count: 0, quantity: "0.000", average: null })
  expect(result.recordedCash).toBeNull(); expect(result.recordedPayments).toBeNull(); expect(result).not.toHaveProperty("session")
  expect(result.context.currency.code).toBe("XAF")
  expect(tx.salesOrder.aggregate.mock.calls[0][0].where).toEqual(expect.objectContaining({ organizationId: "org-1", locationId: "location-1", deletedAt: null, orderDate: { gte: new Date("2026-09-05T23:00:00Z"), lt: new Date("2026-09-06T23:00:00Z") } }))
  expect(tx.dailySalesReport.findFirst.mock.calls[0][0].where.date).toEqual(new Date("2026-09-06T00:00:00Z"))
  expect(db.$transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
})
it("uses exact full aggregates and bounded top items without exposing foreign item names", async () => {
  tx.salesOrder.aggregate.mockResolvedValue({ _sum: { total: decimal("9999999999999999.99") }, _count: { _all: 3 } })
  tx.salesOrderLine.aggregate.mockResolvedValue({ _sum: { quantity: decimal("1.125") }, _count: { _all: 1 } })
  tx.salesOrderLine.groupBy.mockResolvedValue([{ itemId: "item-1", _sum: { quantity: decimal("1.125"), lineTotal: decimal("25.75") } }])
  const result = await getDailySalesReadModel(input)
  expect(result.metrics).toEqual({ value: "9999999999999999.99", count: 3, quantity: "1.125", average: "3333333333333333.33" })
  expect(result.topItems[0]).toEqual({ itemId: "item-1", nameEn: null, nameFr: null, sku: null, quantity: "1.125", value: "25.75" })
  expect(tx.item.findMany.mock.calls[0][0].where.organizationId).toBe("org-1")
  expect(tx.salesOrderLine.groupBy.mock.calls[0][0].take).toBe(5)
})
it("uses a real configured default and reports no locations without querying a fictitious location", async () => {
  expect((await getDailySalesReadModel({ organizationId: "org-1" })).locationId).toBe("location-1")
  tx.location.findMany.mockResolvedValue([]); tx.dailySalesReport.findFirst.mockClear()
  const result = await getDailySalesReadModel({ organizationId: "org-1" })
  expect(result.source.kind).toBe("NO_LOCATIONS"); expect(result.metrics).toBeNull(); expect(tx.dailySalesReport.findFirst).not.toHaveBeenCalled()
})
it("allows a retained same-tenant historical location and rejects a missing or foreign location", async () => {
  tx.location.findMany.mockResolvedValue([{ id: "location-1", name: "Retained", isActive: false, deletedAt: new Date() }])
  expect((await getDailySalesReadModel(input)).locations[0].retained).toBe(true)
  tx.dailySalesReport.findFirst.mockClear()
  await expect(getDailySalesReadModel({ ...input, locationId: "foreign" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(tx.dailySalesReport.findFirst).not.toHaveBeenCalled()
})
it("does not turn query failure or a missing nonempty aggregate into a zero", async () => {
  tx.salesOrder.aggregate.mockRejectedValueOnce(new Error("database unavailable"))
  await expect(getDailySalesReadModel(input)).rejects.toThrow("database unavailable")
  tx.salesOrder.aggregate.mockResolvedValue({ _sum: { total: null }, _count: { _all: 2 } })
  await expect(getDailySalesReadModel(input)).rejects.toThrow("unavailable amount")
})
it("rejects missing organizations and invalid currency context before loading reports", async () => {
  tx.organization.findFirst.mockResolvedValueOnce(null)
  await expect(getDailySalesReadModel(input)).rejects.toMatchObject({ code: "NOT_FOUND" })
  tx.organization.findFirst.mockResolvedValue({ id: "org-1", currency: "", timezone: "Africa/Douala" })
  await expect(getDailySalesReadModel(input)).rejects.toThrow("reporting context")
  expect(tx.dailySalesReport.findFirst).not.toHaveBeenCalled()
})
it("separates saved cash and credit records from order estimates and preserves the saved generation time", async () => {
  const report = { id: "daily-1", reportGeneratedAt: new Date("2026-09-06T22:00:00Z"), isFinalized: true, totalRevenue: decimal("20.25"), totalTransactions: 1, totalQuantitySold: decimal("1.000"), averageTransactionValue: decimal("20.25"), openingBalance: decimal("0"), closingBalance: decimal("13"), cashIn: decimal("5"), cashOut: decimal("2"), variance: decimal("-1"), cashSales: decimal("10"), cardSales: decimal("5"), mobileMoneySales: decimal("2"), bankTransferSales: decimal("1"), creditSales: decimal("2.25"), itemSales: [] }
  tx.dailySalesReport.findFirst.mockResolvedValue(report)
  const result = await getDailySalesReadModel(input)
  expect(result.source).toEqual({ kind: "STORED_REPORT", recordId: "daily-1", recordedAt: "2026-09-06T22:00:00.000Z", finalized: true })
  expect(result.recordedCash).toEqual({ opening: "0.00", closing: "13.00", cashIn: "5.00", cashOut: "2.00", variance: "-1.00" })
  expect(result.recordedPayments?.credit).toBe("2.25"); expect(result).not.toHaveProperty("expectedBalance")
  expect(tx.salesOrder.aggregate).not.toHaveBeenCalled()
})

describe("latest activity", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-06T12:00:00Z"))
    tx.location.findFirst = jest.fn().mockResolvedValue({ id: "location-1" })
    tx.dailySalesReport.findMany = jest.fn().mockResolvedValue([])
    tx.salesOrder.findFirst = jest.fn().mockResolvedValue(null)
  })
  afterEach(() => jest.useRealTimers())

  it("returns a bounded empty result rather than inventing a day", async () => {
    expect(await getLatestDailySalesDay(input)).toEqual({ date: null, from: "2025-09-06", through: "2026-09-06", locationId: "location-1" })
    expect(tx.dailySalesReport.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 366, where: expect.objectContaining({ organizationId: "org-1", locationId: "location-1" }) }))
    expect(tx.salesOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", locationId: "location-1", deletedAt: null, orderDate: { gte: new Date("2025-09-05T23:00:00Z"), lt: new Date("2026-09-06T23:00:00Z") } }) }))
  })
  it("excludes every saved day from order lookup, including a saved zero day", async () => {
    tx.dailySalesReport.findMany.mockResolvedValue([{ date: new Date("2026-09-06T00:00:00Z"), totalTransactions: 0 }, { date: new Date("2026-09-03T00:00:00Z"), totalTransactions: 2 }])
    tx.salesOrder.findFirst.mockResolvedValue({ orderDate: new Date("2026-09-04T23:30:00Z") })
    expect((await getLatestDailySalesDay(input)).date).toBe("2026-09-05")
    expect(tx.salesOrder.findFirst.mock.calls[0][0].where.NOT.OR).toEqual([
      { orderDate: { gte: new Date("2026-09-05T23:00:00Z"), lt: new Date("2026-09-06T23:00:00Z") } },
      { orderDate: { gte: new Date("2026-09-02T23:00:00Z"), lt: new Date("2026-09-03T23:00:00Z") } },
    ])
  })
  it("chooses a newer nonempty saved report over an older order", async () => {
    tx.dailySalesReport.findMany.mockResolvedValue([{ date: new Date("2026-09-05T00:00:00Z"), totalTransactions: 1 }])
    tx.salesOrder.findFirst.mockResolvedValue({ orderDate: new Date("2026-09-01T12:00:00Z") })
    expect((await getLatestDailySalesDay(input)).date).toBe("2026-09-05")
  })
  it("rejects foreign locations before activity reads and preserves query failure", async () => {
    tx.location.findFirst.mockResolvedValueOnce(null)
    await expect(getLatestDailySalesDay({ ...input, locationId: "foreign" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(tx.dailySalesReport.findMany).not.toHaveBeenCalled()
    tx.dailySalesReport.findMany.mockRejectedValueOnce(new Error("database unavailable"))
    await expect(getLatestDailySalesDay(input)).rejects.toThrow("database unavailable")
  })
})
