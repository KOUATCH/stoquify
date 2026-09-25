"use server"

import { FreshAuthRequiredError, SESSION_ASSURANCE_LEVEL } from "@/lib/security/auth-session"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import { exceptionClosureReadSchema, exceptionClosureReviewSchema, exceptionClosureProposalSchema, exceptionClosureDecisionSchema, exceptionClosureCasesSchema, exceptionClosureHistorySchema } from "@/services/reconciliation/payment-exception-closure.contracts"
import { previewExceptionClosure, proposeExceptionClosure, reviewExceptionClosure, decideExceptionClosure, listExceptionClosureCases, readExceptionClosureHistory } from "@/services/reconciliation/payment-exception-closure.service"

const moduleRead = { moduleSlug: "payment_reconciliation", surface: "actions/payments/exception-closure.actions.ts", surfaceType: "action", accessIntent: "read", mode: "enforce", audit: false } as const
const readPolicy = { permission: "payments.reconciliation.read", auditResource: "PaymentExceptionClosure", module: moduleRead }
const writePolicy = { permission: "payments.reconciliation.exception.resolve", auditResource: "PaymentExceptionClosure", auditAllowed: true,
  module: { ...moduleRead, accessIntent: "write" as const, audit: true }, freshAuth: { maxAgeSeconds: 300 } }
function control(ctx: ProtectedActionContext, write = false) {
  const auth = ctx.freshAuth
  if (write && (!auth || auth.claims.userId !== ctx.userId || auth.claims.tenantId !== ctx.orgId || auth.claims.assuranceOrganizationId !== ctx.orgId
    || auth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD || auth.claims.lastAuthAt !== auth.lastAuthAt.getTime())) throw new FreshAuthRequiredError()
  return { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, ...(write ? { lastAuthAt: auth!.lastAuthAt } : {}) }
}
const preview = protect(readPolicy, async (input: unknown, ctx) => ({ ...await previewExceptionClosure(exceptionClosureReadSchema.parse(input), control(ctx)), scope: { organizationId: ctx.orgId, actorId: ctx.userId } }))
const propose = protect(writePolicy, async (input: unknown, ctx) => ({ ...await proposeExceptionClosure(exceptionClosureProposalSchema.parse(input), control(ctx, true)), scope: { organizationId: ctx.orgId, actorId: ctx.userId } }))
const review = protect(readPolicy, async (input: unknown, ctx) => {
  const parsed = exceptionClosureReviewSchema.parse(input)
  return { ...await reviewExceptionClosure(parsed.exceptionId, parsed.proposalId, control(ctx)), scope: { organizationId: ctx.orgId, actorId: ctx.userId } }
})
const decide = protect(writePolicy, async (input: unknown, ctx) => ({ ...await decideExceptionClosure(exceptionClosureDecisionSchema.parse(input), control(ctx, true)), scope: { organizationId: ctx.orgId, actorId: ctx.userId } }))
const cases = protect(readPolicy, async (input: unknown, ctx) => ({ ...await listExceptionClosureCases(exceptionClosureCasesSchema.parse(input), control(ctx)), scope: { organizationId: ctx.orgId, actorId: ctx.userId } }))
const history = protect(readPolicy, async (input: unknown, ctx) => ({ ...await readExceptionClosureHistory(exceptionClosureHistorySchema.parse(input), control(ctx)), scope: { organizationId: ctx.orgId, actorId: ctx.userId } }))
export async function previewExceptionClosureAction(input: unknown) { return preview(input) }
export async function proposeExceptionClosureAction(input: unknown) { return propose(input) }
export async function reviewExceptionClosureAction(input: unknown) { return review(input) }
export async function decideExceptionClosureAction(input: unknown) { return decide(input) }
export async function listExceptionClosureCasesAction(input: unknown) { return cases(input) }
export async function readExceptionClosureHistoryAction(input: unknown) { return history(input) }
