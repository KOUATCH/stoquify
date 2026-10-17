import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { purchaseOrderEditSnapshot } from "./purchase-order-edit-record"
import { purchaseReceivingAuthority, purchaseReceivingScopeSchema, type PurchaseReceivingScope } from "./purchase-receiving-authority"
import { purchaseReceivingCommandSchema, purchaseReceivingDecisionSchema, purchaseReceivingDraftSchema, type PurchaseReceivingCommand, type PurchaseReceivingDecision, type PurchaseReceivingDraft, type PurchaseReceivingPreview, type PurchaseReceivingWorkbench } from "./purchase-receiving-contracts"
import { receiveItems, resolveGoodsReceiptInspection } from "./purchase-order.service"
import { hasVerifiedReceiptPosting, receiptPostingEvidenceSelect } from "./purchase-receipt-accounting-evidence"

const orderIdSchema = z.string().min(1).max(191)
const eventKey = (request: string) => `purchase-receiving-decision:${request}`
const eventType = (kind: "receive" | "resolve") => kind === "receive" ? "purchase.receipt.recorded" : "purchase.receipt.inspection_resolved"
const actorName = (person: { name: string | null; firstName: string | null; lastName: string | null } | null) => person?.name || [person?.firstName, person?.lastName].filter(Boolean).join(" ") || "—"
const personSelect = { name: true, firstName: true, lastName: true } as const
const receiptInclude = { location: { select: { name: true } }, receivedBy: { select: personSelect }, lines: { include: { item: { select: { nameEn: true, nameFr: true } } }, orderBy: { id: "asc" as const } }, inspection: { include: { inspectedBy: { select: personSelect } } }, inspectionResolution: { include: { resolvedBy: { select: personSelect } } } } satisfies Prisma.GoodsReceiptInclude
type Receipt = Prisma.GoodsReceiptGetPayload<{ include: typeof receiptInclude }>

async function context(tx: Prisma.TransactionClient, scope: PurchaseReceivingScope, orderId: string, operation: "receive" | "resolve" | "read") {
  const authority = await purchaseReceivingAuthority(tx, scope, operation)
  await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${orderId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  const order = await tx.purchaseOrder.findFirst({ where: { id: orderId, organizationId: scope.organizationId }, include: { supplier: true, location: true, organization: true, lines: { include: { item: true }, orderBy: { id: "asc" } } } })
  if (!order) throw new NotFoundError("Purchase order not found")
  const held = await tx.goodsReceiptLine.groupBy({ by: ["purchaseOrderLineId"], where: { goodsReceipt: { organizationId: scope.organizationId, purchaseOrderId: orderId, status: "HELD", deletedAt: null } }, _sum: { receivedQuantity: true }, orderBy: { purchaseOrderLineId: "asc" } })
  const heldByLine = new Map(held.map(line => [line.purchaseOrderLineId, line._sum.receivedQuantity ?? new Prisma.Decimal(0)]))
  const revision = hashBusinessPayload({ version: 1, order: purchaseOrderEditSnapshot(order), currency: order.organization.currency, location: { id: order.location.id, active: order.location.isActive, deleted: order.location.deletedAt }, items: order.lines.map(l => ({ id: l.itemId, active: l.item.isActive, deleted: l.item.deletedAt, trackBatches: l.item.trackBatches, trackSerialNumbers: l.item.trackSerialNumbers, trackExpiry: l.item.trackExpiry })), held: held.map(l => ({ id: l.purchaseOrderLineId, quantity: l._sum.receivedQuantity?.toString() ?? "0" })) })
  return { order, authority, heldByLine, revision }
}

const stockLineSchema = z.object({ itemId: z.string(), locationId: z.string(), quantity: z.string(), unitCost: z.string(), movementType: z.literal("PURCHASE_RECEIPT"), referenceType: z.literal("GOODS_RECEIPT"), referenceId: z.string(), batchNumber: z.string().nullable(), serialNumbers: z.array(z.string()), expiryDate: z.string().nullable() })
type StockLine = z.infer<typeof stockLineSchema>
function stockSignatures(lines: StockLine[]) {
  return lines.map(line => hashBusinessPayload({ ...line, quantity: new Prisma.Decimal(line.quantity).toString(), unitCost: new Prisma.Decimal(line.unitCost).toString(), serialNumbers: [...line.serialNumbers].sort() })).sort()
}
async function loadOutcomes(tx: Prisma.TransactionClient, organizationId: string, receipts: Receipt[], currency: string) {
  const ids = receipts.map(receipt => receipt.id)
  const events = await tx.businessEvent.findMany({ where: { organizationId, sourceId: { in: ids }, sourceType: "GOODS_RECEIPT", eventType: "purchase.goods_receipt.stock_posted", status: "APPLIED" }, select: { sourceId: true, payload: true, payloadHash: true, processedAt: true, documentHash: true } })
  const movements = await tx.inventoryTransaction.findMany({ where: { organizationId, referenceType: "GOODS_RECEIPT", referenceId: { in: ids } }, select: { itemId: true, locationId: true, quantity: true, unitCost: true, type: true, referenceId: true, batchNumber: true, serialNumbers: true, expiryDate: true } })
  const batches = await tx.ledgerPostingBatch.findMany({ where: { organizationId, sourceType: "GOODS_RECEIPT", sourceId: { in: ids }, postingPurpose: "GOODS_RECEIPT" }, select: receiptPostingEvidenceSelect })
  return new Map(receipts.map((receipt): [string, Pick<PurchaseReceivingDecision, "stockStatus" | "accountingStatus">] => {
    if (receipt.status !== "RECEIVED" && receipt.status !== "COMPLETED") return [receipt.id, { stockStatus: "unavailable" as const, accountingStatus: "not_started" as const }]
    const stockEvents = events.filter(event => event.sourceId === receipt.id), stock = movements.filter(m => m.referenceId === receipt.id), ledger = batches.filter(batch => batch.sourceId === receipt.id)
    let verified = false
    try {
      const expected = stockSignatures(receipt.lines.map(line => ({ itemId: line.itemId, locationId: receipt.locationId, quantity: line.receivedQuantity.toString(), unitCost: line.unitCost.toString(), movementType: "PURCHASE_RECEIPT", referenceType: "GOODS_RECEIPT", referenceId: receipt.id, batchNumber: line.batchNumber, serialNumbers: line.serialNumbers, expiryDate: line.expiryDate?.toISOString() ?? null })))
      const actual = stockSignatures(stock.map(m => stockLineSchema.parse({ itemId: m.itemId, locationId: m.locationId, quantity: m.quantity.toString(), unitCost: m.unitCost.toString(), movementType: m.type, referenceType: "GOODS_RECEIPT", referenceId: m.referenceId, batchNumber: m.batchNumber, serialNumbers: m.serialNumbers, expiryDate: m.expiryDate?.toISOString() ?? null })))
      const recorded = stockSignatures(stockEvents.flatMap(event => {
        const payload = event.payload as Record<string, unknown> | null
        if (!event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || payload?.sourceId !== receipt.id || payload.sourceType !== "GOODS_RECEIPT" || payload.eventType !== "purchase.goods_receipt.stock_posted" || !event.documentHash || payload.documentHash !== event.documentHash) throw new Error("Unverified stock event")
        return z.array(stockLineSchema).parse(payload.lines)
      }))
      verified = !!receipt.inventoryPostedAt && expected.length > 0 && hashBusinessPayload(expected) === hashBusinessPayload(actual) && hashBusinessPayload(expected) === hashBusinessPayload(recorded)
    } catch { /* Missing or inconsistent evidence is unverified, never healthy. */ }
    const postingVerified = verified && hasVerifiedReceiptPosting({
      organizationId, receiptId: receipt.id, receiptNumber: receipt.receiptNumber, receiptDate: receipt.receiptDate,
      documentHashes: stockEvents.flatMap(event => event.documentHash ? [event.documentHash] : []), currency,
      value: receipt.lines.reduce((sum, line) => sum.plus(line.receivedQuantity.times(line.unitCost).toDecimalPlaces(2)), new Prisma.Decimal(0)),
      batches: ledger,
    })
    const accountingStatus = postingVerified ? "posted" as const : ledger.some(batch => batch.status === "FAILED") ? "review_required" as const : "unverified" as const
    return [receipt.id, { stockStatus: verified ? "recorded" as const : "unverified" as const, accountingStatus }]
  }))
}
async function outcomes(tx: Prisma.TransactionClient, organizationId: string, receipt: Receipt, currency: string) {
  return (await loadOutcomes(tx, organizationId, [receipt], currency)).get(receipt.id)!
}

async function decision(tx: Prisma.TransactionClient, scope: PurchaseReceivingScope, command: PurchaseReceivingCommand, commandHash: string) {
  const event = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId: scope.organizationId, eventSource: "INTERNAL", idempotencyKey: eventKey(command.idempotencyKey) } } })
  if (!event) return null
  const payload = event.payload as Record<string, unknown> | null
  if (event.eventType !== eventType(command.draft.kind) || event.schemaVersion !== 1 || event.sourceId !== command.draft.orderId || event.sourceType !== null || event.actorId !== scope.actorId || payload?.entityType !== "GoodsReceipt" || payload.commandHash !== commandHash) throw new IdempotencyConflictError("This receiving reference belongs to another request.")
  const parsed = purchaseReceivingDecisionSchema.safeParse(payload.result)
  if (event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || !parsed.success || parsed.data.kind !== command.draft.kind || parsed.data.actorId !== scope.actorId || parsed.data.orderId !== command.draft.orderId || parsed.data.reviewedRevision !== command.expectedRevision || parsed.data.requestReference !== command.idempotencyKey || parsed.data.recordedAt !== event.occurredAt.toISOString()) throw new BusinessRuleError("The receiving decision could not be verified.", "RECEIPT_EVIDENCE_REQUIRED")
  return { ...parsed.data, replayed: true }
}

export async function getPurchaseReceivingWorkbench(orderIdInput: string, scopeInput: PurchaseReceivingScope): Promise<PurchaseReceivingWorkbench> {
  const orderId = orderIdSchema.parse(orderIdInput), scope = purchaseReceivingScopeSchema.parse(scopeInput)
  return db.$transaction(async tx => {
    const c = await context(tx, scope, orderId, "read")
    const write = await evaluateModuleAccessInTx(tx, { organizationId: scope.organizationId, userId: scope.actorId, moduleSlug: "purchasing", surfaceType: "action", surface: "actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:receiveItems", accessIntent: "write", mode: "enforce" })
    const canWrite = c.authority.canReceive && write.allowed && !c.order.deletedAt
    const rows = await tx.goodsReceipt.findMany({ where: { organizationId: scope.organizationId, purchaseOrderId: orderId, deletedAt: null }, include: receiptInclude, orderBy: [{ receiptDate: "desc" }, { id: "desc" }], take: 101 })
    const receipts: PurchaseReceivingWorkbench["receipts"] = []
    const visible = rows.slice(0, 100), currentOutcomes = await loadOutcomes(tx, scope.organizationId, visible, c.order.organization.currency)
    const historyEvents = visible.length ? await tx.businessEvent.findMany({ where: { organizationId: scope.organizationId, sourceId: orderId, eventType: { in: [eventType("receive"), eventType("resolve")] }, OR: visible.map(r => ({ payload: { path: ["result", "goodsReceiptId"], equals: r.id } })) }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }] }) : []
    for (const r of visible) {
      const outcome = currentOutcomes.get(r.id)!
      const events = historyEvents.filter(e => (e.payload as { result?: { goodsReceiptId?: string } } | null)?.result?.goodsReceiptId === r.id).slice(0,1)
      let saved: PurchaseReceivingDecision | null = null
      if (events.length) { const e = events[0], payload = e.payload as Record<string, unknown> | null, parsed = purchaseReceivingDecisionSchema.safeParse(payload?.result); if (!parsed.success || e.status !== "APPLIED" || !e.processedAt || e.eventSource !== "INTERNAL" || e.schemaVersion !== 1 || e.sourceType !== null || payload?.entityType !== "GoodsReceipt" || !parsed.success || e.eventType !== eventType(parsed.data.kind) || e.payloadHash !== hashBusinessPayload(e.payload) || payload?.receiptPayloadHash !== r.payloadHash || parsed.data.disposition !== r.status || parsed.data.receiptNumber !== r.receiptNumber || parsed.data.goodsReceiptId !== r.id || parsed.data.orderId !== orderId || parsed.data.actorId !== e.actorId || parsed.data.recordedAt !== e.occurredAt.toISOString() || e.idempotencyKey !== eventKey(parsed.data.requestReference)) throw new BusinessRuleError("A receiving history record could not be verified.", "RECEIPT_EVIDENCE_REQUIRED"); saved = parsed.data }
      const canResolve = !!canWrite && r.status === "HELD" && !!r.inspection && !r.inspectionResolution && ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"].includes(c.order.status)
      receipts.push({ id: r.id, number: r.receiptNumber, recordedAt: r.receiptDate.toISOString(), status: r.status, location: r.location.name, receiver: actorName(r.receivedBy), quantity: r.lines.reduce((sum,l) => sum.plus(l.receivedQuantity),new Prisma.Decimal(0)).toString(), value: r.lines.reduce((sum,l) => sum.plus(l.lineTotal),new Prisma.Decimal(0)).toString(), inspection: r.inspection ? { outcome: r.inspection.outcome, reason: r.inspection.reason, evidenceNotes: r.inspection.evidenceNotes, inspector: actorName(r.inspection.inspectedBy), inspectedById: r.inspection.inspectedById, at: r.inspection.inspectedAt.toISOString() } : null, resolution: r.inspectionResolution ? { decision: r.inspectionResolution.decision, reason: r.inspectionResolution.reason, resolver: actorName(r.inspectionResolution.resolvedBy), at: r.inspectionResolution.resolvedAt.toISOString() } : null, ...outcome, decision: saved, canAccept: canResolve && r.inspection?.inspectedById !== scope.actorId, canReject: canResolve })
    }
    const lines = c.order.lines.map(l => ({ id: l.id, itemId: l.itemId, nameEn: l.item.nameEn, nameFr: l.item.nameFr ?? l.item.nameEn, ordered: l.orderedQuantity.toString(), received: l.receivedQuantity.toString(), held: (c.heldByLine.get(l.id) ?? new Prisma.Decimal(0)).toString(), available: Prisma.Decimal.max(0,l.orderedQuantity.minus(l.receivedQuantity).minus(c.heldByLine.get(l.id) ?? 0)).toString(), unitCost: l.unitCost.toString(), trackBatches: l.item.trackBatches, trackSerialNumbers: l.item.trackSerialNumbers, trackExpiry: l.item.trackExpiry, active: l.item.organizationId === scope.organizationId && l.item.isActive && !l.item.deletedAt }))
    return { organizationId: scope.organizationId, actorId: scope.actorId, orderId, orderNumber: c.order.orderNumber, orderStatus: c.order.status, supplier: c.order.supplier.name, currency: c.order.organization.currency, checkedAt: new Date().toISOString(), revision: c.revision, locationId: c.order.locationId, location: c.order.location.name, canReceive: !!canWrite && c.order.location.isActive && !c.order.location.deletedAt && ["APPROVED", "PARTIALLY_RECEIVED"].includes(c.order.status) && lines.some(l => l.active && Number(l.available) > 0), lines, receipts, olderReceipts: rows.length > 100 }
  }, { timeout: 15000 })
}

async function previewInTx(tx: Prisma.TransactionClient, scope: PurchaseReceivingScope, draft: PurchaseReceivingDraft): Promise<PurchaseReceivingPreview> {
  const c = await context(tx, scope, draft.orderId, draft.kind === "receive" ? "receive" : "resolve")
  if (c.order.deletedAt) throw new BusinessRuleError("This order has been archived.")
  let disposition: PurchaseReceivingPreview["disposition"], lines: PurchaseReceivingPreview["lines"], evidence: unknown, locationName: string
  if (draft.kind === "receive") {
    if (!["APPROVED", "PARTIALLY_RECEIVED"].includes(c.order.status)) throw new BusinessRuleError("This order is unavailable for new receiving.")
    const location = await tx.location.findFirst({ where: { id: draft.locationId ?? c.order.locationId, organizationId: scope.organizationId, isActive: true, deletedAt: null }, select: { id: true, name: true, updatedAt: true } })
    if (!location) throw new NotFoundError("Receiving location unavailable")
    locationName = location.name
    let serialQuantity = 0
    lines = draft.items.map(item => {
      const line = c.order.lines.find(l => l.id === item.lineId)
      if (!line || line.item.organizationId !== scope.organizationId || !line.item.isActive || line.item.deletedAt) throw new BusinessRuleError("A receiving item is unavailable.")
      if (line.orderedQuantity.minus(line.receivedQuantity).minus(c.heldByLine.get(line.id) ?? 0).lt(item.receivedQuantity)) throw new ConflictError("Available quantities changed. Review current receiving and held receipts.")
      if (item.unitPrice !== undefined && !line.unitCost.eq(item.unitPrice)) throw new ConflictError("Receiving must preserve the approved order cost.")
      if (line.item.trackExpiry && !item.expiryDate) throw new BusinessRuleError("Record an expiry date for the tracked item.")
      if (line.item.trackSerialNumbers) { if (!Number.isInteger(item.receivedQuantity)) throw new BusinessRuleError("Serial-tracked items require whole units."); serialQuantity += item.receivedQuantity }
      return { id: line.id, nameEn: line.item.nameEn, nameFr: line.item.nameFr ?? line.item.nameEn, quantity: String(item.receivedQuantity), unitCost: line.unitCost.toString(), value: line.unitCost.mul(item.receivedQuantity).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP).toString() }
    })
    if (serialQuantity > 5000) throw new BusinessRuleError("Receive at most 5000 serial-tracked units in one request.")
    disposition = draft.inspectionOutcome === "PASSED" ? "RECEIVED" : "HELD"
    evidence = { revision: c.revision, destination: location }
  } else {
    const receipt = await tx.goodsReceipt.findFirst({ where: { id: draft.goodsReceiptId, organizationId: scope.organizationId, purchaseOrderId: draft.orderId, deletedAt: null }, include: receiptInclude })
    if (!receipt) throw new NotFoundError("Goods receipt not found")
    if (receipt.status !== "HELD" || !receipt.inspection || receipt.inspectionResolution) throw new ConflictError("This inspection is no longer awaiting a decision.")
    if (!["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"].includes(c.order.status)) throw new BusinessRuleError("The order is unavailable for inspection resolution.")
    if (draft.decision === "ACCEPT" && receipt.inspection.inspectedById === scope.actorId) throw new BusinessRuleError("A different authorized receiver must accept this inspection.", "SOD_VIOLATION")
    locationName = receipt.location.name
    disposition = draft.decision === "ACCEPT" ? "RECEIVED" : "REJECTED"
    lines = receipt.lines.map(l => ({ id: l.id, nameEn: l.item.nameEn, nameFr: l.item.nameFr ?? l.item.nameEn, quantity: l.receivedQuantity.toString(), unitCost: l.unitCost.toString(), value: l.lineTotal.toString() }))
    evidence = { revision: c.revision, receipt: { id: receipt.id, status: receipt.status, payloadHash: receipt.payloadHash, inspection: receipt.inspection.id, updatedAt: receipt.updatedAt, lines: receipt.lines.map(l => ({ id: l.id, quantity: l.receivedQuantity.toString(), value: l.lineTotal.toString(), batch: l.batchNumber, expiry: l.expiryDate, serials: l.serialNumbers })) } }
  }
  return { organizationId: scope.organizationId, actorId: scope.actorId, orderId: draft.orderId, orderNumber: c.order.orderNumber, currency: c.order.organization.currency, location: locationName, revision: hashBusinessPayload({ draft, evidence }), draft, disposition, quantity: lines.reduce((s,l) => s.plus(l.quantity),new Prisma.Decimal(0)).toString(), value: lines.reduce((s,l) => s.plus(l.value),new Prisma.Decimal(0)).toString(), lines, requiresFreshAuth: draft.kind === "resolve" && !c.authority.fresh, checkedAt: new Date().toISOString() }
}

export async function previewPurchaseReceiving(draftInput: PurchaseReceivingDraft, scopeInput: PurchaseReceivingScope) {
  const draft = purchaseReceivingDraftSchema.parse(draftInput), scope = purchaseReceivingScopeSchema.parse(scopeInput)
  return db.$transaction(tx => previewInTx(tx,scope,draft), { timeout:15000 })
}

export async function confirmPurchaseReceiving(commandInput: PurchaseReceivingCommand, scopeInput: PurchaseReceivingScope): Promise<PurchaseReceivingDecision & { replayed: boolean }> {
  const command = purchaseReceivingCommandSchema.parse(commandInput), scope = purchaseReceivingScopeSchema.parse(scopeInput), commandHash = hashBusinessPayload({ command, organizationId: scope.organizationId, actorId: scope.actorId })
  return db.$transaction(async tx => {
    await purchaseReceivingAuthority(tx,scope,command.draft.kind === "receive" ? "receive" : "resolve")
    await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${command.draft.orderId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
    const previous = await decision(tx,scope,command,commandHash); if (previous) return previous
    const preview = await previewInTx(tx,scope,command.draft)
    if (preview.revision !== command.expectedRevision) throw new ConflictError("The reviewed receiving information changed. Review the current version.")
    if (preview.requiresFreshAuth) throw new BusinessRuleError("Verify your current password before resolving the inspection.","FRESH_AUTH_REQUIRED")
    let receipt: Receipt | null
    if (command.draft.kind === "receive") {
      const { kind: _kind, orderId, ...selection } = command.draft
      const result = await receiveItems({ ...selection, purchaseOrderId: orderId, organizationId: scope.organizationId, receivedById: scope.actorId, idempotencyKey: command.idempotencyKey },scope,tx)
      if (result.replayed) throw new BusinessRuleError("An earlier receipt already uses this reference. Inspect its retained history.", "RECEIPT_EVIDENCE_REQUIRED")
      receipt = await tx.goodsReceipt.findFirst({ where: { organizationId: scope.organizationId, purchaseOrderId: orderId, idempotencyKey: command.idempotencyKey }, include: receiptInclude })
    } else {
      const { kind: _kind, orderId: _orderId, ...selection } = command.draft
      const result = await resolveGoodsReceiptInspection({ ...selection, organizationId: scope.organizationId, resolvedById: scope.actorId, idempotencyKey: command.idempotencyKey },scope,tx)
      if (result.replayed) throw new BusinessRuleError("An earlier inspection decision uses this reference. Inspect its retained history.", "RECEIPT_EVIDENCE_REQUIRED")
      receipt = await tx.goodsReceipt.findFirst({ where: { organizationId: scope.organizationId, id: command.draft.goodsReceiptId, purchaseOrderId: command.draft.orderId }, include: receiptInclude })
    }
    if (!receipt) throw new ConflictError("The receiving result could not be verified.")
    const recordedAt = new Date(), outcome = await outcomes(tx,scope.organizationId,receipt,preview.currency)
    const result = purchaseReceivingDecisionSchema.parse({ kind: command.draft.kind, orderId: command.draft.orderId, goodsReceiptId: receipt.id, receiptNumber: receipt.receiptNumber, requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, actorId: scope.actorId, recordedAt: recordedAt.toISOString(), disposition: receipt.status, quantity: preview.quantity, value: preview.value, currency: preview.currency, ...outcome })
    const event = await recordBusinessEventInTx(tx,{ organizationId:scope.organizationId,eventType:eventType(command.draft.kind),eventSource:"INTERNAL",schemaVersion:1,idempotencyKey:eventKey(command.idempotencyKey),sourceId:command.draft.orderId,actorId:scope.actorId,occurredAt:recordedAt,payload:{entityType:"GoodsReceipt",commandHash,result,receiptPayloadHash:receipt.payloadHash},outboxMessages:[] })
    await markBusinessEventAppliedInTx(tx,scope.organizationId,event.event.id)
    return {...result,replayed:false}
  },{timeout:20000})
}
