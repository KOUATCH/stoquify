"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import type { ManagerActionCenterData } from "@/services/manager-action-center/manager-action-center-contracts"
import { getManagerActionCenterData } from "@/services/manager-action-center/manager-action-center.service"

export type { ManagerActionCenterData }

const managerActionCenterInputSchema = z.object({
  periodStart: z.coerce.date().nullable().optional(),
  periodEnd: z.coerce.date().nullable().optional(),
  maxAgeMinutes: z.number().int().positive().max(60 * 24 * 31).nullable().optional(),
})

function asManagerActionCenterInput(input: unknown) {
  const parsed = managerActionCenterInputSchema.parse(input && typeof input === "object" ? input : {})
  return {
    periodStart: parsed.periodStart ?? null,
    periodEnd: parsed.periodEnd ?? null,
    maxAgeMinutes: parsed.maxAgeMinutes ?? null,
  }
}

const getManagerActionCenter = protect<unknown, ManagerActionCenterData>(
  { permission: "dashboard.read", auditResource: "KontavaManagerActionCenter", auditAllowed: true },
  async (input, ctx) => {
    const parsed = asManagerActionCenterInput(input)
    return getManagerActionCenterData({
      organizationId: ctx.orgId,
      actorPermissions: ctx.permissions,
      ...parsed,
    })
  },
)

export async function getManagerActionCenterAction(input: unknown = {}) {
  return getManagerActionCenter(input)
}
