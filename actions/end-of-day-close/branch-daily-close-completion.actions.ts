"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import type { BranchDailyCloseCompletionResult } from "@/services/end-of-day-close/branch-daily-close-completion-contracts"
import { getBranchDailyCloseCompletion } from "@/services/end-of-day-close/branch-daily-close-completion.service"

export type { BranchDailyCloseCompletionResult }

const MAX_SNAPSHOT_AGE_MINUTES = 60 * 24 * 31
const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const branchDailyCloseCompletionInputSchema = z.object({
  locationId: z.string().trim().min(1).max(240),
  businessDate: z
    .string()
    .trim()
    .regex(BUSINESS_DATE_PATTERN)
    .refine(isCalendarDate, "businessDate must be a valid calendar date"),
  maxAgeMinutes: z
    .number()
    .int()
    .positive()
    .max(MAX_SNAPSHOT_AGE_MINUTES)
    .nullable()
    .optional(),
})

function asBranchDailyCloseCompletionInput(input: unknown) {
  const parsed = branchDailyCloseCompletionInputSchema.parse(input)
  return {
    locationId: parsed.locationId,
    businessDate: parsed.businessDate,
    maxAgeMinutes: parsed.maxAgeMinutes ?? null,
  }
}

const getCompletion = protect<unknown, BranchDailyCloseCompletionResult>(
  {
    permission: "dashboard.read",
    auditResource: "BranchDailyCloseCompletion",
    auditAllowed: true,
    module: {
      moduleSlug: "dashboard",
      surface:
        "actions/end-of-day-close/branch-daily-close-completion.actions.ts",
      accessIntent: "read",
      mode: "observe",
    },
  },
  async (input, ctx) => {
    const parsed = asBranchDailyCloseCompletionInput(input)
    return getBranchDailyCloseCompletion({
      accessContext: ctx,
      ...parsed,
    })
  },
)

export async function getBranchDailyCloseCompletionAction(input: unknown) {
  return getCompletion(input)
}

function isCalendarDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}
