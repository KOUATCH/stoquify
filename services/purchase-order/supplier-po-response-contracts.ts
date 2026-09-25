import { z } from "zod"

const id = z.string().trim().min(1).max(191)
const quantityText = /^(?:\d{1,9}(?:\.\d{1,3})?|\.\d{1,3})$/
export const supplierRequestedQuantitySchema = z.union([
  z.string().trim().regex(quantityText),
  z.number().finite().refine(value => quantityText.test(String(value))),
]).transform(Number).pipe(z.number().positive().max(999_999_999))
export const supplierProposalTypeSchema = z.enum(["ACCEPT", "REJECT", "REQUEST_CHANGE"])
export const supplierQuantityChangeSchema = z.object({ purchaseOrderLineId: id, requestedQuantity: supplierRequestedQuantitySchema }).strict()
const requestedDate = z.union([z.string().date(), z.string().datetime({ offset: true })])
export const supplierProposalCommandSchema = z.object({
  proposalType: supplierProposalTypeSchema,
  requestedDeliveryDate: requestedDate.nullish(),
  quantityChanges: z.array(supplierQuantityChangeSchema).max(250).default([]),
  note: z.string().trim().min(3).max(500).nullish(),
  idempotencyKey: z.string().trim().min(8).max(160),
  correlationId: z.string().trim().min(8).max(160),
}).strict()
export type SupplierProposalCommand = z.infer<typeof supplierProposalCommandSchema>

export function matchesSupplierProposal(value: unknown, command: SupplierProposalCommand, envelopeId: string) {
  if (!value || typeof value !== "object") return false
  const receipt = value as Record<string, unknown>
  return receipt.envelopeId === envelopeId && receipt.requestReference === command.idempotencyKey && receipt.correlationReference === command.correlationId &&
    receipt.proposalType === command.proposalType && typeof receipt.proposalId === "string" && receipt.proposalId.length > 0 &&
    ["SUBMITTED", "BUYER_ACCEPTED", "BUYER_REJECTED"].includes(String(receipt.status)) &&
    typeof receipt.stateHash === "string" && /^[a-f0-9]{64}$/.test(receipt.stateHash) && receipt.authoritativeMutation === false
}
