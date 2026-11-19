import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, recordBusinessEventInTx, markBusinessEventAppliedInTx } from "@/services/events/business-event.service"
import { createPurchaseOrderInTx } from "./purchase-order.service"
import { normalizePurchaseAuthoring, purchaseAuthoringCommand, purchaseAuthoringContent, purchaseAuthoringList, purchaseAuthoringLookup, purchaseAuthoringReceipt, savePurchaseAuthoringInput, type PurchaseAuthoringView, type PurchaseAuthoringReceipt } from "./purchase-order-authoring-contracts"

export type PurchaseAuthoringActor = { orgId: string; userId: string; permissions: readonly string[]; sessionId: string; sessionToken: string }
type Tx = Prisma.TransactionClient
type Row = { id: string; organizationId: string; actorId: string; title: string; status: PurchaseAuthoringView["status"]; revision: number; content: unknown;
  lastSaveHash: string; commandHash: string | null; preparedAt: Date | null; resultOrderId: string | null; createdAt: Date; updatedAt: Date }
export const purchaseAuthoringWritesEnabled = () => process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED === "true"
const eventKey = (id: string) => `purchase-order-create:${id}`
const scope = (ctx: PurchaseAuthoringActor) => Prisma.sql`"organizationId" = ${ctx.orgId} AND "actorId" = ${ctx.userId}`

async function moduleAccess(tx: Tx, ctx: PurchaseAuthoringActor, intent: "read" | "write") {
  const access = await evaluateModuleAccessInTx(tx, { organizationId: ctx.orgId, userId: ctx.userId, moduleSlug: "purchasing", surfaceType: "action",
    surface: "purchase-order-authoring", accessIntent: intent, mode: "enforce" })
  if (!access.allowed) throw new ForbiddenError()
}

async function transaction<T>(ctx: PurchaseAuthoringActor, run: (tx: Tx) => Promise<T>) {
  if (!ctx.orgId || !ctx.userId || !ctx.sessionId || !ctx.sessionToken || !hasRbacPermission(ctx.permissions, "purchases.orders.create")) throw new ForbiddenError()
  return db.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL statement_timeout = '3000ms'`
    // Same first lock as organization policy/member changes. Also serializes
    // create/status/discard: status cannot report absence ahead of an in-flight commit.
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${ctx.orgId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${ctx.userId} AND "organizationId" = ${ctx.orgId} FOR SHARE`
    await tx.$queryRaw`SELECT r.id FROM roles r JOIN "_UserRoles" m ON m."A" = r.id WHERE m."B" = ${ctx.userId} AND r."organizationId" = ${ctx.orgId} ORDER BY r.id FOR SHARE OF r, m`
    const actor = await tx.user.findFirst({ where: { id: ctx.userId, organizationId: ctx.orgId, organization: { isActive: true, deletedAt: null } },
      select: { isActive: true, isVerified: true, emailVerified: true, isLocked: true, lockedUntil: true, roles: { where: { organizationId: ctx.orgId }, select: { permissions: true } } } })
    if (!actor || !isUsableAccount(actor, new Date()) || !hasRbacPermission(expandPermissions(actor.roles.flatMap(r => r.permissions)), "purchases.orders.create")) throw new ForbiddenError()
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${ctx.sessionId} AND "userId" = ${ctx.userId} FOR SHARE`
    if (!await tx.session.findFirst({ where: { id: ctx.sessionId, token: ctx.sessionToken, userId: ctx.userId, expiresAt: { gt: new Date() } }, select: { id: true } })) throw new ForbiddenError()
    await moduleAccess(tx, ctx, "read")
    return run(tx)
  }, { isolationLevel: "ReadCommitted", timeout: 15000, maxWait: 1000 })
}

async function writeAllowed(tx: Tx, ctx: PurchaseAuthoringActor) {
  if (!purchaseAuthoringWritesEnabled()) throw new BusinessRuleError("Purchase authoring is unavailable.")
  await moduleAccess(tx, ctx, "write")
}

async function rowById(tx: Tx, ctx: PurchaseAuthoringActor, id: string, optional = false) {
  const rows = await tx.$queryRaw<Row[]>(Prisma.sql`SELECT * FROM purchase_order_authoring_drafts WHERE ${scope(ctx)} AND id = ${id} FOR UPDATE`)
  if (!rows[0] && !optional) throw new NotFoundError()
  return rows[0]
}

function canonical(row: Row) {
  return normalizePurchaseAuthoring(purchaseAuthoringContent.parse(row.content), row.organizationId, row.actorId)
}
function commandHash(row: Row) { return hashBusinessPayload({ version: 1, draftId: row.id, order: canonical(row) }) }
function view(row: Row, receipt: PurchaseAuthoringReceipt | null = null): PurchaseAuthoringView {
  return { id: row.id, revision: row.revision, title: row.title, status: row.status, content: purchaseAuthoringContent.parse(row.content),
    savedAt: row.updatedAt.toISOString(), preparedAt: row.preparedAt?.toISOString() ?? null, receipt }
}
async function audit(tx: Tx, ctx: PurchaseAuthoringActor, row: Row, action: string) {
  await tx.auditLog.create({ data: { id: `po_authoring_${row.id}_${row.revision}`, organizationId: ctx.orgId, userId: ctx.userId,
    entityType: "PurchaseOrderAuthoringDraft", entityId: row.id, action, changes: { revision: row.revision, status: row.status, resultOrderId: row.resultOrderId } } })
}

// Receipt evidence is checked on every lookup/replay. No source revalidation or
// new-work gate precedes replay; those would turn a completed request into a failure.
async function receiptInTx(tx: Tx, ctx: PurchaseAuthoringActor, row: Row): Promise<PurchaseAuthoringReceipt | null> {
  const event = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId: ctx.orgId, eventSource: "INTERNAL", idempotencyKey: eventKey(row.id) } } })
  if (!event) {
    if (row.status === "CREATED" || row.resultOrderId) throw new ConflictError("Creation evidence is unavailable.")
    return null
  }
  const payload = event.payload as Record<string, unknown> | null
  if (row.status !== "CREATED" || !row.commandHash || row.commandHash !== commandHash(row) || event.eventType !== "purchase_order.authoring_created" || event.status !== "APPLIED" || event.schemaVersion !== 1 || event.sourceType !== null || event.sourceId !== row.resultOrderId || event.actorId !== ctx.userId || payload?.entityType !== "PurchaseOrder" || payload.draftId !== row.id || payload.commandHash !== row.commandHash) throw new IdempotencyConflictError()
  const parsed = purchaseAuthoringReceipt.safeParse(payload.result)
  if (event.payloadHash !== hashBusinessPayload(event.payload) || !parsed.success || parsed.data.requestReference !== row.id || parsed.data.orderId !== row.resultOrderId || parsed.data.createdAt !== event.occurredAt.toISOString()) throw new ConflictError("Creation evidence is unavailable.")
  const order = await tx.purchaseOrder.findFirst({ where: { id: parsed.data.orderId, organizationId: ctx.orgId, createdById: ctx.userId }, select: { orderNumber: true } })
  if (!order || order.orderNumber !== parsed.data.orderNumber) throw new ConflictError("Creation evidence is unavailable.")
  return parsed.data
}

export async function savePurchaseAuthoring(ctx: PurchaseAuthoringActor, input: unknown) {
  const command = savePurchaseAuthoringInput.parse(input), saveHash = hashBusinessPayload(command)
  return transaction(ctx, async tx => {
    const existing = await rowById(tx, ctx, command.id, true)
    if (existing?.lastSaveHash === saveHash) return view(existing, await receiptInTx(tx, ctx, existing))
    if (existing && (existing.revision !== command.expectedRevision || existing.status !== "ACTIVE")) throw new ConflictError("Reload the saved work before changing it.")
    if (!existing && command.expectedRevision !== 0) throw new NotFoundError()
    await writeAllowed(tx, ctx)
    // IDs are opaque UUIDs, but uniqueness is still enforced by the database;
    // a collision with another actor never changes or returns their record.
    const rows = existing
      ? await tx.$queryRaw<Row[]>(Prisma.sql`UPDATE purchase_order_authoring_drafts SET title = ${command.title}, content = ${JSON.stringify(command.content)}::jsonb, "lastSaveHash" = ${saveHash}, revision = revision + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE ${scope(ctx)} AND id = ${command.id} AND revision = ${command.expectedRevision} AND status = 'ACTIVE' RETURNING *`)
      : await tx.$queryRaw<Row[]>(Prisma.sql`INSERT INTO purchase_order_authoring_drafts (id, "organizationId", "actorId", title, content, "lastSaveHash", "updatedAt") VALUES (${command.id}, ${ctx.orgId}, ${ctx.userId}, ${command.title}, ${JSON.stringify(command.content)}::jsonb, ${saveHash}, CURRENT_TIMESTAMP) RETURNING *`)
    if (!rows[0]) throw new ConflictError("Reload the saved work.")
    await audit(tx, ctx, rows[0], "PO_AUTHORING_SAVED")
    return view(rows[0])
  })
}

export async function getPurchaseAuthoring(ctx: PurchaseAuthoringActor, input: unknown) {
  const command = purchaseAuthoringLookup.parse(input)
  return transaction(ctx, async tx => { const row = (await rowById(tx, ctx, command.id))!; return view(row, await receiptInTx(tx, ctx, row)) })
}

export async function listPurchaseAuthoring(ctx: PurchaseAuthoringActor, input: unknown) {
  const query = purchaseAuthoringList.parse(input)
  return transaction(ctx, async tx => {
    if (query.beforeId && !await rowById(tx, ctx, query.beforeId, true)) throw new ConflictError("Reload the saved work list.")
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`SELECT * FROM purchase_order_authoring_drafts WHERE ${scope(ctx)} AND status <> 'DISCARDED'
      ${query.beforeId ? Prisma.sql`AND ("createdAt", id) < (SELECT "createdAt", id FROM purchase_order_authoring_drafts WHERE ${scope(ctx)} AND id = ${query.beforeId})` : Prisma.empty}
      ORDER BY "createdAt" DESC, id DESC LIMIT 26`)
    // Full receipts are fetched on resume/status; listing does not imply creation verification.
    return { entries: rows.slice(0, 25).map(row => ({ id: row.id, revision: row.revision, title: row.title, status: row.status, savedAt: row.updatedAt.toISOString() })),
      nextCursor: rows.length > 25 ? rows[24]!.id : null, writesEnabled: purchaseAuthoringWritesEnabled() }
  })
}

export async function preparePurchaseAuthoring(ctx: PurchaseAuthoringActor, input: unknown) {
  const command = purchaseAuthoringCommand.parse(input)
  return transaction(ctx, async tx => {
    const row = (await rowById(tx, ctx, command.id))!
    const receipt = await receiptInTx(tx, ctx, row)
    if (receipt) return view(row, receipt)
    const hash = commandHash(row)
    if (row.status === "PREPARED" && row.revision === command.expectedRevision + 1 && row.commandHash === hash) return view(row)
    if (row.status !== "ACTIVE" || row.revision !== command.expectedRevision) throw new ConflictError("Reload the saved work.")
    await writeAllowed(tx, ctx)
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`UPDATE purchase_order_authoring_drafts SET status = 'PREPARED', "commandHash" = ${hash}, "preparedAt" = CURRENT_TIMESTAMP, revision = revision + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE ${scope(ctx)} AND id = ${row.id} AND revision = ${row.revision} AND status = 'ACTIVE' RETURNING *`)
    if (!rows[0]) throw new ConflictError("Reload the saved work.")
    await audit(tx, ctx, rows[0], "PO_AUTHORING_PREPARED")
    return view(rows[0])
  })
}

export async function createPurchaseOrderFromAuthoring(ctx: PurchaseAuthoringActor, input: unknown) {
  const command = purchaseAuthoringCommand.parse(input)
  return transaction(ctx, async tx => {
    const row = (await rowById(tx, ctx, command.id))!
    const receipt = await receiptInTx(tx, ctx, row)
    if (receipt) return view(row, receipt)
    if (row.status !== "PREPARED" || row.revision !== command.expectedRevision) throw new ConflictError("Reload the saved work.")
    if (row.commandHash !== commandHash(row)) throw new IdempotencyConflictError()
    await writeAllowed(tx, ctx)
    const order = await createPurchaseOrderInTx(tx, canonical(row))
    const recordedAt = new Date(), result = purchaseAuthoringReceipt.parse({ requestReference: row.id, orderId: order.id, orderNumber: order.orderNumber, createdAt: recordedAt.toISOString() })
    const event = await recordBusinessEventInTx(tx, { organizationId: ctx.orgId, eventType: "purchase_order.authoring_created", eventSource: "INTERNAL", schemaVersion: 1,
      idempotencyKey: eventKey(row.id), sourceId: order.id, actorId: ctx.userId, occurredAt: recordedAt,
      payload: { entityType: "PurchaseOrder", draftId: row.id, commandHash: row.commandHash, result }, outboxMessages: [] })
    await markBusinessEventAppliedInTx(tx, ctx.orgId, event.event.id)
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`UPDATE purchase_order_authoring_drafts SET status = 'CREATED', "resultOrderId" = ${order.id}, revision = revision + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE ${scope(ctx)} AND id = ${row.id} AND revision = ${row.revision} AND status = 'PREPARED' RETURNING *`)
    if (!rows[0]) throw new ConflictError("Reload the saved work.")
    await audit(tx, ctx, rows[0], "PO_AUTHORING_CREATED")
    return view(rows[0], result)
  })
}

export async function discardPurchaseAuthoring(ctx: PurchaseAuthoringActor, input: unknown) {
  const command = purchaseAuthoringCommand.parse(input)
  return transaction(ctx, async tx => {
    const row = (await rowById(tx, ctx, command.id))!
    const receipt = await receiptInTx(tx, ctx, row)
    if (receipt) return view(row, receipt)
    if (row.status === "DISCARDED") return view(row)
    if (row.revision !== command.expectedRevision || !["ACTIVE", "PREPARED"].includes(row.status)) throw new ConflictError("Reload the saved work.")
    await writeAllowed(tx, ctx)
    // Retain the request tombstone. An older in-flight create will see DISCARDED;
    // a previously committed create was resolved above and cannot be discarded.
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`UPDATE purchase_order_authoring_drafts SET status = 'DISCARDED', revision = revision + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE ${scope(ctx)} AND id = ${row.id} AND revision = ${row.revision} RETURNING *`)
    if (!rows[0]) throw new ConflictError("Reload the saved work.")
    await audit(tx, ctx, rows[0], "PO_AUTHORING_DISCARDED")
    return view(rows[0])
  })
}
