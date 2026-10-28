"use server"

import { z } from "zod"

import {
  FreshAuthRequiredError,
  SESSION_ASSURANCE_LEVEL,
} from "@/lib/security/auth-session"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import {
  BRANCH_DAILY_CLOSE_SIGN_OFF_PERSISTENCE,
  type SignBranchDailyCloseResult,
} from "@/services/end-of-day-close/branch-daily-close-sign-off-contracts"
import { signBranchDailyClose } from "@/services/end-of-day-close/branch-daily-close-sign-off.service"
import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"

export type { SignBranchDailyCloseResult }

const MAX_SNAPSHOT_AGE_MINUTES = 60 * 24 * 31
const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const branchDailyCloseSignOffInputSchema = z.object({
  locationId: z.string().trim().min(1).max(240),
  businessDate: z
    .string()
    .trim()
    .regex(BUSINESS_DATE_PATTERN)
    .refine(isCalendarDate, "businessDate must be a valid calendar date"),
  idempotencyKey: z
    .string()
    .trim()
    .min(1)
    .max(BRANCH_DAILY_CLOSE_SIGN_OFF_PERSISTENCE.idempotencyKeyMaxLength),
  maxAgeMinutes: z
    .number()
    .int()
    .positive()
    .max(MAX_SNAPSHOT_AGE_MINUTES)
    .nullable()
    .optional(),
})

function asBranchDailyCloseSignOffInput(input: unknown) {
  const parsed = branchDailyCloseSignOffInputSchema.parse(input)
  return {
    locationId: parsed.locationId,
    businessDate: parsed.businessDate,
    idempotencyKey: parsed.idempotencyKey,
    maxAgeMinutes: parsed.maxAgeMinutes ?? null,
  }
}

const signOff = protect<unknown, SignBranchDailyCloseResult>(
  {
    permission: "branch.daily-close.sign",
    auditResource: "BranchDailyCloseSignOff",
    auditAllowed: true,
    freshAuth: {
      maxAgeSeconds:
        BRANCH_DAILY_CLOSE_SIGN_OFF_PERSISTENCE.freshAuthMaxAgeSeconds,
    },
    module: {
      moduleSlug: "dashboard",
      surface:
        "actions/end-of-day-close/branch-daily-close-sign-off.actions.ts",
      surfaceType: "action",
      accessIntent: "write",
      mode: "enforce",
      audit: true,
    },
  },
  async (input, ctx) => {
    const parsed = asBranchDailyCloseSignOffInput(input)
    const lastAuthAt = verifiedFreshAuthTime(ctx)

    return signBranchDailyClose({
      accessContext: operatingAccessContext(ctx),
      actorId: ctx.userId,
      ...parsed,
      lastAuthAt,
    })
  },
)

export async function signBranchDailyCloseAction(input: unknown) {
  return signOff(input)
}

function operatingAccessContext(
  ctx: ProtectedActionContext,
): OperatingAccessContext {
  return {
    orgId: ctx.orgId,
    userId: ctx.userId,
    roles: ctx.roles,
    permissions: ctx.permissions,
    isSuperUser: ctx.isSuperUser,
  }
}

function verifiedFreshAuthTime(ctx: ProtectedActionContext) {
  const freshAuth = ctx.freshAuth
  if (
    !freshAuth ||
    freshAuth.claims.userId !== ctx.userId ||
    freshAuth.claims.tenantId !== ctx.orgId ||
    freshAuth.claims.assuranceOrganizationId !== ctx.orgId ||
    freshAuth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD ||
    freshAuth.claims.lastAuthAt !== freshAuth.lastAuthAt.getTime()
  ) {
    throw new FreshAuthRequiredError()
  }

  return freshAuth.lastAuthAt
}

function isCalendarDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}
