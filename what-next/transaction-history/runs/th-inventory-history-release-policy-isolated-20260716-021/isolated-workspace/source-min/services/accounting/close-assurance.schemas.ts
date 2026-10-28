import {
  AccountantReviewStatus,
  CloseFindingStatus,
} from "@prisma/client"
import { z } from "zod"

import { BusinessRuleError } from "@/services/_shared/action-errors"

const idSchema = z.string().trim().min(1)
const optionalCorrelationIdSchema = z.string().trim().min(1).max(128).optional()

export const closeAssurancePeriodInputSchema = z.object({
  periodId: idSchema,
  correlationId: optionalCorrelationIdSchema,
})

export const closeAssuranceDashboardInputSchema = z
  .object({
    periodId: idSchema.optional(),
  })
  .optional()

export const closeEvidenceGraphInputSchema = z.object({
  periodId: idSchema.optional(),
  closeRunId: idSchema.optional(),
  findingId: idSchema.optional(),
})

export const assignCloseFindingInputSchema = z.object({
  findingId: idSchema,
  assignedToId: idSchema.optional(),
  correlationId: optionalCorrelationIdSchema,
})

export const commentOnCloseFindingInputSchema = z.object({
  closeRunId: idSchema.optional(),
  findingId: idSchema.optional(),
  evidenceItemId: idSchema.optional(),
  reviewId: idSchema.optional(),
  body: z.string().trim().min(3).max(4000),
  correlationId: optionalCorrelationIdSchema,
})

export const requestCloseWaiverInputSchema = z.object({
  findingId: idSchema,
  reason: z.string().trim().min(10).max(4000),
  correlationId: optionalCorrelationIdSchema,
})

export const approveCloseWaiverInputSchema = z.object({
  findingId: idSchema,
  correlationId: optionalCorrelationIdSchema,
})

export const updateAccountantReviewInputSchema = z.object({
  closeRunId: idSchema,
  status: z.nativeEnum(AccountantReviewStatus),
  decisionNotes: z.string().trim().max(4000).optional(),
  correlationId: optionalCorrelationIdSchema,
})

export const exportClosePackInputSchema = z.object({
  closeRunId: idSchema,
  mode: z.enum(["DRAFT_NOT_CERTIFIED", "CERTIFIED"]).default("DRAFT_NOT_CERTIFIED"),
  correlationId: optionalCorrelationIdSchema,
})

export type CloseAssurancePeriodInput = z.infer<typeof closeAssurancePeriodInputSchema>
export type CloseAssuranceDashboardInput = z.infer<typeof closeAssuranceDashboardInputSchema>
export type CloseEvidenceGraphInput = z.infer<typeof closeEvidenceGraphInputSchema>
export type AssignCloseFindingInput = z.infer<typeof assignCloseFindingInputSchema>
export type CommentOnCloseFindingInput = z.infer<typeof commentOnCloseFindingInputSchema>
export type RequestCloseWaiverInput = z.infer<typeof requestCloseWaiverInputSchema>
export type ApproveCloseWaiverInput = z.infer<typeof approveCloseWaiverInputSchema>
export type UpdateAccountantReviewInput = z.infer<typeof updateAccountantReviewInputSchema>
export type ExportClosePackInput = z.infer<typeof exportClosePackInputSchema>

export type CloseAssuranceErrorCode =
  | "CloseBlocked"
  | "CloseRunNotFound"
  | "EvidenceMissing"
  | "OpenSuspenseBlocksClose"
  | "UnsignedReconciliationBlocksClose"
  | "UnresolvedExceptionBlocksClose"
  | "SoDViolation"
  | "FreshAuthRequired"
  | "RecertificationRequired"

export class CloseAssuranceError extends BusinessRuleError {
  constructor(
    public readonly closeCode: CloseAssuranceErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "CloseAssuranceError"
  }
}

export function assertFindingCanReceiveComment(status: CloseFindingStatus) {
  if (status === CloseFindingStatus.RESOLVED || status === CloseFindingStatus.WAIVED_WITH_APPROVAL) {
    throw new CloseAssuranceError("RecertificationRequired", "Resolved or waived close findings require a new run before further comments.")
  }
}
