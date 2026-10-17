jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), $executeRaw: jest.fn(), item: { findMany: jest.fn() }, customer: { findMany: jest.fn() }, purchaseOrder: { findMany: jest.fn() } } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))

import { db } from "@/prisma/db"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { searchBusinessRecords } from "../business-record-search.service"

const ctx = { orgId: "org-a", userId: "reader", permissions: ["inventory.items.read", "customers.read", "customers.analytics.read", "purchases.orders.read"], roles: [{ code: "manager" }], isSuperUser: false } as Parameters<typeof searchBusinessRecords>[0]
beforeEach(() => {
  jest.clearAllMocks()
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(db))
  ;(db.$executeRaw as jest.Mock).mockResolvedValue(0)
  ;(db.item.findMany as jest.Mock).mockResolvedValue([])
  ;(db.customer.findMany as jest.Mock).mockResolvedValue([])
  ;(db.purchaseOrder.findMany as jest.Mock).mockResolvedValue([])
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
})

it("does not query short inputs or unauthorized domains", async () => {
  expect((await searchBusinessRecords(ctx, "x", "en")).hits).toEqual([])
  await searchBusinessRecords({ ...ctx, permissions: [] }, "flour", "en")
  expect(db.$transaction).not.toHaveBeenCalled()
  expect(observeModuleAccess).not.toHaveBeenCalled()
})

it("does not expose customer results without destination analytics authority", async () => {
  await searchBusinessRecords({ ...ctx, permissions: ["customers.read"] }, "alice", "en")
  expect(db.customer.findMany).not.toHaveBeenCalled()
  expect(observeModuleAccess).not.toHaveBeenCalled()
})

it("does not query records from a disabled module", async () => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
  expect((await searchBusinessRecords(ctx, "order", "en")).hits).toEqual([])
  expect(db.$transaction).not.toHaveBeenCalled()
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ mode: "enforce", accessIntent: "read" }))
})

it("prioritizes exact references, bounds each query and projects minimal localized item data", async () => {
  ;(db.item.findMany as jest.Mock).mockResolvedValueOnce([{ id: "exact", nameEn: "Flour", nameFr: "Farine", sku: "FLOUR" }]).mockResolvedValueOnce([{ id: "partial", nameEn: "Flour 2", nameFr: null, sku: "FLOUR-2" }])
  const result = await searchBusinessRecords({ ...ctx, permissions: ["inventory.items.read"] }, "FLOUR", "fr")
  expect(result.hits.map(hit => hit.id)).toEqual(["exact", "partial"])
  expect(result.hits[0]).toEqual({ id: "exact", domain: "items", title: "Farine", reference: "FLOUR", href: "/dashboard/inventory/items/exact" })
  const [first, second] = (db.item.findMany as jest.Mock).mock.calls.map(call => call[0])
  expect(first.where).toMatchObject({ organizationId: "org-a", deletedAt: null, sku: { equals: "FLOUR", mode: "insensitive" } })
  expect(first.take).toBe(10)
  expect(second.take).toBe(9)
  expect(second.where.id).toEqual({ notIn: ["exact"] })
  expect(first.select).toEqual({ id: true, nameEn: true, nameFr: true, sku: true })
  expect(db.$executeRaw).toHaveBeenCalled()
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 1200, maxWait: 250 })
})

it("matches customer and PO destination scope without requiring unrelated manager assignments", async () => {
  await searchBusinessRecords(ctx, "ref", "en")
  const customer = (db.customer.findMany as jest.Mock).mock.calls[0][0]
  expect(customer.where.organizationId).toBe("org-a")
  expect(customer.where.locationAssignments).toBeUndefined()
  expect(customer.select).toEqual({ id: true, name: true, code: true })
  expect((db.purchaseOrder.findMany as jest.Mock).mock.calls[0][0].where).toMatchObject({ organizationId: "org-a", deletedAt: null })
})

it("keeps successful domains when one domain fails without returning internal errors", async () => {
  ;(db.customer.findMany as jest.Mock).mockRejectedValue(new Error("private database information"))
  ;(db.item.findMany as jest.Mock).mockResolvedValueOnce([{ id: "item", nameEn: "Item", nameFr: null, sku: "REF" }]).mockResolvedValue([])
  const result = await searchBusinessRecords(ctx, "ref", "en")
  expect(result.partialDomains).toEqual(["customers"])
  expect(result.hits).toHaveLength(1)
  expect(JSON.stringify(result)).not.toContain("private")
})

it("bounds the wait for a stalled domain and preserves other results", async () => {
  jest.useFakeTimers()
  try {
    ;(db.customer.findMany as jest.Mock).mockReturnValue(new Promise(() => {}))
    const request = searchBusinessRecords(ctx, "ref", "en")
    await jest.advanceTimersByTimeAsync(1501)
    expect((await request).partialDomains).toEqual(["customers"])
  } finally { jest.useRealTimers() }
})

it("keeps administrator queries tenant-scoped and truncates oversized input", async () => {
  const result = await searchBusinessRecords({ ...ctx, isSuperUser: true }, "a".repeat(200), "en")
  expect(result.query).toHaveLength(100)
  expect((db.customer.findMany as jest.Mock).mock.calls[0][0].where.locationAssignments).toBeUndefined()
  expect((db.customer.findMany as jest.Mock).mock.calls[0][0].where.organizationId).toBe("org-a")
})
