import { randomUUID } from "node:crypto"
import { PrismaClient } from "@prisma/client"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  if (process.env.RUN_UI_WORKFLOW_POSTGRES !== "1") return { db: {} }
  const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
  const { PrismaClient: Client } = jest.requireActual("@prisma/client")
  return { db: new Client({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } }) }
})
import { db } from "@/prisma/db"
import { getItemOverview } from "@/services/item/item-overview.service"
import { searchBusinessRecords } from "@/services/search/business-record-search.service"

const suite = process.env.RUN_UI_WORKFLOW_POSTGRES === "1" ? describe : describe.skip
type Reader = Parameters<typeof getItemOverview>[0]
type Fixture = { reader: Reader; itemId: string; locationId: string; customerId: string; orderId: string }
let observer: PrismaClient
async function fixture(): Promise<Fixture> {
  const suffix = randomUUID(), orgId = `ux-read-${suffix}`, userId = `ux-reader-${suffix}`
  const permissions = ["inventory.items.read", "inventory.levels.read", "customers.read", "customers.analytics.read", "purchases.orders.read"]
  await db.organization.create({ data: { id: orgId, name: "Synthetic read fixture", slug: orgId, currency: "XAF" } })
  const role = await db.role.create({ data: { organizationId: orgId, code: "TEST_READER", nameEn: "Synthetic reader", permissions } })
  await db.user.create({ data: { id: userId, organizationId: orgId, email: `${suffix}@ui-workflow.invalid`, firstName: "Synthetic", lastName: "Reader", isActive: true, isVerified: true, emailVerified: true, mfaBackupCodes: [], roles: { connect: { id: role.id } } } })
  const reader: Reader = { orgId, userId, permissions, isSuperUser: false, roles: [{ id: role.id, code: role.code, nameEn: role.nameEn, nameFr: role.nameFr, permissions }] }
  const item = await db.item.create({ data: { organizationId: orgId, slug: suffix, sku: "READ-EXACT", nameEn: "Z exact item", nameFr: "Article exact", imageUrls: [], costPrice: 900, sellingPrice: 1200, trackInventory: true } })
  const location = await db.location.create({ data: { organizationId: orgId, name: "Unmanaged location", code: suffix, type: "WAREHOUSE" } })
  const supplier = await db.supplier.create({ data: { organizationId: orgId, name: "Synthetic supplier", code: suffix } })
  const customer = await db.customer.create({ data: { organizationId: orgId, name: "Z exact customer", code: "READ-EXACT", email: "private@ui-workflow.invalid", phone: "PRIVATE", currentBalance: 1200 } })
  const order = await db.purchaseOrder.create({ data: { organizationId: orgId, orderNumber: "READ-EXACT", supplierId: supplier.id, locationId: location.id, total: 1200, internalNotes: "PRIVATE" } })
  return { reader, itemId: item.id, locationId: location.id, customerId: customer.id, orderId: order.id }
}
const admin = (f: Fixture): Reader => ({ ...f.reader, roles: f.reader.roles.map(role => ({ ...role, code: "admin" })) })
suite("Item overview and record search on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
    observer = new PrismaClient({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } })
    const identity = await observer.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    expect(identity[0].name).toBe(process.env.UI_WORKFLOW_POSTGRES_DATABASE)
  })
  afterAll(async () => { await Promise.all([db.$disconnect(), observer?.$disconnect()]) })
  it("returns item identity without quantities or price fields for an identity-only reader", async () => {
    const f = await fixture()
    await db.inventoryLevel.create({ data: { itemId: f.itemId, locationId: f.locationId, quantityOnHand: 15, quantityAvailable: 12, quantityReserved: 3, totalValue: 13500 } })
    const result = await getItemOverview({ ...admin(f), permissions: ["inventory.items.read"] }, f.itemId)
    expect(result).toMatchObject({ sku: "READ-EXACT", stock: { state: "restricted", locations: [], hasMore: false } })
    expect(Object.keys(result!).sort()).toEqual(["id", "nameEn", "nameFr", "sku", "status", "stock", "unit", "updatedAt"])
    await expect(getItemOverview({ ...f.reader, permissions: [] }, f.itemId)).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
  it("scopes physical quantities to active managed locations and distinguishes zero from unknown", async () => {
    const f = await fixture()
    const zero = await db.location.create({ data: { organizationId: f.reader.orgId, code: "ZERO", name: "A zero", type: "WAREHOUSE", managerId: f.reader.userId } })
    const unknown = await db.location.create({ data: { organizationId: f.reader.orgId, code: "UNKNOWN", name: "B unknown", type: "WAREHOUSE", managerId: f.reader.userId } })
    await db.location.create({ data: { organizationId: f.reader.orgId, code: "INACTIVE", name: "C inactive", type: "WAREHOUSE", managerId: f.reader.userId, isActive: false } })
    await db.inventoryLevel.create({ data: { itemId: f.itemId, locationId: zero.id, quantityOnHand: 0, quantityAvailable: 0, quantityReserved: 0 } })
    await db.inventoryLevel.create({ data: { itemId: f.itemId, locationId: f.locationId, quantityOnHand: 999 } })
    const result = await getItemOverview(f.reader, f.itemId)
    expect(result?.stock.locations.map(row => row.id)).toEqual([zero.id, unknown.id])
    expect(result?.stock.locations[0]).toMatchObject({ onHand: "0", available: "0", reserved: "0" })
    expect(result?.stock.locations[1]).toMatchObject({ onHand: null, available: null, reserved: null, updatedAt: null })
    expect((await getItemOverview(admin(f), f.itemId))?.stock.locations).toHaveLength(3)
  })
  it("paginates equal-name locations without duplicates or skipped stored rows", async () => {
    const f = await fixture()
    const locations = Array.from({ length: 205 }, (_, index) => ({ id: `${f.reader.orgId}-${String(index).padStart(3, "0")}`, organizationId: f.reader.orgId, code: `LOC-${index}`, name: "Same location name", type: "WAREHOUSE" as const, managerId: f.reader.userId }))
    await db.location.createMany({ data: locations })
    const first = await getItemOverview(f.reader, f.itemId)
    const second = await getItemOverview(f.reader, f.itemId, first!.stock.nextCursor)
    const third = await getItemOverview(f.reader, f.itemId, second!.stock.nextCursor)
    expect([first!.stock.locations.length, second!.stock.locations.length, third!.stock.locations.length]).toEqual([100, 100, 5])
    const ids = [first, second, third].flatMap(page => page!.stock.locations.map(row => row.id))
    expect(ids).toEqual(locations.map(row => row.id)); expect(new Set(ids).size).toBe(205)
    expect(third?.stock.hasMore).toBe(false)
  })
  it("restarts safely for foreign and newly unauthorized location cursors", async () => {
    const f = await fixture(), other = await fixture()
    await db.location.update({ where: { id: f.locationId }, data: { managerId: f.reader.userId } })
    expect((await getItemOverview(f.reader, f.itemId, other.locationId))?.stock.locations.map(row => row.id)).toEqual([f.locationId])
    await db.location.update({ where: { id: f.locationId }, data: { managerId: null } })
    expect((await getItemOverview(f.reader, f.itemId, f.locationId))?.stock).toEqual({ state: "no_locations", hasMore: false, locations: [] })
    expect(await getItemOverview(f.reader, other.itemId)).toBeNull()
  })
  it("preserves exact fractional quantities and explicit untracked/archived states", async () => {
    const f = await fixture()
    await db.inventoryLevel.create({ data: { itemId: f.itemId, locationId: f.locationId, quantityOnHand: "2.125", quantityAvailable: "1.875", quantityReserved: "0.250" } })
    expect((await getItemOverview(admin(f), f.itemId))?.stock.locations[0]).toMatchObject({ onHand: "2.125", available: "1.875", reserved: "0.25" })
    await db.item.update({ where: { id: f.itemId }, data: { deletedAt: new Date(), trackInventory: false } })
    expect(await getItemOverview(admin(f), f.itemId)).toMatchObject({ status: "archived", stock: { state: "not_tracked", locations: [] } })
  })
  it("matches approved tenant-wide customer and PO read scope without location responsibility", async () => {
    const f = await fixture(), other = await fixture()
    const result = await searchBusinessRecords(f.reader, "  read-exact  ", "fr")
    expect(result.partialDomains).toEqual([])
    expect(result.hits.map(hit => hit.id)).toEqual([f.itemId, f.customerId, f.orderId])
    expect(result.hits.map(hit => hit.id)).not.toEqual(expect.arrayContaining([other.itemId, other.customerId, other.orderId]))
    expect(result.hits[0].title).toBe("Article exact")
    for (const hit of result.hits) expect(Object.keys(hit).sort()).toEqual(["domain", "href", "id", "reference", "title"])
    expect(JSON.stringify(result)).not.toContain("PRIVATE")
    expect(await db.customerLocation.count({ where: { customerId: f.customerId } })).toBe(0)
  })
  it("requires each destination permission and rechecks module admission", async () => {
    const f = await fixture()
    expect((await searchBusinessRecords({ ...f.reader, permissions: ["customers.read"] }, "READ-EXACT", "en")).hits).toEqual([])
    expect((await searchBusinessRecords({ ...f.reader, permissions: ["purchases.orders.read"] }, "READ-EXACT", "en")).hits.map(hit => hit.id)).toEqual([f.orderId])
    expect((await searchBusinessRecords({ ...f.reader, permissions: [] }, "READ-EXACT", "en")).hits).toEqual([])
    await db.tenantModuleConfiguration.create({ data: { organizationId: f.reader.orgId, manifestHash: "synthetic-empty-grants" } })
    expect(await searchBusinessRecords(f.reader, "READ-EXACT", "en")).toEqual({ query: "READ-EXACT", hits: [], partialDomains: [] })
  })
  it("bounds each domain to ten with exact references first and no soft-deleted results", async () => {
    const f = await fixture(), sourceOrder = await db.purchaseOrder.findUniqueOrThrow({ where: { id: f.orderId } })
    await db.item.createMany({ data: Array.from({ length: 14 }, (_, index) => ({ organizationId: f.reader.orgId, slug: randomUUID(), sku: `READ-EXACT-${index}`, nameEn: `A item ${index}`, imageUrls: [], costPrice: 0, sellingPrice: 0 })) })
    await db.customer.createMany({ data: Array.from({ length: 14 }, (_, index) => ({ organizationId: f.reader.orgId, code: `READ-EXACT-${index}`, name: `A customer ${index}` })) })
    await db.purchaseOrder.createMany({ data: Array.from({ length: 14 }, (_, index) => ({ organizationId: f.reader.orgId, orderNumber: `A-READ-EXACT-${index}`, supplierId: sourceOrder.supplierId, locationId: f.locationId })) })
    const first = await searchBusinessRecords(f.reader, "READ-EXACT", "en")
    expect(first.partialDomains).toEqual([])
    for (const [domain, id] of [["items", f.itemId], ["customers", f.customerId], ["purchaseOrders", f.orderId]]) {
      const hits = first.hits.filter(hit => hit.domain === domain)
      expect(hits).toHaveLength(10); expect(hits[0].id).toBe(id); expect(new Set(hits.map(hit => hit.id)).size).toBe(10)
    }
    await db.item.update({ where: { id: f.itemId }, data: { deletedAt: new Date() } })
    await db.customer.update({ where: { id: f.customerId }, data: { deletedAt: new Date() } })
    await db.purchaseOrder.update({ where: { id: f.orderId }, data: { deletedAt: new Date() } })
    const second = await searchBusinessRecords(f.reader, "READ-EXACT", "en")
    expect(second.hits).toHaveLength(30)
    expect(second.hits.some(hit => [f.itemId, f.customerId, f.orderId].includes(hit.id))).toBe(false)
  })
  it("returns explicit partial results when an actual item query exceeds its database timeout", async () => {
    const f = await fixture()
    let unlock!: () => void, locked!: () => void
    const release = new Promise<void>(resolve => { unlock = resolve }), ready = new Promise<void>(resolve => { locked = resolve })
    const holder = observer.$transaction(async tx => { await tx.$executeRaw`LOCK TABLE items IN ACCESS EXCLUSIVE MODE`; locked(); await release }, { timeout: 10000 })
    await Promise.race([ready, holder.then(() => { throw new Error("Lock holder ended before readiness") })])
    try {
      const result = await searchBusinessRecords(f.reader, "READ-EXACT", "en")
      expect(result.partialDomains).toEqual(["items"])
      expect(result.hits.map(hit => hit.id)).toEqual([f.customerId, f.orderId])
    } finally { unlock(); await holder }
    expect((await searchBusinessRecords(f.reader, "READ-EXACT", "en")).partialDomains).toEqual([])
  })
})
