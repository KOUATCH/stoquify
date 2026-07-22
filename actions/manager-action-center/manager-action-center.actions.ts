"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import type { ManagerActionCenterQueryResult } from "@/services/manager-action-center/manager-action-center-query-contracts"
import { getManagerActionCenterQuery } from "@/services/manager-action-center/manager-action-center-query.service"

export type { ManagerActionCenterQueryResult }

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

const getManagerActionCenter = protect<unknown, ManagerActionCenterQueryResult>(
  {
    permission: "dashboard.read",
    auditResource: "KontavaManagerActionCenter",
    auditAllowed: true,
    module: {
      moduleSlug: "dashboard",
      surface: "actions/manager-action-center/manager-action-center.actions.ts",
      accessIntent: "read",
      mode: "observe",
    },
  },
  async (input, ctx) => {
    const parsed = asManagerActionCenterInput(input)
    return getManagerActionCenterQuery({
      accessContext: ctx,
      ...parsed,
    })
  },
)

export async function getManagerActionCenterAction(input: unknown = {}) {
  return getManagerActionCenter(input)
}
