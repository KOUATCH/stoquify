const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../../../..'),file=path.join(root,'services/purchase-order/purchase-order.service.ts');
let source=fs.readFileSync(file,'utf8');
function replaceBetween(start,end,text){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<0)throw Error('Missing anchors');source=source.slice(0,a)+text+'\n\n'+source.slice(b)}
replaceBetween('export async function deletePurchaseOrder(', 'async function assertPurchaseOrderTransition(', `export async function deletePurchaseOrder(id: string, organizationId: string, deletedById: string, request?: PurchaseLifecycleRequest & PurchaseLifecycleScope) {
  if (!request || request.actorId !== deletedById || request.organizationId !== organizationId || request.kind !== "archive") throw new BusinessRuleError("Review this archive request before confirming.", "REVIEW_REQUIRED")
  return executePurchaseOrderLifecycle(id, request, request)
}

const lifecycleTarget: Record<PurchaseLifecycleKind, PurchaseOrderStatus> = { submit: "SUBMITTED", cancel: "CANCELLED", complete: "COMPLETED", archive: "CANCELLED" }

async function lifecycleEvidence(tx: Prisma.TransactionClient, po: POWithRelations) {
  const record = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: po.id, organizationId: po.organizationId }, select: {
    _count: { select: { goodsReceipts: true, payments: true, supplierInvoices: true, threeWayMatches: true, acknowledgementEnvelopes: true, purchaseReturns: true, supplierCreditNotes: true } },
    goodsReceipts: { orderBy: { id: "asc" }, select: { id: true, status: true, deletedAt: true, finalizedAt: true, inventoryPostedAt: true, updatedAt: true } },
  } })
  return { counts: record._count, receipts: record.goodsReceipts.map(receipt => ({ ...receipt, deletedAt: receipt.deletedAt?.toISOString() ?? null, finalizedAt: receipt.finalizedAt?.toISOString() ?? null, inventoryPostedAt: receipt.inventoryPostedAt?.toISOString() ?? null, updatedAt: receipt.updatedAt.toISOString() })) }
}
type LifecycleEvidence = Awaited<ReturnType<typeof lifecycleEvidence>>
const lifecycleRevision = (po: POWithRelations, evidence: LifecycleEvidence) => hashBusinessPayload({ version: 1, order: purchaseApprovalSnapshot(po), evidence })
async function assertLifecycleReady(tx: Prisma.TransactionClient, po: POWithRelations, kind: PurchaseLifecycleKind, evidence: LifecycleEvidence) {
  if (kind === "archive") {
    if (!canArchivePurchaseOrderStatus(po.status)) throw new BusinessRuleError("Cancel a submitted or approved order explicitly before reviewing archive.", "ARCHIVE_STATUS")
    if (Object.values(evidence.counts).some(count => count > 0) || po.lines.some(line => new Prisma.Decimal(line.receivedQuantity).gt(0))) throw new BusinessRuleError("Keep this order available: linked receiving, supplier or financial records require retained access.", "RETAINED_OBLIGATIONS")
  } else {
    await assertPurchaseOrderTransition(tx, po, po.organizationId, lifecycleTarget[kind])
    if ((kind === "cancel" || kind === "complete") && evidence.receipts.some(receipt => !receipt.deletedAt && ["DRAFT", "HELD"].includes(receipt.status))) throw new BusinessRuleError("Resolve draft or held goods receipts before changing the order lifecycle.", "OPEN_RECEIPT")
    if (kind === "submit") {
      await assertModuleNewWorkInTx(tx, { organizationId: po.organizationId, moduleSlug: "purchasing", operation: "purchasing.order.submit" })
      const [supplier, location, items] = await Promise.all([
        tx.supplier.findFirst({ where: { id: po.supplierId, organizationId: po.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
        tx.location.findFirst({ where: { id: po.locationId, organizationId: po.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
        tx.item.findMany({ where: { id: { in: po.lines.map(line => line.itemId) }, organizationId: po.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
      ])
      if (!supplier || !location || new Set(items.map(item => item.id)).size !== new Set(po.lines.map(line => line.itemId)).size) throw new BusinessRuleError("Review the supplier, location and items: one or more are no longer available.", "REFERENCE_UNAVAILABLE")
    }
  }
}

export async function getPurchaseOrderLifecyclePreview(id: string, scopeInput: PurchaseLifecycleScope, kindInput: PurchaseLifecycleKind): Promise<PurchaseLifecyclePreview> {
  const scope = purchaseLifecycleScopeSchema.parse(scopeInput), kind = purchaseLifecycleKindSchema.parse(kindInput)
  return db.$transaction(async tx => {
    const authority = await purchaseLifecycleAuthority(tx, scope, kind)
    const po = await lockedPurchaseOrder(tx, id, scope.organizationId), evidence = await lifecycleEvidence(tx, po)
    await assertLifecycleReady(tx, po, kind, evidence)
    const organization = await tx.organization.findUniqueOrThrow({ where: { id: scope.organizationId }, select: { currency: true } })
    return { organizationId: scope.organizationId, actorId: scope.actorId, orderId: id, orderNumber: po.orderNumber, kind, revision: lifecycleRevision(po, evidence), status: po.status,
      supplier: po.supplier.name, location: po.location.name, currency: organization.currency, total: po.total.toString(), notes: po.notes, requiresFreshAuth: authority.requiresFreshAuth,
      linkedRecords: Object.values(evidence.counts).reduce((sum, count) => sum + count, 0), heldReceipts: evidence.receipts.filter(receipt => !receipt.deletedAt && receipt.status === "HELD").length,
      lines: po.lines.map(line => ({ id: line.id, nameEn: line.item.nameEn, nameFr: line.item.nameFr ?? line.item.nameEn, ordered: line.orderedQuantity.toString(), received: line.receivedQuantity.toString(), total: line.lineTotal.toString() })) }
  }, { isolationLevel: "ReadCommitted", timeout: 15000 })
}

export async function executePurchaseOrderLifecycle(id: string, scopeInput: PurchaseLifecycleScope, requestInput: PurchaseLifecycleRequest) {
  const scope = purchaseLifecycleScopeSchema.parse(scopeInput), request = purchaseLifecycleRequestSchema.parse(requestInput)
  const commandHash = hashBusinessPayload({ id, ...scope, sessionId: undefined, sessionToken: undefined, ...request, idempotencyKey: undefined })
  return db.$transaction(async tx => {
    await purchaseLifecycleAuthority(tx, scope, request.kind)
    const replay = await replayPurchaseLifecycle(tx, id, scope, request.kind, request.idempotencyKey, commandHash)
    if (replay) return { id, lifecycleReceipt: replay }
    // Lock retained rows as well so a concurrent archive can still recover its exact receipt.
    await tx.$queryRaw\`SELECT id FROM purchase_orders WHERE id = \$\{id\} AND "organizationId" = \$\{scope.organizationId\} FOR UPDATE\`
    const concurrentReplay = await replayPurchaseLifecycle(tx, id, scope, request.kind, request.idempotencyKey, commandHash)
    if (concurrentReplay) return { id, lifecycleReceipt: concurrentReplay }
    const po = await tx.purchaseOrder.findFirst({ where: { id, organizationId: scope.organizationId, deletedAt: null }, include: standardInclude })
    if (!po) throw new NotFoundError("Purchase order not found")
    const evidence = await lifecycleEvidence(tx, po)
    if (lifecycleRevision(po, evidence) !== request.expectedRevision) throw new ConflictError("The order or its linked records changed after review. Review the current record.")
    await assertLifecycleReady(tx, po, request.kind, evidence)
    if ((await purchaseLifecycleAuthority(tx, scope, request.kind)).requiresFreshAuth) throw new BusinessRuleError("Verify your current password before cancelling or archiving.", "FRESH_AUTH_REQUIRED")
    const recordedAt = new Date(Math.max(Date.now(), po.updatedAt.getTime() + 1)), toStatus = lifecycleTarget[request.kind]
    await tx.purchaseOrder.update({ where: { id, organizationId: scope.organizationId, deletedAt: null, status: po.status }, data: {
      status: toStatus, updatedAt: recordedAt, deletedAt: request.kind === "archive" ? recordedAt : undefined,
      // The reason belongs to the immutable decision evidence; original order notes remain intact.
    } })
    const result = { requestReference: request.idempotencyKey, orderId: id, kind: request.kind, reviewedRevision: request.expectedRevision, actorId: scope.actorId, recordedAt: recordedAt.toISOString(), fromStatus: po.status, toStatus, archived: request.kind === "archive" }
    const event = await recordBusinessEventInTx(tx, { organizationId: scope.organizationId, eventType: purchaseLifecycleEventType(request.kind), eventSource: "INTERNAL", schemaVersion: 1,
      idempotencyKey: purchaseLifecycleEventKey(request.idempotencyKey), sourceId: id, actorId: scope.actorId, occurredAt: recordedAt,
      payload: { entityType: "PurchaseOrder", commandHash, reason: request.reason ?? null, result }, outboxMessages: [] })
    await tx.auditLog.create({ data: { organizationId: scope.organizationId, userId: scope.actorId, entityType: "PurchaseOrder", entityId: id,
      action: ({ submit: "SUBMIT_PURCHASE_ORDER", cancel: "CANCEL_PURCHASE_ORDER", complete: "COMPLETE_PURCHASE_ORDER", archive: "ARCHIVE_PURCHASE_ORDER" })[request.kind],
      changes: { before: purchaseApprovalSnapshot(po), evidence, reason: request.reason ?? null, after: result, eventId: event.event.id } as Prisma.InputJsonValue,
    } })
    await markBusinessEventAppliedInTx(tx, scope.organizationId, event.event.id)
    return { id, lifecycleReceipt: { ...result, replayed: false } }
  }, { isolationLevel: "ReadCommitted", timeout: 15000 })
}`);
replaceBetween('export async function submitPurchaseOrder(', 'export async function getPurchaseOrderApprovalPreview(', `export async function submitPurchaseOrder(id: string, organizationId: string, request?: PurchaseLifecycleRequest & PurchaseLifecycleScope) {
  if (!request || request.organizationId !== organizationId || request.kind !== "submit") throw new BusinessRuleError("Review this submission before confirming.", "REVIEW_REQUIRED")
  return executePurchaseOrderLifecycle(id, request, request)
}`);
replaceBetween('export async function cancelPurchaseOrder(', '// ── Receive items', `export async function cancelPurchaseOrder(id: string, organizationId: string, reason?: string, request?: PurchaseLifecycleRequest & PurchaseLifecycleScope) {
  if (!request || request.organizationId !== organizationId || request.kind !== "cancel" || request.reason !== reason) throw new BusinessRuleError("Review this cancellation before confirming.", "REVIEW_REQUIRED")
  return executePurchaseOrderLifecycle(id, request, request)
}

export async function closePurchaseOrder(id: string, organizationId: string, request?: PurchaseLifecycleRequest & PurchaseLifecycleScope) {
  if (!request || request.organizationId !== organizationId || request.kind !== "complete") throw new BusinessRuleError("Review this completion before confirming.", "REVIEW_REQUIRED")
  return executePurchaseOrderLifecycle(id, request, request)
}`);
fs.writeFileSync(file,source);
