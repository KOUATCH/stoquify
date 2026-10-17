import { randomUUID } from "node:crypto"
import { setTimeout as delay } from "node:timers/promises"
import { PrismaClient } from "@prisma/client"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  if (process.env.RUN_UI_WORKFLOW_POSTGRES !== "1") return { db: {} }
  const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
  const { PrismaClient: Client } = jest.requireActual("@prisma/client")
  return { db: new Client({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } }) }
})
import { db } from "@/prisma/db"
import { savePurchaseAuthoring, preparePurchaseAuthoring, createPurchaseOrderFromAuthoring, discardPurchaseAuthoring, getPurchaseAuthoring, type PurchaseAuthoringActor } from "@/services/purchase-order/purchase-order-authoring.service"
import { emptyPurchaseAuthoring, type PurchaseAuthoringContent } from "@/services/purchase-order/purchase-order-authoring-contracts"

const suite = process.env.RUN_UI_WORKFLOW_POSTGRES === "1" ? describe : describe.skip
type Fixture = { actor: PurchaseAuthoringActor; draftId: string; content: PurchaseAuthoringContent }
let observer: PrismaClient
const oldFlag = process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED
async function fixture(): Promise<Fixture> {
  const suffix = randomUUID(), orgId = `ux-po-${suffix}`, userId = `ux-buyer-${suffix}`, permissions = ["purchases.orders.create"]
  await db.organization.create({ data: { id: orgId, name: "Synthetic authoring test", slug: orgId, currency: "XAF" } })
  const role = await db.role.create({ data: { organizationId: orgId, code: "TEST_BUYER", nameEn: "Test buyer", permissions } })
  await db.user.create({ data: { id: userId, organizationId: orgId, email: `${suffix}@ui-workflow.invalid`, firstName: "Synthetic", lastName: "Buyer", isActive: true, isVerified: true, emailVerified: true, mfaBackupCodes: [], roles: { connect: { id: role.id } } } })
  const session = await db.session.create({ data: { userId, token: `synthetic-${randomUUID()}`, expiresAt: new Date(Date.now() + 3600000) } })
  const supplier = await db.supplier.create({ data: { organizationId: orgId, name: "Synthetic supplier", code: suffix } })
  const location = await db.location.create({ data: { organizationId: orgId, name: "Synthetic warehouse", code: suffix, type: "WAREHOUSE" } })
  const item = await db.item.create({ data: { organizationId: orgId, slug: suffix, sku: suffix, nameEn: "Synthetic item", imageUrls: [], costPrice: 100, sellingPrice: 150 } })
  return { actor: { orgId, userId, permissions, sessionId: session.id, sessionToken: session.token }, draftId: randomUUID(),
    content: { ...emptyPurchaseAuthoring(), supplierId: supplier.id, locationId: location.id, date: "2026-10-04", expectedDeliveryDate: "2026-10-05", shippingCost: "0", orderLines: [{ itemId: item.id, quantity: "2.5", unitPrice: "100", taxRate: "0", discount: "0", notes: "" }] } }
}
const input = (f: Fixture) => ({ id: f.draftId, expectedRevision: 0, title: "Synthetic work", content: f.content })
async function prepare(f: Fixture) {
  const saved = await savePurchaseAuthoring(f.actor, input(f))
  const prepared = await preparePurchaseAuthoring(f.actor, { id: f.draftId, expectedRevision: saved.revision })
  return { id: f.draftId, expectedRevision: prepared.revision }
}
async function effects(f: Fixture) {
  const organizationId = f.actor.orgId
  return { orders: await db.purchaseOrder.count({ where: { organizationId } }),
    events: await db.businessEvent.count({ where: { organizationId, eventType: "purchase_order.authoring_created" } }),
    sequence: await db.documentSequence.findUnique({ where: { organizationId_documentType_scopeKey: { organizationId, documentType: "PURCHASE_ORDER", scopeKey: "GLOBAL" } }, select: { nextValue: true } }),
    stock: await db.inventoryTransaction.count({ where: { organizationId } }),
    outbox: await db.businessEventOutbox.count({ where: { organizationId } }),
  }
}
async function contend<T>(f: Fixture, tasks: () => Promise<T>[]) {
  let unlock!: () => void, locked!: () => void
  const release = new Promise<void>(resolve => { unlock = resolve }), ready = new Promise<void>(resolve => { locked = resolve })
  const holder = observer.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${f.actor.orgId} FOR UPDATE`; locked(); await release }, { timeout: 10000 })
  await Promise.race([ready, holder.then(() => { throw new Error("Lock holder ended before readiness") })])
  const pending = Promise.allSettled(tasks())
  try {
    let waiting = 0
    const deadline = Date.now() + 1500
    while (Date.now() < deadline) {
      const rows = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(DISTINCT pid) AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%FROM organizations%FOR UPDATE%'`
      waiting = Number(rows[0].count)
      if (waiting >= 2) break
      await delay(20)
    }
    expect(waiting).toBeGreaterThanOrEqual(2)
  } finally { unlock(); await holder }
  return pending
}
suite("UI workflow purchase authoring on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
    observer = new PrismaClient({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } })
    const identity = await observer.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    expect(identity[0].name).toBe(process.env.UI_WORKFLOW_POSTGRES_DATABASE)
  })
  beforeEach(() => { process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED = "true" })
  afterAll(async () => {
    if (oldFlag === undefined) delete process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED
    else process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED = oldFlag
    await Promise.all([db.$disconnect(), observer?.$disconnect()])
  })
  it("deduplicates simultaneous first saves without creating a business document", async () => {
    const f = await fixture()
    f.content.shippingCost = "12."
    const results = await contend(f, () => [savePurchaseAuthoring(f.actor, input(f)), savePurchaseAuthoring(f.actor, input(f))])
    expect(results.every(result => result.status === "fulfilled")).toBe(true)
    const saved = await getPurchaseAuthoring(f.actor, { id: f.draftId })
    expect(saved.revision).toBe(1); expect(saved.content.shippingCost).toBe("12.")
    expect(await db.auditLog.count({ where: { organizationId: f.actor.orgId, action: "PO_AUTHORING_SAVED" } })).toBe(1)
    expect(await effects(f)).toEqual({ orders: 0, events: 0, sequence: null, stock: 0, outbox: 0 })
  })
  it("rejects a competing tab save rather than overwriting newer work", async () => {
    const f = await fixture(); await savePurchaseAuthoring(f.actor, input(f))
    const results = await contend(f, () => ["First", "Second"].map(title => savePurchaseAuthoring(f.actor, { ...input(f), expectedRevision: 1, title })))
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
    expect(results.find(result => result.status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } })
    expect((await getPurchaseAuthoring(f.actor, { id: f.draftId })).revision).toBe(2)
  })
  it("creates exactly one order, number and applied receipt for competing commits", async () => {
    const f = await fixture(), c = await prepare(f)
    const results = await contend(f, () => [createPurchaseOrderFromAuthoring(f.actor, c), createPurchaseOrderFromAuthoring(f.actor, c)])
    expect(results.every(result => result.status === "fulfilled")).toBe(true)
    const receipts = results.map(result => result.status === "fulfilled" ? result.value.receipt : null)
    expect(receipts[0]).toEqual(receipts[1]); expect(receipts[0]?.orderNumber).toBe("PO-000001")
    expect(await effects(f)).toEqual({ orders: 1, events: 1, sequence: { nextValue: 2 }, stock: 0, outbox: 0 })
    expect((await db.businessEvent.findFirstOrThrow({ where: { organizationId: f.actor.orgId, eventType: "purchase_order.authoring_created" } })).status).toBe("APPLIED")
  })
  it("serializes create and discard, resolving creation if it already committed", async () => {
    const f = await fixture(), c = await prepare(f)
    const results = await contend(f, () => [createPurchaseOrderFromAuthoring(f.actor, c), discardPurchaseAuthoring(f.actor, c)])
    const current = await getPurchaseAuthoring(f.actor, { id: f.draftId })
    expect(["CREATED", "DISCARDED"]).toContain(current.status)
    if (current.status === "CREATED") {
      expect(results.every(result => result.status === "fulfilled")).toBe(true)
      expect(current.receipt).not.toBeNull()
      expect((await effects(f)).orders).toBe(1)
    } else {
      expect(results[0]).toMatchObject({ status: "rejected", reason: { code: "CONFLICT" } })
      expect(await effects(f)).toEqual({ orders: 0, events: 0, sequence: null, stock: 0, outbox: 0 })
    }
  })
  it("resolves a committed request after write rollback and still checks current session", async () => {
    const f = await fixture(), c = await prepare(f), first = await createPurchaseOrderFromAuthoring(f.actor, c)
    delete process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED
    expect((await createPurchaseOrderFromAuthoring(f.actor, c)).receipt).toEqual(first.receipt)
    expect((await getPurchaseAuthoring(f.actor, { id: f.draftId })).receipt).toEqual(first.receipt)
    await observer.session.update({ where: { id: f.actor.sessionId }, data: { expiresAt: new Date(0) } })
    await expect(getPurchaseAuthoring(f.actor, { id: f.draftId })).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect((await effects(f)).orders).toBe(1)
  })
  it("rejects a deactivated source before allocating the document number", async () => {
    const f = await fixture(), c = await prepare(f)
    await observer.supplier.update({ where: { id: f.content.supplierId }, data: { isActive: false } })
    await expect(createPurchaseOrderFromAuthoring(f.actor, c)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect((await getPurchaseAuthoring(f.actor, { id: f.draftId })).status).toBe("PREPARED")
    expect(await effects(f)).toEqual({ orders: 0, events: 0, sequence: null, stock: 0, outbox: 0 })
  })
  it("does not expose a foreign tenant draft or accept a cross-tenant creator FK", async () => {
    const f = await fixture(), other = await fixture(); await savePurchaseAuthoring(f.actor, input(f))
    await expect(getPurchaseAuthoring(other.actor, { id: f.draftId })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(observer.$executeRaw`UPDATE purchase_order_authoring_drafts SET "actorId" = ${other.actor.userId} WHERE id = ${f.draftId}`).rejects.toBeDefined()
    expect((await getPurchaseAuthoring(f.actor, { id: f.draftId })).status).toBe("ACTIVE")
  })
  it("rolls back number, order and receipt when the final authoring audit fails", async () => {
    const f = await fixture(), c = await prepare(f), before = await getPurchaseAuthoring(f.actor, { id: f.draftId })
    const trigger = `ux_authoring_${randomUUID().replaceAll("-", "")}`
    await observer.$executeRawUnsafe(`CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."organizationId" = '${f.actor.orgId}' AND NEW.action = 'PO_AUTHORING_CREATED' THEN RAISE EXCEPTION 'Synthetic authoring audit failure'; END IF; RETURN NEW; END $$`)
    await observer.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`)
    try {
      await expect(createPurchaseOrderFromAuthoring(f.actor, c)).rejects.toBeDefined()
      expect(await effects(f)).toEqual({ orders: 0, events: 0, sequence: null, stock: 0, outbox: 0 })
      expect(await getPurchaseAuthoring(f.actor, { id: f.draftId })).toEqual(before)
    } finally {
      await observer.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON audit_logs`)
      await observer.$executeRawUnsafe(`DROP FUNCTION "${trigger}"()`)
    }
    expect((await createPurchaseOrderFromAuthoring(f.actor, c)).receipt?.orderNumber).toBe("PO-000001")
  })
})
