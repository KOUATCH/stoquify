import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { purchaseApprovalAuthority, purchaseApprovalScopeSchema, purchaseApprovalSnapshot, type PurchaseApprovalScope } from "./purchase-order-approval"
import { buildEnvelopePayload, proposalResult } from "./supplier-po-acknowledgement.service"
import { loadSupplierProposalEvents } from "./supplier-po-proposal-evidence"
import { purchaseAmendmentCommandSchema, purchaseAmendmentQuerySchema, purchaseAmendmentReceiptSchema, type PurchaseAmendmentCommand, type PurchaseAmendmentPreview, type PurchaseAmendmentReceipt } from "./purchase-order-amendment-contracts"
import { purchaseAmendmentEventKey as key, readPurchaseAmendmentEvent } from "./purchase-order-amendment-record"

const money = (value: Prisma.Decimal) => value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
function boundedMoney(value: Prisma.Decimal) {
  if (!value.isFinite() || value.lt(0) || value.gt("999999999999.99")) throw new BusinessRuleError("The amended amount is outside the supported range.")
  return money(value)
}
async function receiptInTx(tx: Prisma.TransactionClient, organizationId: string, orderId: string, proposalId: string) {
  const event = await tx.businessEvent.findUnique({ where: { organizationId_eventSource_idempotencyKey: { organizationId, eventSource: "INTERNAL", idempotencyKey: key(proposalId) } } })
  if (!event) return null
  return readPurchaseAmendmentEvent(event, organizationId, orderId, proposalId)
}
async function reviewedInTx(tx: Prisma.TransactionClient, scope: PurchaseApprovalScope, orderId: string, proposalId: string) {
  await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${orderId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  const order = await tx.purchaseOrder.findFirst({ where: { id: orderId, organizationId: scope.organizationId, deletedAt: null }, include: {
    supplier: true, location: true, organization: true, lines: { include: { item: true }, orderBy: { createdAt: "asc" } },
    goodsReceipts: { where: { deletedAt: null }, include: { lines: true }, orderBy: { id: "asc" } },
  } })
  if (!order) throw new NotFoundError("Purchase order not found")
  await tx.$queryRaw`SELECT id FROM supplier_po_proposals WHERE id = ${proposalId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
  const proposal = await tx.supplierPoProposal.findFirst({ where: { id: proposalId, organizationId: scope.organizationId, envelope: { organizationId: scope.organizationId, purchaseOrderId: orderId } }, include: { envelope: true, lines: true, states: { orderBy: { version: "asc" } } } })
  if (!proposal) throw new NotFoundError("Supplier proposal not found")
  if (hashBusinessPayload(proposal.envelope.payload) !== proposal.envelope.contentHash) throw new ConflictError("The supplier snapshot could not be verified.")
  const verified = proposalResult(proposal, false, proposal.envelope, await loadSupplierProposalEvents(tx, scope.organizationId, [proposal]))
  const accepted = proposal.states[proposal.states.length - 1]
  if (verified.status !== "BUYER_ACCEPTED" || proposal.proposalType !== "REQUEST_CHANGE" || !accepted.actorId) throw new BusinessRuleError("An accepted supplier change is required before amending the order.")
  const invoiceLines = await tx.supplierInvoiceLine.findMany({ where: { purchaseOrderLineId: { in: order.lines.map(line => line.id) }, supplierInvoice: { organizationId: scope.organizationId, deletedAt: null } }, select: { id: true, purchaseOrderLineId: true, quantity: true }, orderBy: { id: "asc" } })
  const prior = await receiptInTx(tx, scope.organizationId, orderId, proposalId)
  const currentPayload = buildEnvelopePayload(order)
  // Receiving changes status, not the supplier-agreed commercial basis. All
  // displayed contract fields and line identities must otherwise still match.
  const contractHash = (value: typeof currentPayload) => hashBusinessPayload({ ...value, purchaseOrder: { ...value.purchaseOrder, status: "APPROVED" }, lines: [...value.lines].sort((a,b) => a.purchaseOrderLineId.localeCompare(b.purchaseOrderLineId)) })
  if (!prior && contractHash(currentPayload) !== contractHash(proposal.envelope.payload as unknown as typeof currentPayload)) throw new ConflictError("The order terms changed since the supplier proposal. Obtain a proposal for the current order.")
  if (!prior && (!["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(order.status) || !order.supplier.isActive || order.supplier.deletedAt || !order.location.isActive || order.location.deletedAt)) throw new BusinessRuleError("This order is no longer available for amendment.")
  if (!prior && (!order.createdById || [accepted.actorId, order.createdById].includes(scope.actorId))) throw new BusinessRuleError("The amendment needs an approver different from the requester and the buyer who accepted the proposal.", "SOD_VIOLATION")
  if (!prior && order.goodsReceipts.some(r => r.status === "DRAFT" || r.status === "HELD")) throw new BusinessRuleError("Resolve open receiving or inspection before amending the order.", "OPEN_RECEIPT")
  const lines = order.lines.map(line => {
    const change = proposal.lines.find(value => value.purchaseOrderLineId === line.id)
    const quantity = prior ? line.orderedQuantity : change?.requestedQuantity ?? line.orderedQuantity
    const invoiced = invoiceLines.filter(value => value.purchaseOrderLineId === line.id).reduce((sum,value) => sum.plus(value.quantity), new Prisma.Decimal(0))
    const receipts = order.goodsReceipts.filter(r => r.status === "RECEIVED").flatMap(r => r.lines).filter(value => value.purchaseOrderLineId === line.id).reduce((sum,value) => sum.plus(value.receivedQuantity), new Prisma.Decimal(0))
    if (!prior && (quantity.lt(line.receivedQuantity) || quantity.lt(receipts) || quantity.lt(invoiced))) throw new BusinessRuleError("The amended quantity cannot be less than received or invoiced obligations.", "RETAINED_OBLIGATIONS")
    if (!prior && (!line.item.isActive || line.item.deletedAt)) throw new BusinessRuleError("An item on this order is no longer available.")
    const base = boundedMoney(quantity.mul(line.unitCost)), taxable = boundedMoney(base.minus(line.discount))
    // Preserve the existing purchase-order tax convention; no statutory rule is introduced here.
    const taxAmount = change && !prior ? boundedMoney(base.mul(line.taxRate).div(100)) : line.taxAmount
    const lineTotal = change && !prior ? boundedMoney(taxable.plus(taxAmount)) : line.lineTotal
    return { line, quantity, base, taxAmount, lineTotal }
  })
  if (!prior && proposal.lines.some(change => !lines.some(value => value.line.id === change.purchaseOrderLineId))) throw new ConflictError("A proposed line no longer exists on this order.")
  const sum = (field: "base" | "taxAmount" | "lineTotal") => boundedMoney(lines.reduce((total,line) => total.plus(line[field]), new Prisma.Decimal(0)))
  const subtotal = sum("base"), taxAmount = sum("taxAmount"), discount = boundedMoney(lines.reduce((total,value) => total.plus(value.line.discount), new Prisma.Decimal(0)))
  const total = boundedMoney(subtotal.plus(taxAmount).minus(discount).plus(order.shippingCost))
  const expectedDeliveryDate = proposal.requestedDeliveryDate ?? order.expectedDeliveryDate
  if (!prior && !proposal.lines.length && expectedDeliveryDate?.getTime() === order.expectedDeliveryDate?.getTime()) throw new BusinessRuleError("This proposal does not change the order.")
  const evidence = { order: purchaseApprovalSnapshot(order), currency: order.organization.currency, contract: currentPayload, proposalId, stateHash: accepted.stateHash,
    receipts: order.goodsReceipts.map(r => ({ id:r.id,status:r.status,updatedAt:r.updatedAt.toISOString(),lines:r.lines.map(l => ({id:l.id,quantity:l.receivedQuantity.toString()})).sort((a,b)=>a.id.localeCompare(b.id)) })), invoiceLines: invoiceLines.map(l=>({...l,quantity:l.quantity.toString()})) }
  return { order, proposal, accepted, prior, lines, subtotal, taxAmount, discount, total, expectedDeliveryDate, revision: hashBusinessPayload(evidence) }
}

export async function getPurchaseOrderAmendmentPreview(query: { orderId: string; proposalId: string }, scopeInput: PurchaseApprovalScope): Promise<PurchaseAmendmentPreview> {
  const scope = purchaseApprovalScopeSchema.parse(scopeInput), input = purchaseAmendmentQuerySchema.parse(query)
  return db.$transaction(async tx => {
    const authority = await purchaseApprovalAuthority(tx, scope), r = await reviewedInTx(tx, scope, input.orderId, input.proposalId)
    return { organizationId: scope.organizationId, actorId: scope.actorId, orderId:r.order.id,orderNumber:r.order.orderNumber,proposalId:r.proposal.id,revision:r.revision,supplier:r.order.supplier.name,currency:r.order.organization.currency,acceptedById:r.accepted.actorId!,acceptedAt:r.accepted.effectiveAt.toISOString(),reason:r.accepted.reason!,
      beforeDate:r.order.expectedDeliveryDate?.toISOString()??null,afterDate:r.expectedDeliveryDate?.toISOString()??null,beforeTotal:r.order.total.toString(),afterTotal:r.total.toString(),requiresFreshAuth:!authority.fresh,receipt:r.prior?{...r.prior.result,replayed:true}:null,
      lines:r.lines.map(({line,quantity,lineTotal})=>({id:line.id,nameEn:line.item.nameEn,nameFr:line.item.nameFr??line.item.nameEn,beforeQuantity:line.orderedQuantity.toString(),afterQuantity:quantity.toString(),receivedQuantity:line.receivedQuantity.toString(),unitCost:line.unitCost.toString(),beforeTotal:line.lineTotal.toString(),afterTotal:lineTotal.toString()})) }
  }, { timeout: 15000 })
}

export async function applyPurchaseOrderAmendment(commandInput: PurchaseAmendmentCommand, scopeInput: PurchaseApprovalScope): Promise<PurchaseAmendmentReceipt> {
  const input = purchaseAmendmentCommandSchema.parse(commandInput), scope = purchaseApprovalScopeSchema.parse(scopeInput)
  const commandHash = hashBusinessPayload({ ...input, organizationId:scope.organizationId, actorId:scope.actorId })
  return db.$transaction(async tx => {
    await purchaseApprovalAuthority(tx, scope)
    const replay = async () => { const prior = await receiptInTx(tx,scope.organizationId,input.orderId,input.proposalId);if(!prior)return null;if(prior.commandHash!==commandHash)throw new IdempotencyConflictError("This proposal was applied through another request. Read its recorded amendment.");return {...prior.result,replayed:true} }
    const previous = await replay(); if(previous)return previous
    await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id = ${input.orderId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
    const concurrent = await replay(); if(concurrent)return concurrent
    const r = await reviewedInTx(tx,scope,input.orderId,input.proposalId)
    if(r.revision!==input.expectedRevision)throw new ConflictError("The order or its obligations changed after review. Reload and compare the current amendment.")
    if(!(await purchaseApprovalAuthority(tx,scope)).fresh)throw new BusinessRuleError("Verify your current password before applying the amendment.","FRESH_AUTH_REQUIRED")
    const now = new Date(), allReceived=r.lines.every(l=>l.line.receivedQuantity.gte(l.quantity)),someReceived=r.lines.some(l=>l.line.receivedQuantity.gt(0))
    const status = allReceived ? "RECEIVED" : someReceived ? "PARTIALLY_RECEIVED" : "APPROVED"
    for(const l of r.lines)if(!l.quantity.eq(l.line.orderedQuantity))await tx.purchaseOrderLine.update({where:{id:l.line.id,purchaseOrderId:r.order.id},data:{orderedQuantity:l.quantity,taxAmount:l.taxAmount,lineTotal:l.lineTotal}})
    await tx.purchaseOrder.update({where:{id:r.order.id,organizationId:scope.organizationId},data:{expectedDeliveryDate:r.expectedDeliveryDate,subtotal:r.subtotal,taxAmount:r.taxAmount,discount:r.discount,total:r.total,status,approvedAt:now,approvedById:scope.actorId}})
    const result=purchaseAmendmentReceiptSchema.parse({requestReference:input.idempotencyKey,orderId:r.order.id,proposalId:r.proposal.id,reviewedRevision:input.expectedRevision,approvedById:scope.actorId,approvedAt:now.toISOString(),acceptedById:r.accepted.actorId,proposalStateHash:r.accepted.stateHash,total:r.total.toString(),status})
    const event=await recordBusinessEventInTx(tx,{organizationId:scope.organizationId,eventType:"purchase_order.amended",eventSource:"INTERNAL",schemaVersion:1,idempotencyKey:key(r.proposal.id),sourceId:r.order.id,actorId:scope.actorId,occurredAt:now,payload:{entityType:"PurchaseOrder",commandHash,result,before:purchaseApprovalSnapshot(r.order),proposalPayloadHash:r.proposal.payloadHash,after:{expectedDeliveryDate:r.expectedDeliveryDate?.toISOString()??null,lines:r.lines.map(l=>({id:l.line.id,quantity:l.quantity.toString(),taxAmount:l.taxAmount.toString(),total:l.lineTotal.toString()}))}},outboxMessages:[]})
    await tx.auditLog.create({data:{organizationId:scope.organizationId,userId:scope.actorId,entityType:"PurchaseOrder",entityId:r.order.id,action:"AMEND_PURCHASE_ORDER",changes:{before:purchaseApprovalSnapshot(r.order),after:result,eventId:event.event.id}}})
    await markBusinessEventAppliedInTx(tx,scope.organizationId,event.event.id)
    return {...result,replayed:false}
  }, { timeout:15000 })
}
