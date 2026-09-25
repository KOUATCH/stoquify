import { z } from "zod"

import { supplierProposalCommandSchema, supplierProposalTypeSchema, supplierQuantityChangeSchema } from "./supplier-po-response-contracts"
export { issueSupplierPoInviteInputSchema, revokeSupplierPoInviteInputSchema, reviewSupplierPoProposalInputSchema } from "./supplier-po-buyer-contracts"
export type { IssueSupplierPoInviteInput, ReviewSupplierPoProposalInput, RevokeSupplierPoInviteInput } from "./supplier-po-buyer-contracts"

export const supplierPoProposalTypeSchema = supplierProposalTypeSchema

export const supplierPoQuantityChangeSchema = supplierQuantityChangeSchema

export const submitSupplierPoProposalInputSchema = supplierProposalCommandSchema.extend({
  envelopeId: z.string().trim().min(1).max(191),
  token: z.string().trim().min(1).max(4096),
  ipAddress: z.string().trim().max(200).nullish(),
  userAgent: z.string().trim().max(1000).nullish(),
}).strict()

export type SubmitSupplierPoProposalInput = z.infer<
  typeof submitSupplierPoProposalInputSchema
>
