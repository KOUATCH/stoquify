"use server"

import { z } from "zod"

import { readPOSActivityShiftSummary } from "@/services/pos/pos-activity-shift-summary"
import { posReadResult } from "@/services/pos/pos-read-result"

import { activityFailure, isPOSActivityManager, requirePOSActivity } from "./pos-activity-access"

const id = z.string().trim().min(1).max(120)
const inputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  locationId: id.nullish(),
  terminalId: id.nullish(),
  sessionId: id,
}).strict()

export async function getPOSActivityShiftSummaryAction(input: unknown) {
  try {
    const parsed = inputSchema.parse(input)
    const ctx = await requirePOSActivity("actions/pos/pos-activity-shift-summary.actions.ts:getPOSActivityShiftSummaryAction")
    const actor = { organizationId: ctx.orgId, userId: ctx.userId, manager: isPOSActivityManager(ctx) }
    return posReadResult(await readPOSActivityShiftSummary(actor, parsed), ctx)
  } catch (error) {
    return activityFailure(error)
  }
}
