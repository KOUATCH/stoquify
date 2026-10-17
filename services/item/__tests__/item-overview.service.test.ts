jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { item: { findFirst: jest.fn() }, location: { findMany: jest.fn(), findFirst: jest.fn() } } }))

import { db } from "@/prisma/db"
import { getItemOverview } from "../item-overview.service"

const context = { orgId: "org-a", userId: "reader", permissions: ["inventory.items.read", "inventory.levels.read"], roles: [{ code: "manager" }], isSuperUser: false } as Parameters<typeof getItemOverview>[0]
const timestamp = new Date("2026-10-04T09:00:00Z")
const item = { id: "item-a", nameEn: "Flour", nameFr: "Farine", sku: "FLOUR", unit: { symbol: "kg", organizationId: "org-a" }, isActive: true, isDiscontinued: false, deletedAt: null, trackInventory: true, updatedAt: timestamp }
const stock = { quantityOnHand: "0", quantityAvailable: "0", quantityReserved: "0", updatedAt: timestamp }

beforeEach(() => {
  jest.clearAllMocks()
  ;(db.item.findFirst as jest.Mock).mockResolvedValue(item)
  ;(db.location.findMany as jest.Mock).mockResolvedValue([{ id: "loc-a", name: "Store", inventoryLevels: [stock] }])
})

it("requires read authority before looking up any record", async () => {
  await expect(getItemOverview({ ...context, permissions: [] }, "item-a")).rejects.toThrow("read permission")
  expect(db.item.findFirst).not.toHaveBeenCalled()
})

it("scopes the item to the authenticated tenant and excludes financial fields", async () => {
  const result = await getItemOverview(context, "item-a")
  const query = (db.item.findFirst as jest.Mock).mock.calls[0][0]
  expect(query.where).toEqual({ id: "item-a", organizationId: "org-a" })
  expect(query.select).not.toHaveProperty("costPrice")
  expect(query.select).not.toHaveProperty("sellingPrice")
  expect(result).not.toHaveProperty("organizationId")
  expect(result).not.toHaveProperty("costPrice")
})

it("returns unavailable for a foreign or missing item without querying locations", async () => {
  ;(db.item.findFirst as jest.Mock).mockResolvedValue(null)
  expect(await getItemOverview(context, "foreign")).toBeNull()
  expect(db.location.findMany).not.toHaveBeenCalled()
})

it("allows item readers without update or stock permission to read identity only", async () => {
  const result = await getItemOverview({ ...context, permissions: ["inventory.items.read"] }, "item-a")
  expect(result?.sku).toBe("FLOUR")
  expect(result?.stock).toEqual({ state: "restricted", locations: [], hasMore: false })
  expect(db.location.findMany).not.toHaveBeenCalled()
})

it("restricts non-administrators to their active managed locations before reading quantities", async () => {
  await getItemOverview(context, "item-a")
  expect(db.location.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { organizationId: "org-a", managerId: "reader", deletedAt: null, isActive: true },
    select: expect.objectContaining({ inventoryLevels: expect.objectContaining({ where: { itemId: "item-a", item: { organizationId: "org-a" } } }) }),
  }))
})

it("keeps tenant administrators tenant-scoped without a manager restriction", async () => {
  await getItemOverview({ ...context, roles: [{ code: "admin" }] as typeof context.roles }, "item-a")
  expect((db.location.findMany as jest.Mock).mock.calls[0][0].where).toEqual({ organizationId: "org-a", deletedAt: null, isActive: true })
})

it("distinguishes zero stock, unknown stock and no authorized locations", async () => {
  ;(db.location.findMany as jest.Mock).mockResolvedValue([
    { id: "zero", name: "Zero", inventoryLevels: [stock] },
    { id: "unknown", name: "Unknown", inventoryLevels: [] },
  ])
  const result = await getItemOverview(context, "item-a")
  expect(result?.stock.locations[0].onHand).toBe("0")
  expect(result?.stock.locations[1].onHand).toBeNull()
  ;(db.location.findMany as jest.Mock).mockResolvedValue([])
  expect((await getItemOverview(context, "item-a"))?.stock.state).toBe("no_locations")
})

it("does not convert a failed stock read into zero or an empty successful result", async () => {
  ;(db.location.findMany as jest.Mock).mockRejectedValue(new Error("database unavailable"))
  await expect(getItemOverview(context, "item-a")).rejects.toThrow("database unavailable")
})

it("represents archived and untracked items and redacts a foreign unit relation", async () => {
  ;(db.item.findFirst as jest.Mock).mockResolvedValue({ ...item, deletedAt: timestamp, trackInventory: false, unit: { symbol: "secret", organizationId: "org-b" } })
  const result = await getItemOverview(context, "item-a")
  expect(result?.status).toBe("archived")
  expect(result?.unit).toBeNull()
  expect(result?.stock.state).toBe("not_tracked")
  expect(db.location.findMany).not.toHaveBeenCalled()
})

it("bounds large location lists and declares truncation without global totals", async () => {
  ;(db.location.findMany as jest.Mock).mockResolvedValue(Array.from({ length: 101 }, (_, i) => ({ id: String(i), name: String(i), inventoryLevels: [] })))
  const result = await getItemOverview(context, "item-a")
  expect(result?.stock.locations).toHaveLength(100)
  expect(result?.stock.hasMore).toBe(true)
  expect(result?.stock.nextCursor).toBe("99")
  expect(result?.stock).not.toHaveProperty("total")
  expect(db.location.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 101 }))
})

it("continues after a scoped location with duplicate-name tie breaking", async () => {
  ;(db.location.findFirst as jest.Mock).mockResolvedValue({ id: "loc-a", name: "Store" })
  const result = await getItemOverview(context, "item-a", "loc-a")
  expect(db.location.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "loc-a", organizationId: "org-a", managerId: "reader", deletedAt: null, isActive: true } }))
  expect(db.location.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-a", managerId: "reader", OR: [{ name: { gt: "Store" } }, { name: "Store", id: { gt: "loc-a" } }] }) }))
  expect(result?.stock.after).toBe("loc-a")
})

it("restarts safely when a cursor is foreign, removed or no longer authorized", async () => {
  ;(db.location.findFirst as jest.Mock).mockResolvedValue(null)
  const result = await getItemOverview(context, "item-a", "foreign")
  expect(result?.stock.after).toBeUndefined()
  expect((db.location.findMany as jest.Mock).mock.calls[0][0].where).not.toHaveProperty("OR")
})
