/** @jest-environment node */
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { businessPulsePeriods, readBusinessPulseSnapshot } from "../business-pulse-snapshot"
import { getBusinessPulseCommandReadModel } from "../sales-analytics.service"

const now = new Date("2026-02-28T12:30:00Z")
function setup() {
  const tx = { organization: { findFirst: jest.fn().mockResolvedValue({ id: "org", currency: "EUR", timezone: "Pacific/Auckland" }) }, location: { findFirst: jest.fn().mockResolvedValue({ id: "loc" }) }, salesOrder: { findMany: jest.fn().mockResolvedValue([]) }, pOSSession: { count: jest.fn().mockResolvedValue(1) }, inventoryLevel: { findMany: jest.fn().mockResolvedValue([]) }, item: { count: jest.fn().mockResolvedValue(0) } }
  jest.mocked(db.$transaction).mockImplementation((async (fn: (value: unknown) => unknown) => fn(tx)) as typeof db.$transaction)
  return tx
}
beforeEach(() => { jest.clearAllMocks() })
it("does not read an inactive selected site's operating figures", async () => {
  const tx = setup(); tx.location.findFirst.mockResolvedValueOnce({ id: "loc" }).mockResolvedValueOnce(null)
  const result = await readBusinessPulseSnapshot({ organizationId: "org", locationId: "loc" }, now)
  expect(result.summary).toBeNull(); expect(tx.salesOrder.findMany).not.toHaveBeenCalled()
  expect(tx.location.findFirst).toHaveBeenLastCalledWith({ where: { id: "loc", organizationId: "org", isActive: true, deletedAt: null }, select: { id: true } })
})
it("distinguishes missing stock evidence from no inventory-tracked items", async () => {
  const tx = setup(); tx.item.count.mockResolvedValue(2)
  const missing = await getBusinessPulseCommandReadModel({ organizationId: "org", locale: "fr" })
  expect(missing.summary.stockCoverage).toEqual({ activeItems: 2, itemsWithRecords: 0, itemsWithoutRecords: 2 })
  expect(missing.commandBrief.state).toBe("partial")
  expect(missing.cards.find(card => card.id === "business-pulse-low-stock")).toMatchObject({ state: "partial", value: "Indisponible" })
  tx.item.count.mockResolvedValue(0)
  const none = await getBusinessPulseCommandReadModel({ organizationId: "org", locale: "fr" })
  expect(none.cards.find(card => card.id === "business-pulse-low-stock")).toMatchObject({ state: "empty", value: "Aucun article suivi en stock" })
  expect(tx.item.count).toHaveBeenCalledWith({ where: { organizationId: "org", isActive: true, deletedAt: null, trackInventory: true } })
})
it("does not hide a failed inventory coverage query", async () => {
  const tx = setup(); tx.item.count.mockRejectedValue(new Error("coverage unavailable"))
  await expect(readBusinessPulseSnapshot({ organizationId: "org" }, now)).rejects.toThrow("coverage unavailable")
})
it("resolves the tenant day, Sunday week and month when the server is still in the previous month", () => {
  const p = businessPulsePeriods(now, "Pacific/Auckland")
  expect(p.today.toISOString()).toBe("2026-02-28T11:00:00.000Z")
  expect(p.week).toEqual(p.today); expect(p.month).toEqual(p.today)
  expect(p.yesterday.toISOString()).toBe("2026-02-27T11:00:00.000Z")
})
it("uses a 23-hour local day at a daylight-saving change", () => {
  const p = businessPulsePeriods(new Date("2026-03-08T12:00:00Z"), "America/New_York")
  expect(p.endExclusive.getTime() - p.today.getTime()).toBe(23 * 3600000)
})
it("reads selection, all periods and counts in exactly one repeatable snapshot", async () => {
  const tx = setup()
  tx.salesOrder.findMany.mockResolvedValue([{ id: "before", orderDate: new Date("2026-02-28T10:59:59Z"), total: new Prisma.Decimal(10), lines: [] }, { id: "today", orderDate: new Date("2026-02-28T11:00:00Z"), total: new Prisma.Decimal(20), lines: [] }])
  const result = await readBusinessPulseSnapshot({ organizationId: "org" }, now)
  expect(result.context).toMatchObject({ currency: "EUR", timezone: "Pacific/Auckland", locationId: "loc", periodStart: "2026-02-28T11:00:00.000Z" })
  expect(result.summary?.today).toMatchObject({ sales: 20, salesChange: 10 }); expect(result.summary?.week.sales).toBe(20); expect(result.summary?.month.sales).toBe(20)
  expect(db.$transaction).toHaveBeenCalledTimes(1); expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  expect(tx.salesOrder.findMany).toHaveBeenCalledTimes(1)
  expect(tx.pOSSession.count).toHaveBeenCalledWith({ where: { organizationId: "org", locationId: "loc", status: "ACTIVE" } })
})
it("retains organization context when no active site exists without reading business rows", async () => {
  const tx = setup(); tx.location.findFirst.mockResolvedValue(null)
  const result = await readBusinessPulseSnapshot({ organizationId: "org" }, now)
  expect(result.summary).toBeNull(); expect(result.context.currency).toBe("EUR")
  expect(tx.salesOrder.findMany).not.toHaveBeenCalled(); expect(tx.pOSSession.count).not.toHaveBeenCalled()
  const command = await getBusinessPulseCommandReadModel({ organizationId: "org" })
  expect(command.currency).toBe("EUR"); expect(command.timezone).toBe("Pacific/Auckland"); expect(command.commandBrief.state).toBe("blocked")
})
it("rejects missing organization and invalid timezone rather than returning empty success", async () => {
  const tx = setup(); tx.organization.findFirst.mockResolvedValue(null)
  await expect(readBusinessPulseSnapshot({ organizationId: "missing" }, now)).rejects.toThrow("Organization")
  tx.organization.findFirst.mockResolvedValue({ id: "org", currency: "EUR", timezone: "invalid" })
  await expect(readBusinessPulseSnapshot({ organizationId: "org" }, now)).rejects.toThrow("timezone")
})
it("does not hide a failed operational count behind zero", async () => {
  const tx = setup(); tx.pOSSession.count.mockRejectedValue(new Error("count unavailable"))
  await expect(readBusinessPulseSnapshot({ organizationId: "org" }, now)).rejects.toThrow("count unavailable")
})
it("uses available stock and each site's reorder point, counting an item once", async () => {
  const tx = setup()
  tx.item.count.mockResolvedValue(4)
  tx.inventoryLevel.findMany.mockResolvedValue([
    { itemId: "healthy", quantityAvailable: new Prisma.Decimal(8), reorderPoint: new Prisma.Decimal(2) },
    { itemId: "reserved", quantityAvailable: new Prisma.Decimal(12), reorderPoint: new Prisma.Decimal(15) },
    { itemId: "reserved", quantityAvailable: new Prisma.Decimal(0), reorderPoint: new Prisma.Decimal(0) },
    { itemId: "empty", quantityAvailable: new Prisma.Decimal(0), reorderPoint: new Prisma.Decimal(0) },
    { itemId: "fraction", quantityAvailable: new Prisma.Decimal("0.301"), reorderPoint: new Prisma.Decimal("0.300") },
  ])
  const result = await readBusinessPulseSnapshot({ organizationId: "org", locationId: "all" }, now)
  expect(result.summary?.lowStockItems).toBe(2)
  expect(tx.inventoryLevel.findMany).toHaveBeenCalledWith({ where: { item: { organizationId: "org", isActive: true, deletedAt: null, trackInventory: true }, location: { organizationId: "org", isActive: true, deletedAt: null } }, select: { itemId: true, quantityAvailable: true, reorderPoint: true } })
})
it("propagates unavailable stock evidence instead of reporting zero risk", async () => {
  const tx = setup(); tx.inventoryLevel.findMany.mockRejectedValue(new Error("stock unavailable"))
  await expect(readBusinessPulseSnapshot({ organizationId: "org" }, now)).rejects.toThrow("stock unavailable")
})
