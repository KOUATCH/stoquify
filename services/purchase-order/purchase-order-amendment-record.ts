import type { BusinessEvent } from "@prisma/client"
import { ConflictError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { purchaseAmendmentReceiptSchema } from "./purchase-order-amendment-contracts"

export const purchaseAmendmentEventKey = (proposalId: string) => `purchase-order-amendment:${proposalId}`
export function readPurchaseAmendmentEvent(event: BusinessEvent, organizationId: string, orderId: string, proposalId: string) {
  const payload = event.payload as Record<string, unknown> | null, parsed = purchaseAmendmentReceiptSchema.safeParse(payload?.result)
  if(payload?.entityType!=="PurchaseOrder"||typeof payload.commandHash!=="string"||!/^[a-f0-9]{64}$/.test(payload.commandHash))throw new ConflictError("The amendment request binding could not be verified.")
  if(event.organizationId!==organizationId||event.eventSource!=="INTERNAL"||event.idempotencyKey!==purchaseAmendmentEventKey(proposalId)||event.eventType!=="purchase_order.amended"||event.schemaVersion!==1||event.sourceType!==null||event.sourceId!==orderId||event.status!=="APPLIED"||!event.processedAt||event.payloadHash!==hashBusinessPayload(event.payload)||!parsed.success||parsed.data.orderId!==orderId||parsed.data.proposalId!==proposalId||parsed.data.approvedById!==event.actorId||parsed.data.approvedAt!==event.occurredAt.toISOString())throw new ConflictError("The amendment evidence could not be verified.")
  return {result:parsed.data,commandHash:payload?.commandHash}
}
