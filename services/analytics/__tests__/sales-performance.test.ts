import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getSalesPerformance, getSalesPerformanceOrder, performanceComparison } from "../sales-performance.service"
import { salesPerformancePeriod } from "../sales-performance-period"
import { formatSalesDecimal, readPerformanceScope } from "@/lib/analytics/sales-performance-scope"

const input = { organizationId: "org-1", canReadCustomers: false, preset: "custom" as const, start: "2026-09-01", end: "2026-09-02" }
const row = (id: string, value = "100.00") => ({ id, orderNumber: id, orderDate: new Date("2026-09-02T10:00:00Z"), total: new Prisma.Decimal(value), status: "COMPLETED", channel: "POS", paymentStatus: "PAID" })
let tx: any
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-09-06T11:30:00Z"))
  tx = { organization: { findFirst: jest.fn().mockResolvedValue({ id: "org-1", currency: "XAF", timezone: "Africa/Douala" }) },
    location: { findMany: jest.fn().mockResolvedValue([{ id: "loc-1", name: "Store" }]) }, customer: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]), salesOrder: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() } }
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(tx))
})
afterEach(() => jest.useRealTimers())

it("reconciles decimal totals, zero-filled buckets, counts and average with a constant aggregate query count", async () => {
  tx.$queryRaw.mockResolvedValueOnce([{ date: "2026-09-01", value: new Prisma.Decimal("200.20"), count: BigInt(2) }]).mockResolvedValueOnce([{ date: "2026-08-30", value: new Prisma.Decimal("100.00"), count: BigInt(1) }])
  const result = await getSalesPerformance(input)
  expect(result.current).toEqual({ value: "200.20", count: "2", average: "100.10" })
  expect(result.changes.value).toEqual({ absolute: "100.20", percent: "100.20" })
  expect(result.trend).toEqual([{ date: "2026-09-01", value: "200.20", count: "2" }, { date: "2026-09-02", value: "0.00", count: "0" }])
  expect(tx.$queryRaw).toHaveBeenCalledTimes(2)
  const sql = tx.$queryRaw.mock.calls[0][0]
  expect(sql.sql).toContain('"deletedAt" IS NULL'); expect(sql.sql).toContain("AT TIME ZONE")
  expect(sql.values).toEqual(expect.arrayContaining(["org-1", "Africa/Douala", "COMPLETED", "DELIVERED"]))
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
})
it("does not turn absent averages or zero baselines into a percentage", async () => {
  expect((await getSalesPerformance(input)).current).toEqual({ value: "0.00", count: "0", average: null })
  expect(performanceComparison("100.00", "0.00")).toEqual({ absolute: "100.00", percent: null })
  expect(performanceComparison("5", "-5").percent).toBeNull()
  expect(performanceComparison(null, "10")).toEqual({ absolute: null, percent: null })
  expect(formatSalesDecimal("9007199254740993.25", "en")).toBe("9,007,199,254,740,993.25")
})
it("keeps queries and payload bounded at the 366-day limit", async () => {
  const result = await getSalesPerformance({ ...input, start: "2025-09-06", end: "2026-09-06" })
  expect(result.trend).toHaveLength(366)
  expect(tx.$queryRaw).toHaveBeenCalledTimes(2)
  expect(tx.salesOrder.findMany).toHaveBeenCalledTimes(1)
  expect(tx.salesOrder.findMany.mock.calls[0][0].take).toBe(26)
})
it("scopes aggregates and records together while keeping search record-only and customers permission-bounded", async () => {
  await getSalesPerformance({ ...input, locationId: "loc-1", status: "DELIVERED", channel: "DELIVERY", search: "Alice" })
  const sql = tx.$queryRaw.mock.calls[0][0]
  expect(sql.values).toEqual(expect.arrayContaining(["org-1", "loc-1", "DELIVERED", "DELIVERY"]))
  expect(sql.values).not.toContain("Alice")
  const query = tx.salesOrder.findMany.mock.calls[0][0]
  expect(query.where.AND[0]).toMatchObject({ organizationId: "org-1", locationId: "loc-1", status: { in: ["DELIVERED"] }, channel: "DELIVERY", OR: [{ orderNumber: { contains: "Alice", mode: "insensitive" } }] })
  expect(query.select.customer).toBeUndefined()
})
it("only returns same-tenant minimal customer names when allowed", async () => {
  tx.salesOrder.findMany.mockResolvedValue([{ ...row("one"), customerId: "foreign" }, { ...row("two"), customerId: "customer-1" }])
  tx.customer.findMany.mockResolvedValue([{ id: "customer-1", name: "Alice" }])
  const result = await getSalesPerformance({ ...input, canReadCustomers: true, search: "Alice" })
  expect(result.records.map(record => record.customer)).toEqual([null, "Alice"])
  expect(tx.customer.findMany).toHaveBeenCalledWith({ where: { organizationId: "org-1", id: { in: ["foreign", "customer-1"] } }, select: { id: true, name: true } })
})
it("paginates by date and unique ID with a 26-row lookahead", async () => {
  tx.salesOrder.findMany.mockResolvedValue(Array.from({ length: 26 }, (_, index) => row(`id-${index}`)))
  const first = await getSalesPerformance(input)
  expect(first.records).toHaveLength(25); expect(first.nextCursor).toBe("id-24")
  tx.salesOrder.findFirst.mockResolvedValue({ id: "id-24", orderDate: row("id").orderDate })
  await getSalesPerformance({ ...input, cursor: first.nextCursor! })
  expect(tx.salesOrder.findFirst.mock.calls[0][0].where.AND[0]).toMatchObject({ organizationId: "org-1", deletedAt: null })
  expect(tx.salesOrder.findMany.mock.calls[1][0]).toMatchObject({ take: 26, orderBy: [{ orderDate: "desc" }, { id: "desc" }], where: { AND: [expect.anything(), { OR: [{ orderDate: { lt: row("id").orderDate } }, { orderDate: row("id").orderDate, id: { lt: "id-24" } }] }] } })
})
it("rejects foreign locations, invalid cursors, broad ranges and invalid days", async () => {
  await expect(getSalesPerformance({ ...input, locationId: "foreign" })).rejects.toThrow(/location/)
  expect(tx.$queryRaw).not.toHaveBeenCalled()
  await expect(getSalesPerformance({ ...input, cursor: "foreign" })).rejects.toThrow(/first page/)
  for (const scope of [{ start: "2024-01-01" }, { start: "2026-02-30" }, { end: "2026-12-01" }, { start: "2026-09-03" }]) await expect(getSalesPerformance({ ...input, ...scope })).rejects.toThrow()
})
it("propagates database failure rather than an empty result", async () => {
  tx.$queryRaw.mockRejectedValue(new Error("DB failed"))
  await expect(getSalesPerformance(input)).rejects.toThrow("DB failed")
})
it("scopes direct details independently and limits the fields returned", async () => {
  tx.salesOrder.findFirst.mockResolvedValue(null)
  await expect(getSalesPerformanceOrder({ organizationId: "org-1", orderId: "foreign", canReadCustomers: false })).rejects.toThrow(/not found/)
  expect(tx.salesOrder.findFirst.mock.calls[0][0].where).toMatchObject({ id: "foreign", organizationId: "org-1", deletedAt: null, status: { in: ["COMPLETED", "DELIVERED"] } })
  expect(tx.salesOrder.findFirst.mock.calls[0][0].select.customer).toBeUndefined()
})

it("compares partial periods through equivalent organization-local clock time", () => {
  const p = salesPerformancePeriod({ preset: "7d" }, "Africa/Douala", new Date("2026-09-06T11:30:00Z"))
  expect(p.start).toBe("2026-08-31"); expect(p.days).toBe(7)
  expect(p.previousStartDate).toBe("2026-08-24"); expect(p.previousEndAt?.toISOString()).toBe("2026-08-30T11:30:00.000Z")
  const dst = salesPerformancePeriod({ preset: "today" }, "Europe/Paris", new Date("2026-03-29T10:30:00Z"))
  expect(dst.startAt.toISOString()).toBe("2026-03-28T23:00:00.000Z")
  expect(dst.previousEndAt?.toISOString()).toBe("2026-03-28T11:30:00.000Z")
})
it("handles month boundaries, full DST days and ambiguous comparison clocks", () => {
  expect(salesPerformancePeriod({ preset: "month" }, "Africa/Douala", new Date("2026-09-30T23:15:00Z")).start).toBe("2026-10-01")
  const full = salesPerformancePeriod({ preset: "custom", start: "2026-03-29", end: "2026-03-29" }, "Europe/Paris", new Date("2026-04-01"))
  expect(full.endAt.getTime() - full.startAt.getTime()).toBe(23 * 3600000)
  expect(salesPerformancePeriod({ preset: "today" }, "Europe/Paris", new Date("2026-10-26T01:30:00Z")).previousEndAt).toBeNull()
})
it("validates bookmarks and discards old-organization filters", () => {
  expect(readPerformanceScope("?preset=7d&preset=today", "org-1").invalid).toBe(true)
  expect(readPerformanceScope("?status=DRAFT", "org-1").invalid).toBe(true)
  expect(readPerformanceScope("?preset=today&start=2026-01-01", "org-1").invalid).toBe(true)
  expect(readPerformanceScope("?preset=custom&start=2026-01-01", "org-1").invalid).toBe(true)
  expect(readPerformanceScope("?reportOrg=old&locationId=foreign", "org-1")).toEqual({ scope: {}, invalid: false })
})

it.each(["10", "25", "50"] as const)("bounds records and lookahead to the selected %s-row page", async pageSize => {
  const size = Number(pageSize)
  tx.salesOrder.findMany.mockResolvedValue(Array.from({ length: size + 1 }, (_, index) => row(`id-${index}`)))
  const result = await getSalesPerformance({ ...input, pageSize })
  expect(tx.salesOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: size + 1 }))
  expect(result.records).toHaveLength(size)
  expect(result.nextCursor).toBe(`id-${size - 1}`)
})

it("rejects unsupported and repeated page sizes before reading data", async () => {
  for (const size of ["0", "100000", "12", "invalid"]) {
    expect(readPerformanceScope(`?pageSize=${size}`, "org-1").invalid).toBe(true)
    await expect(getSalesPerformance({ ...input, pageSize: size as "10" })).rejects.toThrow()
  }
  expect(readPerformanceScope("?pageSize=10&pageSize=50", "org-1").invalid).toBe(true)
  expect(tx.salesOrder.findMany).not.toHaveBeenCalled()
})
