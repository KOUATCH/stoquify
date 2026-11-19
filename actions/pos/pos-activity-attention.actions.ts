"use server"

import { z } from "zod"

import { canUsePermission } from "@/lib/security/rbac"
import { db } from "@/prisma/db"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { readPOSActivityAttention } from "@/services/pos/pos-activity-attention.service"
import type { POSActivityAttentionData, POSAttentionOffline } from "@/services/pos/pos-activity-attention.types"
import { posReadResult } from "@/services/pos/pos-read-result"

import { activityFailure, isPOSActivityManager, requirePOSActivity } from "./pos-activity-access"
import { getOfflineSyncDashboardAction } from "./sync.actions"

const id = z.string().trim().min(1).max(120)
const inputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locationId: id.nullish(),
  terminalId: id.nullish(),
  sessionId: id.nullish(),
  cursor: z.string().min(1).max(900).optional(),
}).strict()

async function readCurrentOfflineState(
  ctx: Awaited<ReturnType<typeof requirePOSActivity>>,
  input: z.infer<typeof inputSchema>,
): Promise<POSAttentionOffline | null> {
  if (!canUsePermission(ctx, "pos.transactions.read")) return null
  if (!input.terminalId) return { state: "choose_register" }

  const register = await db.pOSStation.findFirst({
    where: {
      id: input.terminalId,
      organizationId: ctx.orgId,
      ...(input.locationId ? { locationId: input.locationId } : {}),
      location: { organizationId: ctx.orgId },
    },
    select: { id: true, locationId: true },
  })
  if (!register) return { state: "unavailable" }

  const result = await getOfflineSyncDashboardAction({ locationId: register.locationId, terminalId: register.id, limit: 10 })
  if (!result.success) return result.status === 401 || result.status === 403 ? null : { state: "unavailable" }

  return {
    state: "ready",
    asOf: result.data.asOf,
    locationId: register.locationId,
    terminalId: register.id,
    conflictCount: result.data.summary.openConflictCount,
    closeBlockerCount: result.data.summary.closeBlockerCount,
    conflicts: result.data.conflicts,
    access: {
      organizationId: ctx.orgId, userId: ctx.userId,
      canRead: true, canReview: canUsePermission(ctx, "controls.manage"),
    },
  }
}

export async function getPOSActivityAttentionAction(input: unknown) {
  try {
    const parsed = inputSchema.parse(input)
    const ctx = await requirePOSActivity("actions/pos/pos-activity-attention.actions.ts:getPOSActivityAttentionAction")
    if (!isPOSActivityManager(ctx)) throw new ForbiddenError("Point of sale exception review requires manager access.")

    const [attention, offline] = await Promise.all([
      readPOSActivityAttention({ organizationId: ctx.orgId, userId: ctx.userId }, parsed),
      readCurrentOfflineState(ctx, parsed),
    ])
    return posReadResult<POSActivityAttentionData>({ ...attention, offline }, ctx)
  } catch (error) {
    return activityFailure(error)
  }
}
