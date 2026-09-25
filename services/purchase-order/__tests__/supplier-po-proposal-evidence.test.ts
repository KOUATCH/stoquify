import { Prisma } from "@prisma/client"

import { hashBusinessPayload } from "@/services/events/business-event.service"
import { assertSupplierProposalEvidence, loadSupplierProposalEvents, type SupplierProposalEvents } from "../supplier-po-proposal-evidence"

jest.mock("@/prisma/db", () => ({ db: {} }))

type Proposal = Parameters<typeof assertSupplierProposalEvidence>[0]
type Event = SupplierProposalEvents extends ReadonlyMap<string, infer T> ? T : never

function fixture(reviewed = false) {
  const envelope = { id: "envelope-1", purchaseOrderId: "po-1", contentHash: "f".repeat(64) }
  // Retained event order deliberately differs from the database line order.
  const quantityChanges = [
    { purchaseOrderLineId: "line-z", originalOrderedQuantity: "10.00", requestedQuantity: "8.125" },
    { purchaseOrderLineId: "line-a", originalOrderedQuantity: "4.00", requestedQuantity: "3.00" },
  ]
  const request = { organizationId: "org-1", envelopeId: envelope.id, envelopeContentHash: envelope.contentHash, tokenId: "token-1", proposalType: "REQUEST_CHANGE" as const, requestedDeliveryDate: "2026-09-10T12:00:00.000Z", quantityChanges, note: "Move the delivery and reduce these quantities.", idempotencyKey: "submission-key-1", correlationId: "correlation-1" }
  const payloadHash = hashBusinessPayload(request), noteHash = hashBusinessPayload(request.note)
  const state = { businessEventId: "event-1", version: 1, status: "SUBMITTED" as const, actorId: null, reason: null, effectiveAt: new Date("2026-09-07T12:00:00.000Z"), stateHash: "1".repeat(64), previousStateHash: null }
  const proposal: Proposal = {
    id: "proposal-1", organizationId: request.organizationId, envelopeId: envelope.id, tokenId: request.tokenId, businessEventId: state.businessEventId,
    proposalType: request.proposalType, requestedDeliveryDate: new Date(request.requestedDeliveryDate), supplierNote: request.note, noteHash, payloadHash, idempotencyKey: request.idempotencyKey, correlationId: request.correlationId,
    lines: [...quantityChanges].reverse().map(line => ({ organizationId: request.organizationId, proposalId: "proposal-1", purchaseOrderLineId: line.purchaseOrderLineId, originalOrderedQuantity: new Prisma.Decimal(line.originalOrderedQuantity), requestedQuantity: new Prisma.Decimal(line.requestedQuantity) })),
    states: [state],
  }
  const payload = { envelopeId: envelope.id, purchaseOrderId: envelope.purchaseOrderId, envelopeContentHash: envelope.contentHash, proposalType: request.proposalType, requestedDeliveryDate: request.requestedDeliveryDate, quantityChanges, noteHash, payloadHash, stateHash: state.stateHash, authoritativeMutation: false }
  const event: Event = { id: "event-1", organizationId: request.organizationId, eventType: "supplier.po.proposal.submitted", eventSource: "API", schemaVersion: 1, status: "APPLIED", processedAt: new Date(), idempotencyKey: "supplier-po-proposal:" + request.idempotencyKey, payload, payloadHash: hashBusinessPayload(payload), sourceType: "SUPPLIER_PO_ACKNOWLEDGEMENT", sourceId: envelope.id, documentHash: envelope.contentHash, actorId: null, occurredAt: state.effectiveAt }
  const events = new Map<string, Event>([[event.id, event]])
  if (reviewed) {
    const review = { businessEventId: "event-2", version: 2, status: "BUYER_ACCEPTED" as const, actorId: "buyer-1", reason: "Reviewed the changed terms.", effectiveAt: new Date("2026-09-07T13:00:00.000Z"), stateHash: "2".repeat(64), previousStateHash: state.stateHash }
    const reviewPayload = { proposalId: proposal.id, envelopeId: envelope.id, purchaseOrderId: envelope.purchaseOrderId, proposalPayloadHash: payloadHash, decision: "ACCEPT", reason: review.reason, previousStateHash: state.stateHash, stateHash: review.stateHash, authoritativeMutation: false }
    proposal.states.push(review)
    events.set(review.businessEventId, { ...event, id: review.businessEventId, eventType: "supplier.po.proposal.buyer_accepted", eventSource: "INTERNAL", actorId: review.actorId, occurredAt: review.effectiveAt, sourceId: proposal.id, idempotencyKey: "supplier-po-review:review-key-1", payload: reviewPayload, payloadHash: hashBusinessPayload(reviewPayload) })
  }
  return { proposal, envelope, event, events }
}
type Fixture = ReturnType<typeof fixture>

it("verifies a historical multi-line request using its original event order without rewriting or rounding quantities", () => {
  const x = fixture(), before = JSON.stringify(x.proposal)
  expect(() => assertSupplierProposalEvidence(x.proposal, x.envelope, x.events)).not.toThrow()
  expect(JSON.stringify(x.proposal)).toBe(before)
})

const corruptions: Array<[string, (x: Fixture) => void]> = [
  ["requested quantity", x => { x.proposal.lines[0].requestedQuantity = new Prisma.Decimal("3.001") }],
  ["original quantity", x => { x.proposal.lines[0].originalOrderedQuantity = new Prisma.Decimal("5") }],
  ["delivery date", x => { x.proposal.requestedDeliveryDate = null }],
  ["note", x => { x.proposal.supplierNote = "Different explanation" }],
  ["correlation", x => { x.proposal.correlationId += "-other" }],
  ["token", x => { x.proposal.tokenId = "token-2" }],
  ["proposal type", x => { x.proposal.proposalType = "ACCEPT" }],
  ["missing line", x => { x.proposal.lines.pop() }],
  ["duplicate line", x => { x.proposal.lines[0] = x.proposal.lines[1] }],
  ["foreign line tenant", x => { x.proposal.lines[0].organizationId = "org-2" }],
  ["foreign line owner", x => { x.proposal.lines[0].proposalId = "proposal-2" }],
  ["foreign envelope", x => { x.envelope.id = "envelope-2" }],
  ["missing event", x => { x.events.clear() }],
  ["wrong event link", x => { x.proposal.businessEventId = "event-2" }],
  ["wrong state event link", x => { x.proposal.states[0].businessEventId = "event-2" }],
  ["foreign event tenant", x => { x.event.organizationId = "org-2" }],
  ["wrong event source", x => { x.event.sourceId = "envelope-2" }],
  ["unapplied event", x => { x.event.status = "RECORDED" }],
  ["missing processed time", x => { x.event.processedAt = null }],
  ["wrong event time", x => { x.event.occurredAt = new Date(0) }],
  ["wrong event actor", x => { x.event.actorId = "buyer-1" }],
  ["wrong event digest", x => { x.event.payloadHash = "0".repeat(64) }],
  ["wrong event content", x => { x.event.payload = { unrelated: true } }],
  ["rehashed unrelated event content", x => { x.event.payload = { unrelated: true }; x.event.payloadHash = hashBusinessPayload(x.event.payload) }],
]
it.each(corruptions)("rejects inconsistent %s", (_name, change) => {
  const x = fixture(); change(x)
  expect(() => assertSupplierProposalEvidence(x.proposal, x.envelope, x.events)).toThrow(/evidence is inconsistent/)
})

it("requires the actual review event and its matching authenticated actor", () => {
  const x = fixture(true)
  expect(() => assertSupplierProposalEvidence(x.proposal, x.envelope, x.events)).not.toThrow()
  x.events.get("event-2")!.actorId = "different-buyer"
  expect(() => assertSupplierProposalEvidence(x.proposal, x.envelope, x.events)).toThrow(/evidence is inconsistent/)
})

it("loads bounded history evidence in one tenant-scoped batch and skips the query for an empty history", async () => {
  const x = fixture(true), findMany = jest.fn().mockResolvedValue([...x.events.values()])
  const tx = { businessEvent: { findMany } } as unknown as Prisma.TransactionClient
  await expect(loadSupplierProposalEvents(tx, "org-1", [])).resolves.toEqual(new Map())
  expect(findMany).not.toHaveBeenCalled()
  await expect(loadSupplierProposalEvents(tx, "org-1", [x.proposal, x.proposal])).resolves.toEqual(x.events)
  expect(findMany).toHaveBeenCalledTimes(1)
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", id: { in: ["event-1", "event-2"] } } }))
})
