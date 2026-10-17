jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn() }))
jest.mock("../purchase-order.service", () => ({ createPurchaseOrderInTx: jest.fn() }))
jest.mock("@/services/events/business-event.service", () => ({ ...jest.requireActual("@/services/events/business-event.service"), recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn() }))
import { db } from "@/prisma/db"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { hashBusinessPayload, recordBusinessEventInTx, markBusinessEventAppliedInTx } from "@/services/events/business-event.service"
import { createPurchaseOrderInTx } from "../purchase-order.service"
import { savePurchaseAuthoring, preparePurchaseAuthoring, getPurchaseAuthoring, listPurchaseAuthoring, discardPurchaseAuthoring, createPurchaseOrderFromAuthoring } from "../purchase-order-authoring.service"
import { emptyPurchaseAuthoring, normalizePurchaseAuthoring, savePurchaseAuthoringInput } from "../purchase-order-authoring-contracts"

const id = "550e8400-e29b-41d4-a716-446655440000", now = new Date("2026-10-04T12:00:00.000Z")
const actor = { orgId: "org", userId: "buyer", permissions: ["purchases.orders.create"], sessionId: "session", sessionToken: "test-session" }
const content = () => ({ ...emptyPurchaseAuthoring(), supplierId: "supplier", locationId: "location", date: "2026-10-04", expectedDeliveryDate: "2026-10-05",
  orderLines: [{ itemId: "item", quantity: "2.5", unitPrice: "10.00", taxRate: "5", discount: "0", notes: "" }] })
const initialRow = () => ({ id, organizationId: "org", actorId: "buyer", title: "Weekly restock", status: "ACTIVE", revision: 1, content: content(), lastSaveHash: "prior-save", commandHash: null as string | null, preparedAt: null as Date | null, resultOrderId: null as string | null, createdAt: now, updatedAt: now })
let row: ReturnType<typeof initialRow> | null, storedEvent: Record<string, unknown> | null
let tx: { $queryRaw: jest.Mock; $executeRaw: jest.Mock; user: { findFirst: jest.Mock }; session: { findFirst: jest.Mock }; businessEvent: { findUnique: jest.Mock }; purchaseOrder: { findFirst: jest.Mock }; auditLog: { create: jest.Mock } }
const calls: Array<{ sql: string; values: unknown[] }> = []
const hashRow = () => hashBusinessPayload({ version: 1, draftId: id, order: normalizePurchaseAuthoring(row!.content, "org", "buyer") })
function prepared() { row!.status = "PREPARED"; row!.revision = 2; row!.commandHash = hashRow(); row!.preparedAt = now }
function committed() {
  prepared(); row!.status = "CREATED"; row!.revision = 3; row!.resultOrderId = "po"
  const result = { requestReference: id, orderId: "po", orderNumber: "PO-001", createdAt: now.toISOString() }
  const payload = { entityType: "PurchaseOrder", draftId: id, commandHash: row!.commandHash, result }
  storedEvent = { eventType: "purchase_order.authoring_created", status: "APPLIED", schemaVersion: 1, sourceType: null, sourceId: "po", actorId: "buyer", payload, payloadHash: hashBusinessPayload(payload), occurredAt: now }
  return result
}
beforeEach(() => {
  jest.clearAllMocks(); calls.length = 0; row = initialRow(); storedEvent = null
  process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED = "true"
  tx = { $executeRaw: jest.fn(), $queryRaw: jest.fn(async (query: { sql?: string; values?: unknown[] } | TemplateStringsArray, ...values: unknown[]) => {
    const sql = "sql" in query ? query.sql! : (query as TemplateStringsArray).join("?"), params = "values" in query && Array.isArray(query.values) ? query.values : values
    calls.push({ sql, values: params })
    if (!sql.includes("purchase_order_authoring_drafts")) return []
    if (sql.startsWith("SELECT")) return row && params.includes(row.organizationId) && params.includes(row.actorId) ? [{ ...row }] : []
    if (sql.startsWith("INSERT")) { row = { ...initialRow(), title: params[3] as string, content: JSON.parse(params[4] as string), lastSaveHash: params[5] as string }; return [{ ...row }] }
    if (sql.includes("SET title")) { row = { ...row!, title: params[0] as string, content: JSON.parse(params[1] as string), lastSaveHash: params[2] as string, revision: row!.revision + 1 }; return [{ ...row }] }
    if (sql.includes("status = 'PREPARED',")) { row = { ...row!, status: "PREPARED", commandHash: params[0] as string, preparedAt: now, revision: row!.revision + 1 }; return [{ ...row }] }
    if (sql.includes("status = 'CREATED',")) { row = { ...row!, status: "CREATED", resultOrderId: params[0] as string, revision: row!.revision + 1 }; return [{ ...row }] }
    if (sql.includes("status = 'DISCARDED',")) { row = { ...row!, status: "DISCARDED", revision: row!.revision + 1 }; return [{ ...row }] }
    throw new Error("Unmodeled SQL in test")
  }), user: { findFirst: jest.fn().mockResolvedValue({ isActive: true, isVerified: true, emailVerified: false, isLocked: false, lockedUntil: null, roles: [{ permissions: actor.permissions }] }) },
    session: { findFirst: jest.fn().mockResolvedValue({ id: "session" }) }, businessEvent: { findUnique: jest.fn(async () => storedEvent) },
    purchaseOrder: { findFirst: jest.fn().mockResolvedValue({ orderNumber: "PO-001" }) }, auditLog: { create: jest.fn() } }
  ;(db.$transaction as jest.Mock).mockImplementation(async run => run(tx))
  ;(evaluateModuleAccessInTx as jest.Mock).mockResolvedValue({ allowed: true })
  ;(createPurchaseOrderInTx as jest.Mock).mockResolvedValue({ id: "po", orderNumber: "PO-001" })
  ;(recordBusinessEventInTx as jest.Mock).mockImplementation(async (_tx, input) => { storedEvent = { ...input, sourceType: null, payloadHash: hashBusinessPayload(input.payload), status: "APPLIED" }; return { event: { id: "event" }, created: true } })
})
afterEach(() => { delete process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED })

it("saves incomplete text without creating a business PO or number", async () => {
  row = null
  const incomplete = { ...emptyPurchaseAuthoring(), shippingCost: "12." }
  const result = await savePurchaseAuthoring(actor, { id, expectedRevision: 0, title: "", content: incomplete })
  expect(result.content).toEqual(incomplete); expect(result.status).toBe("ACTIVE")
  expect(createPurchaseOrderInTx).not.toHaveBeenCalled(); expect(recordBusinessEventInTx).not.toHaveBeenCalled()
})
it("recovers a lost save response using the same input", async () => {
  const input = { id, expectedRevision: 1, title: "Restock", content: content() }
  const first = await savePurchaseAuthoring(actor, input), second = await savePurchaseAuthoring(actor, input)
  expect(second).toEqual(first); expect(tx.auditLog.create).toHaveBeenCalledTimes(1)
})
it("rejects a second tab's changed content at the old revision", async () => {
  await savePurchaseAuthoring(actor, { id, expectedRevision: 1, title: "First", content: content() })
  await expect(savePurchaseAuthoring(actor, { id, expectedRevision: 1, title: "Second", content: content() })).rejects.toMatchObject({ code: "CONFLICT" })
  expect(row!.title).toBe("First")
})
it("prepares a durable fixed command and replays a lost prepare response", async () => {
  const first = await preparePurchaseAuthoring(actor, { id, expectedRevision: 1 })
  expect(first).toMatchObject({ status: "PREPARED", revision: 2, receipt: null })
  expect(await preparePurchaseAuthoring(actor, { id, expectedRevision: 1 })).toEqual(first)
  expect(createPurchaseOrderInTx).not.toHaveBeenCalled(); expect(tx.auditLog.create).toHaveBeenCalledTimes(1)
})
it("freezes prepared content even when the caller has the current revision", async () => {
  prepared()
  await expect(savePurchaseAuthoring(actor, { id, expectedRevision: 2, title: "Changed", content: content() })).rejects.toMatchObject({ code: "CONFLICT" })
})
it("creates PO, receipt and authoring result in the same transaction with no outbox messages", async () => {
  prepared()
  const result = await createPurchaseOrderFromAuthoring(actor, { id, expectedRevision: 2 })
  expect(result).toMatchObject({ status: "CREATED", revision: 3, receipt: { orderId: "po", requestReference: id } })
  expect(createPurchaseOrderInTx).toHaveBeenCalledWith(tx, expect.objectContaining({ organizationId: "org", createdById: "buyer" }))
  expect(recordBusinessEventInTx).toHaveBeenCalledWith(tx, expect.objectContaining({ idempotencyKey: `purchase-order-create:${id}`, outboxMessages: [] }))
  expect(markBusinessEventAppliedInTx).toHaveBeenCalledWith(tx, "org", "event")
})
it("recovers after tab closure without a client payload or new key", async () => {
  prepared(); const first = await createPurchaseOrderFromAuthoring(actor, { id, expectedRevision: 2 })
  const second = await getPurchaseAuthoring(actor, { id })
  expect(second.receipt).toEqual(first.receipt)
  expect((await createPurchaseOrderFromAuthoring(actor, { id, expectedRevision: 2 })).receipt).toEqual(first.receipt)
  expect(createPurchaseOrderInTx).toHaveBeenCalledTimes(1)
})
it("replays a verified creation when writes are subsequently disabled", async () => {
  const receipt = committed(); delete process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED
  ;(evaluateModuleAccessInTx as jest.Mock).mockImplementation(async (_tx, request) => ({ allowed: request.accessIntent === "read" }))
  expect((await createPurchaseOrderFromAuthoring(actor, { id, expectedRevision: 2 })).receipt).toEqual(receipt)
  expect(createPurchaseOrderInTx).not.toHaveBeenCalled()
})
it("rejects content tampering against the prepared hash before source creation", async () => {
  prepared(); row!.content.notes = "changed"
  await expect(createPurchaseOrderFromAuthoring(actor, { id, expectedRevision: 2 })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  expect(createPurchaseOrderInTx).not.toHaveBeenCalled()
})
it.each(["actor", "tenant"])("hides saved work from another %s", async kind => {
  const other = kind === "actor" ? { ...actor, userId: "someone" } : { ...actor, orgId: "elsewhere" }
  await expect(getPurchaseAuthoring(other, { id })).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(tx.businessEvent.findUnique).not.toHaveBeenCalled()
})
it.each(["stored permission", "session", "account", "module", "context permission"])("rechecks %s before returning even a completed receipt", async kind => {
  committed()
  if (kind === "stored permission") tx.user.findFirst.mockResolvedValue({ isActive: true, isVerified: true, isLocked: false, roles: [{ permissions: [] }] })
  if (kind === "session") tx.session.findFirst.mockResolvedValue(null)
  if (kind === "account") tx.user.findFirst.mockResolvedValue(null)
  if (kind === "module") (evaluateModuleAccessInTx as jest.Mock).mockResolvedValue({ allowed: false })
  await expect(getPurchaseAuthoring(kind === "context permission" ? { ...actor, permissions: [] } : actor, { id })).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.businessEvent.findUnique).not.toHaveBeenCalled()
})
it.each(["actorId", "sourceId", "status", "payloadHash"])("refuses mismatched receipt %s", async field => {
  committed(); storedEvent![field] = "different"
  await expect(getPurchaseAuthoring(actor, { id })).rejects.toThrow()
  expect(createPurchaseOrderInTx).not.toHaveBeenCalled()
})
it("does not infer absence from a missing receipt for a created row", async () => {
  committed(); storedEvent = null
  await expect(createPurchaseOrderFromAuthoring(actor, { id, expectedRevision: 2 })).rejects.toMatchObject({ code: "CONFLICT" })
  expect(createPurchaseOrderInTx).not.toHaveBeenCalled()
})
it("refuses to discard a committed order and returns its receipt", async () => {
  const receipt = committed()
  expect((await discardPurchaseAuthoring(actor, { id, expectedRevision: 2 })).receipt).toEqual(receipt)
  expect(row!.status).toBe("CREATED"); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it("resolves prepared absence before discard and rejects an older create", async () => {
  prepared(); expect((await discardPurchaseAuthoring(actor, { id, expectedRevision: 2 })).status).toBe("DISCARDED")
  await expect(createPurchaseOrderFromAuthoring(actor, { id, expectedRevision: 2 })).rejects.toMatchObject({ code: "CONFLICT" })
  expect(createPurchaseOrderInTx).not.toHaveBeenCalled()
})
it("does not write a receipt after current source validation fails", async () => {
  prepared(); (createPurchaseOrderInTx as jest.Mock).mockRejectedValueOnce(new Error("Reference unavailable"))
  await expect(createPurchaseOrderFromAuthoring(actor, { id, expectedRevision: 2 })).rejects.toThrow()
  expect(recordBusinessEventInTx).not.toHaveBeenCalled(); expect(row!.status).toBe("PREPARED")
})
it("defaults writes off while retaining scoped status reads", async () => {
  delete process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED
  await expect(savePurchaseAuthoring(actor, { id, expectedRevision: 1, title: "New", content: content() })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect((await getPurchaseAuthoring(actor, { id })).status).toBe("ACTIVE")
})
it("bounds the saved-work list and resolves cursor tuples in the database with actor scope", async () => {
  const result = await listPurchaseAuthoring(actor, { beforeId: id })
  expect(result.entries[0]).not.toHaveProperty("content"); expect(result.entries[0]).not.toHaveProperty("commandHash")
  const page = calls.find(call => call.sql.includes("LIMIT 26"))!
  expect(page.sql).toContain('(SELECT "createdAt", id'); expect(page.values.filter(value => value === "buyer")).toHaveLength(2)
})
it.each([{ actorId: "someone" }, { organizationId: "elsewhere" }, { resultOrderId: "po" }, { commandHash: "supplied" }])("rejects caller-owned authority/result fields %o", extra => {
  expect(() => savePurchaseAuthoringInput.parse({ id, expectedRevision: 0, title: "", content: content(), ...extra })).toThrow()
})
it.each(["", "1e3", "Infinity", "-1", "0", "1.0001"])("does not manufacture a valid quantity from %s", quantity => {
  const value = content(); value.orderLines[0].quantity = quantity
  expect(() => normalizePurchaseAuthoring(value, "org", "buyer")).toThrow()
})
it("rejects duplicate items and impossible or reversed dates before preparation", () => {
  const value = content(); value.orderLines.push(value.orderLines[0])
  expect(() => normalizePurchaseAuthoring(value, "org", "buyer")).toThrow()
  expect(() => normalizePurchaseAuthoring({ ...content(), date: "2026-02-30" }, "org", "buyer")).toThrow()
  expect(() => normalizePurchaseAuthoring({ ...content(), expectedDeliveryDate: "2026-10-03" }, "org", "buyer")).toThrow()
})
