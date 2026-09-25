import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import type { TransferCommand, TransferOperation } from "@/types/transferLifecycle"
import { transferInclude } from "./inventory-transfer.service"
import { ConcurrentStockUpdateError, InsufficientStockError } from "./inventory-errors"
import { recordInventoryValuationCloseInvalidationInTx } from "./inventory-close-invalidation.service"

const commandSchema = z.object({
  transferId: z.string().min(1), organizationId: z.string().min(1), actorId: z.string().min(1),
  operation: z.enum(["SUBMIT", "APPROVE", "DISPATCH", "RECEIVE", "CANCEL", "REJECT", "RETURN_TO_DRAFT"]),
  requestId: z.string().trim().min(1).max(150), expectedUpdatedAt: z.string().datetime(),
  confirmNoMovement: z.boolean().optional(),
  locationId: z.string().min(1).optional(), notes: z.string().trim().max(2000).optional(),
  lines: z.array(z.object({ lineId: z.string().min(1), quantity: z.number().finite().positive()
    .refine(value => new Prisma.Decimal(value).decimalPlaces() <= 3, "Use at most three decimal places") })).max(500).optional(),
})
type Transfer = Prisma.StockTransferGetPayload<{ include: typeof transferInclude }>
const d = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value)

export function transferOperations(transfer: Pick<Transfer, "status" | "createdById">, actorId: string): TransferOperation[] {
  switch (transfer.status) {
    case "DRAFT": return ["SUBMIT", "CANCEL"]
    case "SUBMITTED": return transfer.createdById === actorId ? ["CANCEL"] : ["APPROVE", "REJECT", "CANCEL"]
    case "APPROVED": return ["DISPATCH", "CANCEL"]
    case "IN_TRANSIT": case "PARTIALLY_RECEIVED": return ["RECEIVE"]
    default: return []
  }
}

export function transferBlockingIssue(transfer: Transfer) {
  if (!["DRAFT", "SUBMITTED", "APPROVED"].includes(transfer.status)) return undefined
  if (transfer.lines.some(line => !line.shippedQuantity.isZero() || !line.receivedQuantity.isZero())) return "RECORDED_QUANTITIES" as const
  if (transfer.status === "APPROVED" && (!transfer.approvedById || transfer.approvedById === transfer.createdById)) return "APPROVAL_EVIDENCE" as const
  return undefined
}

// Only an unposted pre-dispatch record can be corrected. Check all retained
// movement evidence, including older posting paths and events that have not applied.
async function canReturnToDraft(transfer: Transfer, tx: Prisma.TransactionClient) {
  if (!transferBlockingIssue(transfer) || transfer.actualDate || transfer.lines.some(line => !line.receivedQuantity.isZero() || line.shippedQuantity.lt(0))) return false
  const scope = { organizationId: transfer.organizationId }
  const movement = await tx.inventoryTransaction.findFirst({ where: { ...scope, referenceId: transfer.id }, select: { id: true } })
  const event = await tx.businessEvent.findFirst({ where: { ...scope, sourceId: transfer.id,
    eventType: { notIn: ["stock.transfer.submitted", "stock.transfer.approved", "stock.transfer.returned_to_draft"] },
  }, select: { id: true } })
  const audit = await tx.auditLog.findFirst({ where: { ...scope, entityId: transfer.id,
    action: { in: ["POST_STOCK_TRANSFER", "DISPATCH_STOCK_TRANSFER", "RECEIVE_STOCK_TRANSFER"] },
  }, select: { id: true } })
  return !movement && !event && !audit
}

export async function transferWorkflowAvailability(transfer: Transfer, actorId: string, tx: Prisma.TransactionClient = db) {
  const blockingIssue = transferBlockingIssue(transfer)
  const allowedOperations: TransferOperation[] = blockingIssue
    ? await canReturnToDraft(transfer, tx) ? ["RETURN_TO_DRAFT"] : []
    : transferOperations(transfer, actorId)
  return { blockingIssue, allowedOperations }
}

export async function loadTransferDetail(organizationId: string, transferId: string, client: Prisma.TransactionClient = db) {
  const transfer = await client.stockTransfer.findFirst({ where: { id: transferId, organizationId, deletedAt: null }, include: transferInclude })
  if (!transfer) throw new NotFoundError("Transfer not found in this organization.")
  return transfer
}

/** Lock before reading. Each request is bound to its actor, destination, quantities
 * and displayed revision, so retrying cannot add stock twice. */
export async function transitionStockTransfer(input: TransferCommand & { actorId: string }, client: typeof db = db) {
  const command = commandSchema.parse(input)
  return client.$transaction(async tx => {
    const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT "id" FROM "stock_transfers" WHERE "id" = ${command.transferId}
      AND "organizationId" = ${command.organizationId} AND "deletedAt" IS NULL FOR UPDATE`)
    if (locked.length !== 1) throw new NotFoundError("Transfer not found in this organization.")
    const transfer = await loadTransferDetail(command.organizationId, command.transferId, tx)
    const payload = { ...command, lines: [...(command.lines ?? [])].sort((a, b) => a.lineId.localeCompare(b.lineId)) }
    const idempotencyKey = `stock-transfer:${transfer.id}:command:${command.requestId}`
    const payloadHash = hashBusinessPayload(payload)
    const existing = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: {
      organizationId: command.organizationId, eventSource: "INTERNAL", idempotencyKey,
    } } })
    if (existing) {
      if (existing.payloadHash !== payloadHash || existing.sourceId !== transfer.id || existing.status !== "APPLIED") {
        throw new ConflictError("This request was already used with different transfer details. Refresh the transfer.")
      }
      return { transfer, replayed: true }
    }
    if (transfer.updatedAt.toISOString() !== command.expectedUpdatedAt) throw new ConflictError("This transfer has changed. Refresh it before continuing.")
    const returning = command.operation === "RETURN_TO_DRAFT"
    if (returning) {
      if (!command.confirmNoMovement || !command.notes) throw new BusinessRuleError("Confirm that no items left the source and enter a correction reason.")
      if (!await canReturnToDraft(transfer, tx)) throw new BusinessRuleError("This transfer has movement evidence or is not eligible for draft correction. Reconcile its stock history before continuing.")
    }
    if (!returning && !transferOperations(transfer, command.actorId).includes(command.operation)) {
      throw new BusinessRuleError(command.operation === "APPROVE" && transfer.createdById === command.actorId
        ? "Another authorized user must approve this transfer."
        : `Cannot ${command.operation.toLowerCase()} a transfer in ${transfer.status} status.`)
    }
    if ((command.operation === "CANCEL" || command.operation === "REJECT") && !command.notes) {
      throw new BusinessRuleError("A cancellation or rejection reason is required.")
    }
    const receiving = command.operation === "RECEIVE"
    const dispatching = command.operation === "DISPATCH"
    if (receiving && command.locationId !== transfer.toLocationId) throw new BusinessRuleError("Confirm the transfer's receiving location.")
    if (dispatching && command.locationId !== transfer.fromLocationId) throw new BusinessRuleError("Confirm the transfer's dispatch location.")
    if (!receiving && command.lines?.length) throw new BusinessRuleError("Receipt quantities are only accepted during reception.")
    if (!["CANCEL", "REJECT", "RETURN_TO_DRAFT"].includes(command.operation)) {
      for (const location of [transfer.fromLocation, transfer.toLocation]) {
        if (location.organizationId !== command.organizationId || !location.isActive || location.deletedAt) throw new BusinessRuleError("Both transfer locations must be active in this organization.")
      }
      if (transfer.fromLocationId === transfer.toLocationId || !transfer.lines.length) throw new BusinessRuleError("A transfer needs different locations and at least one item.")
    }
    if (!returning && !receiving && transfer.lines.some(line => line.shippedQuantity.gt(0) || line.receivedQuantity.gt(0))) {
      throw new BusinessRuleError("This transfer already contains stock movement quantities and requires reconciliation.")
    }
    if (dispatching && (!transfer.approvedById || transfer.approvedById === transfer.createdById)) {
      throw new BusinessRuleError("Independent approval evidence is required before dispatch.")
    }
    const now = new Date()
    const period = dispatching || receiving ? await getOpenPeriodForDate(command.organizationId, now, tx) : null
    if ((dispatching || receiving) && !period) throw new BusinessRuleError("An open accounting period is required for this stock movement.")
    if (receiving) {
      if (!command.lines?.length) throw new BusinessRuleError("Enter at least one received quantity.")
      if (new Set(command.lines.map(line => line.lineId)).size !== command.lines.length) throw new BusinessRuleError("A receipt cannot repeat a transfer line.")
      // Legacy records without dispatch evidence must be reconciled, never credited again by assumption.
      const dispatch = await tx.businessEvent.findFirst({ where: { organizationId: command.organizationId,
        sourceType: "STOCK_TRANSFER", sourceId: transfer.id, eventType: "stock.transfer.dispatched", status: "APPLIED" } })
      if (!dispatch) throw new BusinessRuleError("Dispatch evidence is missing. Reconcile this legacy transfer before receiving stock.")
      for (const entry of command.lines) {
        const line = transfer.lines.find(line => line.id === entry.lineId)
        if (!line || d(entry.quantity).gt(line.shippedQuantity.minus(line.receivedQuantity))) throw new BusinessRuleError("Received quantities must not exceed the outstanding quantity for this transfer line.")
      }
    }
    const eventType = `stock.transfer.${({ SUBMIT: "submitted", APPROVE: "approved", DISPATCH: "dispatched", RECEIVE: "received", CANCEL: "cancelled", REJECT: "rejected", RETURN_TO_DRAFT: "returned_to_draft" } as const)[command.operation]}`
    const event = await recordBusinessEventInTx(tx, { organizationId: command.organizationId, eventType, eventSource: "INTERNAL",
      idempotencyKey, payload, actorId: command.actorId, locationId: receiving ? transfer.toLocationId : transfer.fromLocationId,
      sourceType: "STOCK_TRANSFER", sourceId: transfer.id, occurredAt: now, documentHash: payloadHash,
    })
    if (!event.created) throw new ConflictError("Transfer request is already being processed. Refresh and retry.")

    for (const line of transfer.lines) {
      const receipt = command.lines?.find(entry => entry.lineId === line.id)
      if (!dispatching && !(receiving && receipt)) continue
      const quantity = dispatching ? line.requestedQuantity : d(receipt!.quantity)
      if (quantity.lte(0) || line.item.organizationId !== command.organizationId) throw new BusinessRuleError("Invalid transfer item or quantity.")
      if (dispatching && (!line.item.isActive || line.item.deletedAt || line.item.isDiscontinued || !line.item.trackInventory)) throw new BusinessRuleError(`Item ${line.item.sku} cannot be dispatched.`)
      const destination = await tx.inventoryLevel.upsert({ where: { itemId_locationId: { itemId: line.itemId, locationId: transfer.toLocationId } },
        create: { itemId: line.itemId, locationId: transfer.toLocationId }, update: {},
      })
      let unitCost = d(line.unitCost ?? 0)
      let balance: Prisma.Decimal
      let value: Prisma.Decimal
      if (dispatching) {
        const source = await tx.inventoryLevel.findUnique({ where: { itemId_locationId: { itemId: line.itemId, locationId: transfer.fromLocationId } } })
        if (!source || source.quantityAvailable.lt(quantity) || source.quantityOnHand.lt(quantity)) throw new InsufficientStockError(`Insufficient available stock for ${line.item.sku}.`)
        // Allocate carrying value, including the rounding residual on the last units.
        unitCost = source.quantityOnHand.gt(0) ? source.totalValue.div(source.quantityOnHand).toDecimalPlaces(2) : source.averageCost
        value = source.totalValue.times(quantity).div(source.quantityOnHand).toDecimalPlaces(2)
        balance = source.quantityOnHand.minus(quantity)
        const changed = await tx.inventoryLevel.updateMany({ where: { id: source.id, version: source.version,
          quantityAvailable: { gte: quantity }, quantityOnHand: { gte: quantity } }, data: {
          quantityOnHand: balance, quantityAvailable: source.quantityAvailable.minus(quantity),
          totalValue: source.totalValue.minus(value), version: { increment: 1 }, lastTransactionAt: now,
        } })
        if (changed.count !== 1) throw new ConcurrentStockUpdateError("Source stock changed. Refresh and retry.")
        const destinationChanged = await tx.inventoryLevel.updateMany({ where: { id: destination.id, version: destination.version },
          data: { quantityInTransit: { increment: quantity }, version: { increment: 1 } } })
        if (destinationChanged.count !== 1) throw new ConcurrentStockUpdateError("Receiving stock changed. Refresh and retry.")
        await tx.stockTransferLine.update({ where: { id: line.id }, data: { shippedQuantity: quantity, unitCost } })
      } else {
        // Use dispatched carrying value, not today's item cost or the destination average.
        const out = await tx.inventoryTransaction.findMany({ where: { organizationId: command.organizationId,
          referenceType: "STOCK_TRANSFER", referenceId: transfer.id, itemId: line.itemId,
          locationId: transfer.fromLocationId, type: "TRANSFER_OUT", notes: { contains: `line:${line.id} event:` } }, select: { totalCost: true } })
        if (out.length !== 1) throw new BusinessRuleError("The dispatch valuation for this line requires reconciliation.")
        const dispatchedValue = out[0].totalCost
        const beforeValue = dispatchedValue.times(line.receivedQuantity).div(line.shippedQuantity).toDecimalPlaces(2)
        const afterValue = dispatchedValue.times(line.receivedQuantity.plus(quantity)).div(line.shippedQuantity).toDecimalPlaces(2)
        value = afterValue.minus(beforeValue)
        balance = destination.quantityOnHand.plus(quantity)
        const totalValue = destination.totalValue.plus(value)
        const changed = await tx.inventoryLevel.updateMany({ where: { id: destination.id, version: destination.version,
          quantityInTransit: { gte: quantity } }, data: { quantityOnHand: balance,
          quantityAvailable: Prisma.Decimal.max(balance.minus(destination.quantityReserved), 0),
          quantityInTransit: { decrement: quantity }, totalValue,
          averageCost: totalValue.div(balance).toDecimalPlaces(2), version: { increment: 1 }, lastTransactionAt: now,
        } })
        if (changed.count !== 1) throw new ConcurrentStockUpdateError("Receiving stock or in-transit quantity changed. Refresh and retry.")
        await tx.stockTransferLine.update({ where: { id: line.id }, data: { receivedQuantity: { increment: quantity } } })
      }
      await tx.inventoryTransaction.create({ data: { organizationId: command.organizationId, itemId: line.itemId,
        locationId: dispatching ? transfer.fromLocationId : transfer.toLocationId, createdById: command.actorId,
        type: dispatching ? "TRANSFER_OUT" : "TRANSFER_IN", quantity: dispatching ? quantity.negated() : quantity,
        unitCost, totalCost: value, balanceAfter: balance, referenceType: "STOCK_TRANSFER", referenceId: transfer.id,
        referenceNumber: transfer.transferNumber, notes: `Transfer ${command.operation.toLowerCase()} line:${line.id} event:${event.event.id}`,
        effectiveAt: now, recordedAt: now, timeProvenance: "EXPLICIT_SOURCE_TIME",
      } })
    }
    if (returning) {
      for (const line of transfer.lines) await tx.stockTransferLine.update({ where: { id: line.id }, data: { shippedQuantity: d(0), unitCost: null } })
    }
    const complete = receiving && transfer.lines.every(line => line.receivedQuantity.plus(command.lines?.find(entry => entry.lineId === line.id)?.quantity ?? 0).eq(line.shippedQuantity))
    const status = ({ SUBMIT: "SUBMITTED", APPROVE: "APPROVED", DISPATCH: "IN_TRANSIT", RECEIVE: complete ? "COMPLETED" : "PARTIALLY_RECEIVED", CANCEL: "CANCELLED", REJECT: "CANCELLED", RETURN_TO_DRAFT: "DRAFT" } as const)[command.operation]
    const updated = await tx.stockTransfer.update({ where: { id: transfer.id }, data: {
      status, ...(returning ? { approvedById: null, approvedAt: null } : {}), ...(command.operation === "APPROVE" ? { approvedById: command.actorId, approvedAt: now } : {}),
      ...(complete ? { actualDate: now } : {}),
    }, include: transferInclude })
    await tx.auditLog.create({ data: { organizationId: command.organizationId, userId: command.actorId,
      entityType: "StockTransfer", entityId: transfer.id, action: `${command.operation}_STOCK_TRANSFER`,
      changes: { before: { status: transfer.status, ...(returning ? {
        approvedById: transfer.approvedById, approvedAt: transfer.approvedAt?.toISOString() ?? null,
        lines: transfer.lines.map(line => ({ lineId: line.id, shippedQuantity: line.shippedQuantity.toString(), receivedQuantity: line.receivedQuantity.toString(), unitCost: line.unitCost?.toString() ?? null })),
      } : {}) }, after: { status, eventId: event.event.id, ...payload } },
    } })
    await markBusinessEventAppliedInTx(tx, command.organizationId, event.event.id)
    if (period) await recordInventoryValuationCloseInvalidationInTx(tx, { organizationId: command.organizationId,
      sourceId: transfer.id, periodId: period.id, occurredAt: now, actorId: command.actorId, documentHash: payloadHash, correlationId: event.event.id })
    return { transfer: updated, replayed: false }
  }, { timeout: 30000 })
}