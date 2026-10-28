"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import { runWorkflowAssuranceRegistry } from "@/services/assurance/assurance-registry.service"
import type { WorkflowAssuranceRegistryRunOutput } from "@/services/assurance/assurance-registry-contracts"

const manualWorkflowAssuranceInputSchema = z.object({
  checkKey: z.string().min(3).max(160).optional(),
  periodId: z.string().min(1).optional(),
  locationId: z.string().min(1).optional(),
  sourceType: z.string().min(1).max(120).optional(),
  sourceId: z.string().min(1).max(160).optional(),
})

export type ManualWorkflowAssuranceInput = z.input<typeof manualWorkflowAssuranceInputSchema>

const runManualWorkflowAssurance = protect<ManualWorkflowAssuranceInput | undefined, WorkflowAssuranceRegistryRunOutput>(
  {
    permission: "controls.audit.read",
    auditResource: "WorkflowAssuranceCheckRun",
    auditAllowed: true,
    tenantGuard: false,
  },
  async (input, ctx) => {
    const parsed = manualWorkflowAssuranceInputSchema.parse(input ?? {})

    return runWorkflowAssuranceRegistry({
      ...parsed,
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      runType: "manual",
    })
  },
)

export async function runWorkflowAssuranceChecksAction(input?: ManualWorkflowAssuranceInput) {
  return runManualWorkflowAssurance(input)
}
