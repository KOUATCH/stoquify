import type { BusinessEvent, Prisma, SupplierPoProposal, SupplierPoProposalLine, SupplierPoProposalState } from "@prisma/client"

import { ConflictError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"

type Proposal = Pick<SupplierPoProposal, "id" | "organizationId" | "envelopeId" | "tokenId" | "businessEventId" | "proposalType" | "requestedDeliveryDate" | "supplierNote" | "noteHash" | "payloadHash" | "idempotencyKey" | "correlationId"> & {
  lines: Array<Pick<SupplierPoProposalLine, "organizationId" | "proposalId" | "purchaseOrderLineId" | "originalOrderedQuantity" | "requestedQuantity">>
  states: Array<Pick<SupplierPoProposalState, "businessEventId" | "version" | "status" | "actorId" | "reason" | "effectiveAt" | "stateHash" | "previousStateHash">>
}
export type SupplierProposalEnvelope = { id: string; purchaseOrderId: string; contentHash: string }
type Event = Pick<BusinessEvent, "id" | "organizationId" | "eventType" | "eventSource" | "schemaVersion" | "status" | "processedAt" | "idempotencyKey" | "payload" | "payloadHash" | "sourceType" | "sourceId" | "documentHash" | "actorId" | "occurredAt">
export type SupplierProposalEvents = ReadonlyMap<string, Event>

export async function loadSupplierProposalEvents(
  tx: Prisma.TransactionClient,
  organizationId: string,
  proposals: Array<Pick<Proposal, "businessEventId" | "states">>,
): Promise<SupplierProposalEvents> {
  const ids = [...new Set(proposals.flatMap(proposal => [proposal.businessEventId, ...proposal.states.map(state => state.businessEventId)]))]
  if (!ids.length) return new Map()
  const events = await tx.businessEvent.findMany({
    where: { organizationId, id: { in: ids } },
    select: { id: true, organizationId: true, eventType: true, eventSource: true, schemaVersion: true, status: true, processedAt: true, idempotencyKey: true, payload: true, payloadHash: true, sourceType: true, sourceId: true, documentHash: true, actorId: true, occurredAt: true },
  })
  return new Map(events.map(event => [event.id, event]))
}

function invalid(): never {
  throw new ConflictError("Supplier proposal content or event evidence is inconsistent. Reload the record; contact support if this persists.")
}

function quantity(value: Prisma.Decimal) {
  return value.toFixed(value.decimalPlaces() > 2 ? 3 : 2)
}

// Historical payload hashes include the supplier's original line order. Use the
// retained submission event to recover that order, never a database row order.
export function assertSupplierProposalEvidence(proposal: Proposal, envelope: SupplierProposalEnvelope, events: SupplierProposalEvents) {
  const submitted = events.get(proposal.businessEventId)
  const first = proposal.states.find(state => state.version === 1)
  if (!submitted || !first || first.businessEventId !== submitted.id || proposal.envelopeId !== envelope.id) invalid()
  const payload = submitted.payload
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.quantityChanges)) invalid()
  const lines = new Map(proposal.lines.map(line => [line.purchaseOrderLineId, line]))
  if (lines.size !== proposal.lines.length || payload.quantityChanges.length !== lines.size) invalid()
  const seen = new Set<string>()
  const quantityChanges = payload.quantityChanges.map(entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || typeof entry.purchaseOrderLineId !== "string") invalid()
    const line = lines.get(entry.purchaseOrderLineId)
    if (!line || seen.has(line.purchaseOrderLineId) || line.organizationId !== proposal.organizationId || line.proposalId !== proposal.id) invalid()
    seen.add(line.purchaseOrderLineId)
    return { purchaseOrderLineId: line.purchaseOrderLineId, originalOrderedQuantity: quantity(line.originalOrderedQuantity), requestedQuantity: quantity(line.requestedQuantity) }
  })
  const requestedDeliveryDate = proposal.requestedDeliveryDate?.toISOString() ?? null
  const payloadHash = hashBusinessPayload({
    organizationId: proposal.organizationId, envelopeId: proposal.envelopeId, envelopeContentHash: envelope.contentHash,
    tokenId: proposal.tokenId, proposalType: proposal.proposalType, requestedDeliveryDate, quantityChanges,
    note: proposal.supplierNote, idempotencyKey: proposal.idempotencyKey, correlationId: proposal.correlationId,
  })
  if (payloadHash !== proposal.payloadHash) invalid()
  for (const state of proposal.states) {
    const event = events.get(state.businessEventId)
    const submission = state.version === 1
    const decision = state.status === "BUYER_ACCEPTED" ? "ACCEPT" : "REJECT"
    const expectedPayload = submission ? {
      envelopeId: proposal.envelopeId, purchaseOrderId: envelope.purchaseOrderId, envelopeContentHash: envelope.contentHash,
      proposalType: proposal.proposalType, requestedDeliveryDate, quantityChanges, noteHash: proposal.noteHash, payloadHash,
      stateHash: state.stateHash, authoritativeMutation: false,
    } : {
      proposalId: proposal.id, envelopeId: proposal.envelopeId, purchaseOrderId: envelope.purchaseOrderId,
      proposalPayloadHash: payloadHash, decision, reason: state.reason, previousStateHash: state.previousStateHash,
      stateHash: state.stateHash, authoritativeMutation: false,
    }
    if (!event || event.organizationId !== proposal.organizationId || event.status !== "APPLIED" || !event.processedAt || event.schemaVersion !== 1 ||
      event.sourceType !== "SUPPLIER_PO_ACKNOWLEDGEMENT" || event.sourceId !== (submission ? proposal.envelopeId : proposal.id) ||
      event.eventSource !== (submission ? "API" : "INTERNAL") || event.documentHash !== envelope.contentHash ||
      event.actorId !== state.actorId || event.occurredAt.getTime() !== state.effectiveAt.getTime() ||
      event.eventType !== (submission ? "supplier.po.proposal.submitted" : decision === "ACCEPT" ? "supplier.po.proposal.buyer_accepted" : "supplier.po.proposal.buyer_rejected") ||
      (submission ? event.idempotencyKey !== "supplier-po-proposal:" + proposal.idempotencyKey : !event.idempotencyKey.startsWith("supplier-po-review:")) ||
      event.payloadHash !== hashBusinessPayload(expectedPayload) || hashBusinessPayload(event.payload) !== event.payloadHash) invalid()
  }
}
