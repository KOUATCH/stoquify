"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import type { ActionQueueResult } from "@/services/signals/business-signal-contracts"
import { buildBusinessSignalsFromSnapshots } from "@/services/signals/business-signal-rules.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service"

export type { ActionQueueResult }

const actionQueueInputSchema = z.object({
  periodStart: z.coerce.date().nullable().optional(),
  periodEnd: z.coerce.date().nullable().optional(),
  maxAgeMinutes: z.number().int().positive().max(60 * 24 * 31).nullable().optional(),
})

function asQueueInput(input: unknown) {
  const parsed = actionQueueInputSchema.parse(input && typeof input === "object" ? input : {})
  return {
    periodStart: parsed.periodStart ?? null,
    periodEnd: parsed.periodEnd ?? null,
    maxAgeMinutes: parsed.maxAgeMinutes ?? null,
  }
}

const getOwnerActionQueue = protect<unknown, ActionQueueResult>(
  { permission: "dashboard.read", auditResource: "KontavaOwnerActionQueue", auditAllowed: true },
  async (input, ctx) => {
    const parsed = asQueueInput(input)
    const [tenantOperating, paymentTruth, inventoryCash, closeReadiness] = await Promise.all([
      getTenantOperatingSnapshot({ ...parsed, organizationId: ctx.orgId }),
      getPaymentTruthSnapshot({ ...parsed, organizationId: ctx.orgId }),
      getInventoryCashSnapshot({ ...parsed, organizationId: ctx.orgId }),
      getCloseReadinessSnapshot({ ...parsed, organizationId: ctx.orgId }),
    ])

    const signals = buildBusinessSignalsFromSnapshots({
      organizationId: ctx.orgId,
      snapshots: [tenantOperating, paymentTruth, inventoryCash, closeReadiness],
    })

    return buildActionQueue({
      organizationId: ctx.orgId,
      signals,
      actorPermissions: ctx.permissions,
    })
  },
)

export async function getOwnerActionQueueAction(input: unknown = {}) {
  return getOwnerActionQueue(input)
}
