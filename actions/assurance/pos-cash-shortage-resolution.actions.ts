"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getAssuranceIncidentDetailData } from "@/services/assurance/assurance-control-tower.service"
import {
  executePosCashShortageResolutionCommand,
  type PosCashShortageResolutionCommandResult,
} from "@/services/leakage/pos-cash-shortage-resolution-command"
import { loadPosCashShortageResolutionSourceForIncident } from "@/services/leakage/pos-cash-shortage-resolution-source-loader"

const protectedResolutionSchema = z
  .object({
    incidentId: z.string().trim().min(1),
    currentSourceHash: z.string().trim().min(12).max(160),
    resolutionNote: z.string().trim().min(8).max(1200),
    resolutionEvidenceHash: z.string().trim().min(12).max(160),
  })
  .strict()

export type ResolvePosCashShortageIncidentActionInput = z.input<
  typeof protectedResolutionSchema
>

const resolvePosCashShortageIncident = protect<
  ResolvePosCashShortageIncidentActionInput,
  PosCashShortageResolutionCommandResult
>(
  {
    permission: "controls.manage",
    auditResource: "WorkflowAssuranceIncident",
    auditAllowed: true,
    freshAuth: { maxAgeSeconds: 300 },
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = protectedResolutionSchema.parse(input)
    const detail = await getAssuranceIncidentDetailData({
      organizationId: ctx.orgId,
      actorPermissions: ctx.permissions,
      incidentId: parsed.incidentId,
    })
    if (!detail) {
      throw new NotFoundError("Workflow assurance incident not found.")
    }

    const source = await loadPosCashShortageResolutionSourceForIncident({
      incident: detail.incident,
      currentSourceHash: parsed.currentSourceHash,
    })

    return executePosCashShortageResolutionCommand({
      incident: detail.incident,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      sourceRecheckInput: source.sourceRecheckInput,
      resolutionNote: parsed.resolutionNote,
      resolutionEvidenceHash: parsed.resolutionEvidenceHash,
    })
  },
)

export async function resolvePosCashShortageIncidentAction(
  input: ResolvePosCashShortageIncidentActionInput,
) {
  return resolvePosCashShortageIncident(input)
}
