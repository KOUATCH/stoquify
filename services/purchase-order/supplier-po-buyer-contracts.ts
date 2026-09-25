import { z } from "zod"

const id = z.string().trim().min(1).max(191)
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const request = { idempotencyKey: z.string().trim().min(8).max(160), correlationId: z.string().trim().min(8).max(160) }
export const supplierPoTokenLifetime = { defaultSeconds: 7 * 86400, minSeconds: 300, maxSeconds: 30 * 86400 } as const
export const issueSupplierPoInviteInputSchema = z.object({
  purchaseOrderId: id, expectedOrderHash: hash, recipientReference: z.string().trim().max(320).nullish(),
  ttlSeconds: z.number().int().min(supplierPoTokenLifetime.minSeconds).max(supplierPoTokenLifetime.maxSeconds).optional(), ...request,
}).strict()
export const reviewSupplierPoProposalInputSchema = z.object({
  purchaseOrderId: id, proposalId: id, expectedOrderHash: hash, expectedStateHash: hash,
  decision: z.enum(["ACCEPT", "REJECT"]), reason: z.string().trim().min(3).max(500), ...request,
}).strict()
export const revokeSupplierPoInviteInputSchema = z.object({
  purchaseOrderId: id, tokenId: id, reason: z.string().trim().min(3).max(500), ...request,
}).strict()
export const supplierPoWorkbenchInputSchema = z.object({
  purchaseOrderId: id, beforeEnvelopeId: id.optional(), envelopeId: id.optional(),
  beforeTokenId: id.optional(), beforeProposalId: id.optional(),
}).strict().superRefine((value, ctx) => {
  if ((value.beforeTokenId || value.beforeProposalId) && !value.envelopeId) ctx.addIssue({ code: "custom", message: "An envelope is required for its history" })
  if (value.envelopeId && value.beforeEnvelopeId) ctx.addIssue({ code: "custom", message: "Choose an envelope or the next envelope page" })
})
export type IssueSupplierPoInviteInput = z.infer<typeof issueSupplierPoInviteInputSchema>
export type ReviewSupplierPoProposalInput = z.infer<typeof reviewSupplierPoProposalInputSchema>
export type RevokeSupplierPoInviteInput = z.infer<typeof revokeSupplierPoInviteInputSchema>
export type SupplierPoWorkbenchInput = z.infer<typeof supplierPoWorkbenchInputSchema>
