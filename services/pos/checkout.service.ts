import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { assertPOSCartWriteAccessInTx } from "./cart-write-access"
import { checkoutCartCommandSchema, checkoutWorkspaceSchema, commitSaleSchema } from "./pos.schemas"
import { assertCheckoutLeaseInTx, assertNoQueuedCheckoutInTx, CHECKOUT_LEASE_MS, checkoutScope, retainedCheckoutRequest } from "./checkout-state"
import { getOrCreateDraftCart, lineMath, recalculateCartTotals, readPOSSaleCommitStatusInTx } from "./pos.service"
import { posCartRevision } from "./cart-revision"

type Input = Record<string, unknown> & { organizationId: string; userId: string }

/** Upgrade a retained v1 browser attempt without changing its request or replay identity. */
export async function retainLegacyPOSCheckout(rawInput: Input) {
  const request = commitSaleSchema.parse(rawInput)
  return transaction(async tx => {
    const cart = await tx.salesOrder.findFirst({ where: {
      id: request.salesOrderId, organizationId: rawInput.organizationId, createdById: rawInput.userId,
      sessionId: request.sessionId, locationId: request.locationId, terminalId: request.terminalId, channel: "POS",
      session: { organizationId: rawInput.organizationId, userId: rawInput.userId, locationId: request.locationId, terminalId: request.terminalId },
    }, select: { id: true } })
    if (!cart) throw new NotFoundError("POS_CHECKOUT_CART_UNAVAILABLE")
    const scope = checkoutScope({ ...rawInput, sessionId: request.sessionId })
    const workspace = await tx.pOSCheckoutWorkspace.upsert({ where: { sessionId: request.sessionId }, create: scope, update: {} })
    if (workspace.organizationId !== rawInput.organizationId || workspace.actorId !== rawInput.userId) throw new ConflictError("POS_CHECKOUT_CART_UNAVAILABLE")
    const retained = retainedCheckoutRequest(workspace.pendingRequest)
    if (retained && JSON.stringify(retained) !== JSON.stringify(request)) throw new ConflictError("POS_CHECKOUT_RECOVERY_REQUIRED")
    if (!retained) await tx.pOSCheckoutWorkspace.update({ where: { sessionId: request.sessionId }, data: { pendingRequest: request as Prisma.InputJsonValue } })
  })
}

async function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, isolationLevel: Prisma.TransactionIsolationLevel = Prisma.TransactionIsolationLevel.Serializable, startupRetry = false) {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(fn, { isolationLevel }) }
    catch (error) {
      if ((error as { code?: string }).code !== "P2034" || attempt >= (startupRetry ? 5 : 2)) throw error
      // Cold tills can contend on serializable predicates. Retry the whole
      // rolled-back acquisition with bounded jitter; never retry domain denials.
      if (startupRetry) await new Promise(resolve => setTimeout(resolve, Math.floor((0.5 + Math.random() * 0.5) * Math.min(800, 50 * 2 ** attempt))))
    }
  }
}

async function requireSession(tx: Prisma.TransactionClient, input: Input) {
  const parsed = checkoutWorkspaceSchema.parse(input)
  const session = await tx.pOSSession.findFirst({ where: {
    id: parsed.sessionId, organizationId: input.organizationId, userId: input.userId,
    locationId: parsed.locationId, terminalId: parsed.terminalId, status: "ACTIVE",
    terminal: { is: { currentSessionId: parsed.sessionId, isActive: true } },
  } })
  if (!session) throw new ConflictError("POS_CHECKOUT_SHIFT_UNAVAILABLE")
  return parsed
}

/** Renew only an existing, unexpired owner. Recovery and takeover require acquisition. */
export async function renewPOSCheckout(rawInput: Input) {
  const input = checkoutWorkspaceSchema.parse(rawInput)
  return transaction(async tx => {
    // Lock the authority rows until the compare-and-set commits. Closure/terminal
    // reassignment cannot cross this check. READ COMMITTED avoids broad SSI
    // predicate conflicts between unrelated tills on small workspace tables.
    const active = await tx.$queryRaw<{ id: string }[]>`
      SELECT s.id FROM pos_sessions s JOIN pos_terminals t ON t.id = s."terminalId"
      WHERE s.id = ${input.sessionId} AND s."organizationId" = ${rawInput.organizationId}
        AND s."userId" = ${rawInput.userId} AND s."locationId" = ${input.locationId}
        AND s."terminalId" = ${input.terminalId} AND s.status = 'ACTIVE'
        AND t."currentSessionId" = s.id AND t."isActive" = true
      FOR SHARE OF s, t`
    if (active.length !== 1) throw new ConflictError("POS_CHECKOUT_SHIFT_UNAVAILABLE")
    const renewed = await tx.pOSCheckoutWorkspace.updateMany({ where: {
      ...checkoutScope({ ...rawInput, sessionId: input.sessionId }),
      leaseId: input.checkoutLeaseId, leaseExpiresAt: { gt: new Date() },
    }, data: { leaseExpiresAt: new Date(Date.now() + CHECKOUT_LEASE_MS) } })
    if (renewed.count !== 1) throw new ConflictError("POS_CHECKOUT_OWNERSHIP_REQUIRED")
  }, Prisma.TransactionIsolationLevel.ReadCommitted)
}

/** Startup/reconnect reconciliation keeps unknown requests intact. Result lookup itself is read-only. */
export async function acquirePOSCheckout(rawInput: Input) {
  const input = checkoutWorkspaceSchema.parse(rawInput)
  const scope = { ...rawInput, sessionId: input.sessionId }
  return transaction(async tx => {
    await requireSession(tx, rawInput)
    await tx.pOSCheckoutWorkspace.upsert({ where: { sessionId: input.sessionId },
      create: checkoutScope(scope), update: {},
    })
    const claimed = await tx.pOSCheckoutWorkspace.updateMany({ where: {
      ...checkoutScope(scope), OR: [{ leaseId: input.checkoutLeaseId }, { leaseExpiresAt: null }, { leaseExpiresAt: { lte: new Date() } }],
    }, data: { leaseId: input.checkoutLeaseId, leaseExpiresAt: new Date(Date.now() + CHECKOUT_LEASE_MS) } })
    if (claimed.count !== 1) throw new ConflictError("POS_CHECKOUT_OWNED_ELSEWHERE")

    let settled = false
    const recoveredSales: { salesOrderId: string; orderNumber: string; total: number }[] = []
    const current = await tx.pOSCheckoutWorkspace.findFirstOrThrow({ where: checkoutScope(scope) })
    const historyPage = await tx.pOSCheckoutWorkspace.findMany({ where: {
      organizationId: rawInput.organizationId, actorId: rawInput.userId,
      sessionId: { not: input.sessionId, ...(input.recoveryAfter ? { gt: input.recoveryAfter } : {}) },
      session: { status: "CLOSED" },
      pendingRequest: { not: Prisma.DbNull },
    }, orderBy: { sessionId: "asc" }, take: 21 })
    const recoveryAfter = historyPage.length > 20 ? historyPage[19].sessionId : null
    // Reconcile the current checkout on every pass; rotate through history by key,
    // never delete unknown intent or let an unresolved first page starve later work.
    const workspaces = [...(current.pendingRequest ? [current] : []), ...historyPage.slice(0, 20)]
    for (const workspace of workspaces) {
      const request = retainedCheckoutRequest(workspace.pendingRequest)
      if (!request) continue
      let status = await readPOSSaleCommitStatusInTx(tx, { ...request, organizationId: rawInput.organizationId, userId: rawInput.userId })
      if (["NOT_FOUND", "CART_CHANGED", "CART_REVIEW_REQUIRED"].includes(status.kind) && workspace.sessionId !== input.sessionId) {
        // Compatibility for drafts left behind by shifts closed before lifecycle states existed.
        // Closing fences late submissions; queued financial work must still retain its replay path.
        try {
          await assertNoQueuedCheckoutInTx(tx, { ...rawInput, sessionId: workspace.sessionId })
          const claimed = await tx.pOSCommitResult.count({ where: { organizationId: rawInput.organizationId, salesOrderId: request.salesOrderId } })
          if (!claimed) {
            const retired = await tx.salesOrder.updateMany({ where: {
              id: request.salesOrderId, organizationId: rawInput.organizationId, createdById: rawInput.userId,
              locationId: request.locationId, terminalId: request.terminalId, sessionId: workspace.sessionId,
              channel: "POS", status: "DRAFT", posCartState: "ACTIVE", deletedAt: null,
              session: { status: "CLOSED", endTime: { not: null } },
            }, data: { posCartState: "RETIRED", version: { increment: 1 } } })
            if (retired.count) await tx.auditLog.create({ data: { organizationId: rawInput.organizationId, userId: rawInput.userId,
              entityType: "SalesOrder", entityId: request.salesOrderId, action: "POS_CLOSED_SHIFT_DRAFT_RETIRED", changes: { contentsPreserved: true, sessionId: workspace.sessionId } } })
            status = await readPOSSaleCommitStatusInTx(tx, { ...request, organizationId: rawInput.organizationId, userId: rawInput.userId })
          }
        } catch (error) {
          if (!(error instanceof ConflictError) || error.message !== "POS_CHECKOUT_OFFLINE_PENDING") throw error
        }
      }
      if (status.kind !== "RECORDED" && status.kind !== "NOT_COMMITTED") continue
      if (status.kind === "RECORDED") recoveredSales.push({ salesOrderId: status.saleId, orderNumber: status.orderNumber, total: status.total })
      await tx.pOSCheckoutWorkspace.update({ where: { sessionId: workspace.sessionId }, data: { pendingRequest: Prisma.DbNull } })
      await tx.auditLog.create({ data: {
        organizationId: rawInput.organizationId, userId: rawInput.userId, entityType: "SalesOrder", entityId: request.salesOrderId,
        action: "POS_CHECKOUT_RECOVERY_SETTLED", changes: { clientCommitId: request.clientCommitId, outcome: status.kind },
      } })
      settled = true
    }
    const workspace = await tx.pOSCheckoutWorkspace.findFirstOrThrow({ where: checkoutScope(scope) })
    const parked = await tx.salesOrder.findMany({ where: {
      organizationId: rawInput.organizationId, createdById: rawInput.userId, locationId: input.locationId,
      channel: "POS", status: "DRAFT", posCartState: "PARKED", deletedAt: null,
      OR: [{ sessionId: input.sessionId }, { session: { status: "CLOSED" } }],
    }, select: { id: true, orderNumber: true, sessionId: true }, orderBy: { updatedAt: "desc" } })
    const historical = await tx.pOSCheckoutWorkspace.findMany({ where: {
      organizationId: rawInput.organizationId, actorId: rawInput.userId, sessionId: { not: input.sessionId }, pendingRequest: { not: Prisma.DbNull },
    } })
    return { pendingRequest: retainedCheckoutRequest(workspace.pendingRequest), historicalRequests: historical.flatMap(row => {
      const request = retainedCheckoutRequest(row.pendingRequest); return request ? [request] : []
    }), parked, settled, recoveredSales, recoveryAfter }
  }, Prisma.TransactionIsolationLevel.Serializable, true)
}

/** Durable intent precedes financial submission; a lost response can always recover this exact request. */
export async function preparePOSCheckout(rawInput: Input) {
  const input = checkoutWorkspaceSchema.parse(rawInput)
  const request = commitSaleSchema.parse(rawInput)
  return transaction(async tx => {
    const outcome = await readPOSSaleCommitStatusInTx(tx, { ...request, organizationId: rawInput.organizationId, userId: rawInput.userId })
    if (outcome.kind === "RECORDED") return
    await requireSession(tx, rawInput)
    const workspace = await assertCheckoutLeaseInTx(tx, { ...rawInput, sessionId: input.sessionId }, input.checkoutLeaseId, true)
    const previous = retainedCheckoutRequest(workspace.pendingRequest)
    if (previous && JSON.stringify(previous) !== JSON.stringify(request)) {
      const status = await readPOSSaleCommitStatusInTx(tx, { ...previous, organizationId: rawInput.organizationId, userId: rawInput.userId })
      if (!["CART_CHANGED", "CART_REVIEW_REQUIRED"].includes(status.kind) || previous.salesOrderId !== request.salesOrderId || previous.clientCommitId !== request.clientCommitId) {
        throw new ConflictError("POS_CHECKOUT_RECOVERY_REQUIRED")
      }
    }
    await tx.pOSCheckoutWorkspace.update({ where: { sessionId: input.sessionId }, data: { pendingRequest: request as Prisma.InputJsonValue } })
  })
}

/** Parked carts belong to their original cashier and location, with no automatic expiry. */
export async function changePOSCheckoutCart(rawInput: Input) {
  const input = checkoutCartCommandSchema.parse(rawInput)
  return transaction(async tx => {
    await requireSession(tx, rawInput)
    await assertPOSCartWriteAccessInTx(tx, { ...rawInput, resourceId: input.salesOrderId, operation: "update" })
    const workspace = await assertCheckoutLeaseInTx(tx, { ...rawInput, sessionId: input.sessionId }, input.checkoutLeaseId, input.command === "RESUME")
    const pending = retainedCheckoutRequest(workspace.pendingRequest)
    if (pending) {
      const status = await readPOSSaleCommitStatusInTx(tx, { ...pending, organizationId: rawInput.organizationId, userId: rawInput.userId })
      if (pending.salesOrderId !== input.salesOrderId || !["NOT_FOUND", "CART_CHANGED", "CART_REVIEW_REQUIRED"].includes(status.kind)) throw new ConflictError("POS_CHECKOUT_RECOVERY_REQUIRED")
    }
    await assertNoQueuedCheckoutInTx(tx, { ...rawInput, sessionId: input.sessionId })
    const source = await tx.salesOrder.findFirst({ where: {
      id: input.salesOrderId, organizationId: rawInput.organizationId, createdById: rawInput.userId,
      locationId: input.locationId, channel: "POS", status: "DRAFT", deletedAt: null,
      posCartState: { in: ["ACTIVE", "PARKED"] },
      OR: [{ sessionId: input.sessionId, terminalId: input.terminalId }, { posCartState: "PARKED", session: { status: "CLOSED" } }],
    }, include: { lines: true } })
    if (!source) throw new NotFoundError("POS_CHECKOUT_CART_UNAVAILABLE")
    if (input.command === "PARK") {
      if (source.sessionId !== input.sessionId) throw new ConflictError("POS_CHECKOUT_CART_UNAVAILABLE")
      await tx.salesOrder.update({ where: { id: source.id }, data: { posCartState: "PARKED", version: { increment: 1 } } })
    } else {
      const active = await getOrCreateDraftCart(tx, { ...rawInput, ...input })
      const activeLines = await tx.salesOrderLine.count({ where: { salesOrderId: active.id } })
      if (active.id !== source.id && activeLines > 0) throw new ConflictError("POS_CHECKOUT_PARK_FIRST")
      // Copy across shifts; preserve the original identity and history. All prices/taxes/stock are read anew.
      for (const line of source.lines) {
        const item = await tx.item.findFirst({ where: { id: line.itemId, organizationId: rawInput.organizationId, isActive: true, isDiscontinued: false, deletedAt: null },
          include: { taxRate: true, inventoryLevels: { where: { locationId: input.locationId } } } })
        if (!item || (item.trackInventory && (item.inventoryLevels[0]?.quantityAvailable ?? new Prisma.Decimal(0)).lt(line.quantity))) throw new ConflictError("POS_CHECKOUT_STOCK_CHANGED")
        const unitPrice = item.sellingPrice
        const taxRate = item.taxRate?.rate ?? new Prisma.Decimal(0)
        const amounts = lineMath({ quantity: line.quantity, unitPrice, taxRate, discount: line.discount })
        if (active.id === source.id) await tx.salesOrderLine.update({ where: { id: line.id }, data: { unitPrice, taxRate, ...amounts } })
        else await tx.salesOrderLine.create({ data: { salesOrderId: active.id, itemId: line.itemId, quantity: line.quantity, discount: line.discount, unitPrice, taxRate, ...amounts } })
      }
      if (active.id !== source.id) await tx.salesOrder.update({ where: { id: source.id }, data: { posCartState: "RETIRED", version: { increment: 1 } } })
      await recalculateCartTotals(tx, active.id)
      // A monotonic revision fences the original attempt even when timestamps share a millisecond.
      await tx.salesOrder.update({ where: { id: active.id }, data: { version: { increment: 1 } } })
      if (pending) await tx.pOSCheckoutWorkspace.update({ where: { sessionId: input.sessionId }, data: { pendingRequest: { ...pending, _cartReview: true } as Prisma.InputJsonValue } })
      await tx.auditLog.create({ data: { organizationId: rawInput.organizationId, userId: rawInput.userId, entityType: "SalesOrder", entityId: source.id,
        action: "POS_CART_RESUMED", changes: { activeCartId: active.id, sourceRevision: posCartRevision(source), pricesRevalidated: true } } })
      return { activeCartId: active.id }
    }
    await tx.auditLog.create({ data: { organizationId: rawInput.organizationId, userId: rawInput.userId, entityType: "SalesOrder", entityId: source.id,
      action: "POS_CART_PARKED", changes: { contentsPreserved: true, sessionId: input.sessionId } } })
    return { activeCartId: null }
  })
}
