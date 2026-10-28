"use server";

import { z } from "zod";

import { protect } from "@/services/_shared/protect";
import {
  recoverWorkflowAssuranceDeadLetter,
  type WorkflowAssuranceDeadLetterRecoveryResult,
} from "@/services/assurance/assurance-alert-recovery.service";

const recoverDeadLetterSchema = z.object({
  deliveryId: z.string().min(1),
  reason: z.string().trim().min(8).max(500),
  idempotencyKey: z.string().trim().min(8).max(120),
});

export type RecoverWorkflowAssuranceDeadLetterActionInput = z.input<
  typeof recoverDeadLetterSchema
>;

const recoverDeadLetter = protect<
  RecoverWorkflowAssuranceDeadLetterActionInput,
  WorkflowAssuranceDeadLetterRecoveryResult
>(
  {
    permission: "controls.manage",
    auditResource: "WorkflowAssuranceAlertDelivery",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = recoverDeadLetterSchema.parse(input);
    return recoverWorkflowAssuranceDeadLetter({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
    });
  },
);

export async function recoverWorkflowAssuranceDeadLetterAction(
  input: RecoverWorkflowAssuranceDeadLetterActionInput,
) {
  return recoverDeadLetter(input);
}
