"use server"

import { z } from "zod"

import { protect } from "@/services/_shared/protect"
import type { StartBranchDailyCloseReviewResult } from "@/services/end-of-day-close/end-of-day-close-review-contracts"
import { startBranchDailyCloseReview } from "@/services/end-of-day-close/end-of-day-close-review.service"

export type { StartBranchDailyCloseReviewResult }

const MAX_SNAPSHOT_AGE_MINUTES = 60 * 24 * 31
const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const branchDailyCloseReviewInputSchema = z.object({
  locationId: z.string().trim().min(1).max(240),
  businessDate: z
    .string()
    .trim()
    .regex(BUSINESS_DATE_PATTERN)
    .refine(isCalendarDate, "businessDate must be a valid calendar date"),
  idempotencyKey: z.string().trim().min(1).max(200),
  maxAgeMinutes: z
    .number()
    .int()
    .positive()
    .max(MAX_SNAPSHOT_AGE_MINUTES)
    .nullable()
    .optional(),
})

function asBranchDailyCloseReviewInput(input: unknown) {
  const parsed = branchDailyCloseReviewInputSchema.parse(input)
  return {
    locationId: parsed.locationId,
    businessDate: parsed.businessDate,
    idempotencyKey: parsed.idempotencyKey,
    maxAgeMinutes: parsed.maxAgeMinutes ?? null,
  }
}

const startReview = protect<unknown, StartBranchDailyCloseReviewResult>(
  {
    permission: "branch.daily-close.review",
    auditResource: "BranchDailyCloseRun",
    auditAllowed: true,
    module: {
      moduleSlug: "dashboard",
      surface: "actions/end-of-day-close/branch-daily-close-review.actions.ts",
      surfaceType: "action",
      accessIntent: "write",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = asBranchDailyCloseReviewInput(input)
    return startBranchDailyCloseReview({
      accessContext: ctx,
      actorId: ctx.userId,
      ...parsed,
    })
  },
)

export async function startBranchDailyCloseReviewAction(input: unknown) {
  return startReview(input)
}

function isCalendarDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}
