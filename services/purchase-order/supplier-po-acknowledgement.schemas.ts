import { z } from "zod"

import { supplierPoTokenLifetime } from "./supplier-po-access-token"

const boundedKey = z.string().trim().min(8).max(160)
const boundedReason = z.string().trim().min(3).max(500)

export const issueSupplierPoInviteInputSchema = z.object({
  purchaseOrderId: z.string().trim().min(1),
  recipientReference: z.string().trim().max(320).nullish(),
  ttlSeconds: z.number().int()
    .min(supplierPoTokenLifetime.minSeconds)
    .max(supplierPoTokenLifetime.maxSeconds)
    .optional(),
  idempotencyKey: boundedKey,
  correlationId: boundedKey,
})

export const revokeSupplierPoInviteInputSchema = z.object({
  tokenId: z.string().trim().min(1),
  reason: boundedReason,
})

export const supplierPoProposalTypeSchema = z.enum([
  "ACCEPT",
  "REJECT",
  "REQUEST_CHANGE",
])

export const supplierPoQuantityChangeSchema = z.object({
  purchaseOrderLineId: z.string().trim().min(1),
  requestedQuantity: z.coerce.number().positive().max(999_999_999),
})

export const submitSupplierPoProposalInputSchema = z.object({
  envelopeId: z.string().trim().min(1),
  token: z.string().trim().min(1),
  proposalType: supplierPoProposalTypeSchema,
  requestedDeliveryDate: z.string().trim().nullish(),
  quantityChanges: z.array(supplierPoQuantityChangeSchema).max(250).default([]),
  note: z.string().trim().max(500).nullish(),
  idempotencyKey: boundedKey,
  correlationId: boundedKey,
  ipAddress: z.string().trim().max(200).nullish(),
  userAgent: z.string().trim().max(1000).nullish(),
})

export const reviewSupplierPoProposalInputSchema = z.object({
  proposalId: z.string().trim().min(1),
  decision: z.enum(["ACCEPT", "REJECT"]),
  reason: boundedReason,
  idempotencyKey: boundedKey,
  correlationId: boundedKey,
})

export type IssueSupplierPoInviteInput = z.infer<
  typeof issueSupplierPoInviteInputSchema
>
export type SubmitSupplierPoProposalInput = z.infer<
  typeof submitSupplierPoProposalInputSchema
>
export type ReviewSupplierPoProposalInput = z.infer<
  typeof reviewSupplierPoProposalInputSchema
>
