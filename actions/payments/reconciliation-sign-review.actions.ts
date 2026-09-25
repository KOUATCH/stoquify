"use server"

import { protect } from "@/services/_shared/protect"
import { reconciliationSignReviewSchema, reconciliationReviewedSignSchema } from "@/services/reconciliation/reconciliation-sign-review.contracts"
import { previewReconciliationSignOff } from "@/services/reconciliation/payment-reconciliation-certification.service"
import { signReconciliationRunAction } from "./reconciliation.actions"

const preview = protect({ permission: "payments.reconciliation.sign", auditResource: "ReconciliationSignReview",
  module: { moduleSlug: "payment_reconciliation", surface: "actions/payments/reconciliation-sign-review.actions.ts", surfaceType: "action", accessIntent: "read", mode: "enforce", audit: false } },
async (input: unknown, ctx) => ({ ...await previewReconciliationSignOff({ ...reconciliationSignReviewSchema.parse(input), organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions }),
  scope: { organizationId: ctx.orgId, actorId: ctx.userId } }))

export async function previewReconciliationSignOffAction(input: unknown) { return preview(input) }
// Reuse the canonical fresh-auth, module-write and maker/checker enforcement.
export async function signReviewedReconciliationAction(input: unknown) { return signReconciliationRunAction(reconciliationReviewedSignSchema.parse(input)) }
