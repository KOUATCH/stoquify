import { z } from "zod"

const requiredId = z.string().trim().min(1)

export const reverseStockAdjustmentInputSchema = z.object({
  organizationId: requiredId,
  originalAdjustmentId: requiredId,
  requestedById: requiredId,
  approvedById: requiredId,
  reason: z.string().trim().min(1).max(500),
  effectiveAt: z.date(),
  idempotencyKey: z.string().trim().min(8).max(200),
  correlationId: z.string().trim().min(1).max(200).optional(),
}).superRefine((input, context) => {
  if (input.requestedById === input.approvedById) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["approvedById"],
      message: "The correction requester and approver must be different users.",
    })
  }
})

export type ReverseStockAdjustmentInput = z.input<typeof reverseStockAdjustmentInputSchema>
export type ParsedReverseStockAdjustmentInput = z.output<typeof reverseStockAdjustmentInputSchema>
