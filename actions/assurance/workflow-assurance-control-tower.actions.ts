"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import {
  getAssuranceControlTowerData,
  getAssuranceIncidentDetailData,
} from "@/services/assurance/assurance-control-tower.service"
import type {
  AssuranceControlTowerData,
  AssuranceIncidentDetailData,
} from "@/services/assurance/assurance-control-tower-contracts"

export type { AssuranceControlTowerData, AssuranceIncidentDetailData }

const controlTowerInputSchema = z.object({
  limit: z.number().int().positive().max(100).nullable().optional(),
})

const incidentDetailInputSchema = z.object({
  incidentId: z.string().min(1),
})

const getControlTower = protect<unknown, AssuranceControlTowerData>(
  {
    permission: "controls.audit.read",
    auditResource: "WorkflowAssuranceControlTower",
    auditAllowed: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = controlTowerInputSchema.parse(input && typeof input === "object" ? input : {})
    return getAssuranceControlTowerData({
      organizationId: ctx.orgId,
      actorPermissions: ctx.permissions,
      limit: parsed.limit ?? null,
    })
  },
)

const getIncidentDetail = protect<unknown, AssuranceIncidentDetailData | null>(
  {
    permission: "controls.audit.read",
    auditResource: "WorkflowAssuranceIncident",
    auditAllowed: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = incidentDetailInputSchema.parse(input && typeof input === "object" ? input : {})
    return getAssuranceIncidentDetailData({
      organizationId: ctx.orgId,
      actorPermissions: ctx.permissions,
      incidentId: parsed.incidentId,
    })
  },
)

export async function getWorkflowAssuranceControlTowerAction(input: unknown = {}) {
  return getControlTower(input)
}

export async function getWorkflowAssuranceIncidentDetailAction(input: unknown) {
  return getIncidentDetail(input)
}
