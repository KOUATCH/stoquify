"use server"

import { z } from "zod"
import { readPOSActivity, readPOSActivityDetail } from "@/services/pos/pos-activity.service"
import { posActivityKinds } from "@/services/pos/pos-activity.types"
import { posReadResult } from "@/services/pos/pos-read-result"
import { activityActor, activityFailure, requirePOSActivity } from "./pos-activity-access"

const id = z.string().trim().min(1).max(120)
const filters = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  locationId: id.nullish(),
  terminalId: id.nullish(),
  sessionId: id.nullish(),
}).strict()
const listInput = filters.extend({
  view: z.enum(["all", "receipts"]).optional(),
  search: z.string().trim().max(120).optional(),
  cursor: z.string().min(1).max(900).optional(),
  total: z.string().trim().max(15).optional(),
  fromTime: z.string().trim().max(5).optional(),
  toTime: z.string().trim().max(5).optional(),
})
const detailInput = filters.extend({ kind: z.enum(posActivityKinds), id })

export async function listPOSActivityAction(input: unknown = {}) {
  try {
    const parsed = listInput.parse(input)
    const ctx = await requirePOSActivity("actions/pos/pos-activity.actions.ts:listPOSActivityAction")
    return posReadResult(await readPOSActivity(activityActor(ctx), parsed), ctx)
  } catch (error) {
    return activityFailure(error)
  }
}

export async function getPOSActivityDetailAction(input: unknown) {
  try {
    const parsed = detailInput.parse(input)
    const ctx = await requirePOSActivity("actions/pos/pos-activity.actions.ts:getPOSActivityDetailAction")
    return posReadResult(await readPOSActivityDetail(activityActor(ctx), parsed), ctx)
  } catch (error) {
    return activityFailure(error)
  }
}
