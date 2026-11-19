"use server";
import { z } from "zod";
import { requireSession } from "@/lib/security/auth-session";
import { hasRbacPermission } from "@/lib/security/rbac-permissions";
import {
  protect,
  type ProtectedActionResponse,
} from "@/services/_shared/protect";
import { toSafeActionError } from "@/services/_shared/action-errors";
import {
  deny,
  DIGEST_PERMISSIONS,
  type Identity,
} from "@/services/command-center/authority";
import {
  loadFollowUps,
  changeFollowUp,
  reviewFollowUps,
  followUpCandidates,
  saveFollowUpPreference,
  acknowledgeFollowUpNotice,
} from "@/services/command-center/persistence.service";
import type {
  FollowUpData,
  FollowUpQuery,
  FollowUpCommand,
  ReviewCommand,
  CandidateQuery,
  PreferenceCommand,
  NoticeCommand,
} from "@/services/command-center/contracts";
const querySchema = z
  .object({
    center: z.enum(["digest", "manager", "owner"]),
    locationId: z.string().min(1).max(128).nullable().optional(),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
  })
  .strict();
const commandSchema = querySchema.extend({
  requestId: z.string().uuid(),
  itemId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  ownerId: z.string().min(1).max(128).nullable(),
  state: z.enum(["OPEN", "ASSIGNED", "WAITING", "REVIEWED"]),
  dueAt: z.string().datetime().nullable(),
});
const reviewSchema = querySchema.extend({
  requestId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  evidenceKey: z.string().regex(/^[a-f0-9]{64}$/),
});
async function execute<T extends FollowUpQuery, O>(
  schema: z.ZodType<T>,
  raw: T,
  handler: (identity: Identity, input: T) => Promise<O>,
): Promise<ProtectedActionResponse<O>> {
  try {
    const input = schema.parse(raw);
    const start = new Date(input.periodStart),
      end = new Date(input.periodEnd);
    if (end < start || end.getTime() - start.getTime() > 366 * 86400000)
      throw deny();
    const initial = await requireSession();
    const permission =
      input.center === "digest"
        ? DIGEST_PERMISSIONS.find((p) =>
            hasRbacPermission(initial.ctx.permissions, p),
          )
        : "dashboard.read";
    if (!permission) throw deny();
    return protect<T, O>(
      {
        permission,
        tenantGuard: "handler-derived",
        auditResource: "CommandCenterFollowUp",
      },
      async (value, ctx) => {
        const verified = await requireSession();
        if (
          ctx.orgId !== verified.ctx.orgId ||
          ctx.userId !== verified.ctx.userId
        )
          throw deny();
        return handler(
          {
            organizationId: ctx.orgId,
            actorId: ctx.userId,
            session: {
              id: verified.claims.sessionId,
              token: verified.claims.sessionToken,
            },
          },
          value,
        );
      },
    )(input);
  } catch (error) {
    const safe = toSafeActionError(error);
    return { success: false, data: null, ...safe };
  }
}
export async function getCommandCenterFollowUps(input: FollowUpQuery) {
  return execute(querySchema, input, loadFollowUps);
}
export async function changeCommandCenterFollowUp(input: FollowUpCommand) {
  return execute(commandSchema, input, changeFollowUp);
}
export async function reviewCommandCenterFollowUps(input: ReviewCommand) {
  return execute(reviewSchema, input, reviewFollowUps);
}

export async function getCommandCenterCandidates(input: CandidateQuery) {
  return execute(
    querySchema.extend({
      itemId: z.string().uuid(),
      search: z.string().max(80),
    }),
    input,
    followUpCandidates,
  );
}

export async function saveCommandCenterPreference(input: PreferenceCommand) {
  return execute(
    querySchema
      .extend({
        enabled: z.boolean(),
        quietStart: z.number().int().min(0).max(23).nullable(),
        quietEnd: z.number().int().min(0).max(23).nullable(),
      })
      .refine((v) => (v.quietStart === null) === (v.quietEnd === null)),
    input,
    saveFollowUpPreference,
  );
}
export async function acknowledgeCommandCenterNotice(input: NoticeCommand) {
  return execute(
    querySchema.extend({ noticeId: z.string().uuid() }),
    input,
    acknowledgeFollowUpNotice,
  );
}
