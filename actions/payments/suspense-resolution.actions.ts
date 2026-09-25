"use server"

import { FreshAuthRequiredError, SESSION_ASSURANCE_LEVEL } from "@/lib/security/auth-session"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import { readSuspenseResolutionWorkspace, searchSuspenseClearingJournals } from "@/services/reconciliation/payment-suspense-resolution-read.service"
import { suspenseResolutionReadSchema, suspenseClearingSearchSchema, suspenseResolutionReviewSchema } from "@/services/reconciliation/payment-suspense-resolution-read.contracts"
import { previewSuspenseResolution } from "@/services/reconciliation/payment-suspense-resolution-evidence.service"
import { proposeSuspenseResolution, reviewSuspenseResolution, decideSuspenseResolution } from "@/services/reconciliation/payment-suspense-resolution.service"
import { suspenseResolutionDraftSchema, suspenseResolutionProposalSchema, suspenseResolutionDecisionSchema } from "@/services/reconciliation/payment-suspense-resolution.contracts"
import { previewSuspenseResolutionRecovery, proposeSuspenseResolutionRecovery, reviewSuspenseResolutionRecovery, decideSuspenseResolutionRecovery } from "@/services/reconciliation/payment-suspense-resolution-recovery.service"
import { suspenseResolutionRecoveryDraftSchema, suspenseResolutionRecoveryProposalSchema, suspenseResolutionRecoveryDecisionSchema } from "@/services/reconciliation/payment-suspense-resolution-recovery.contracts"
import { exportSuspenseResolution, suspenseResolutionExportSchema } from "@/services/reconciliation/payment-suspense-resolution-export.service"

const readModule = { moduleSlug: "payment_reconciliation", surface: "actions/payments/suspense-resolution.actions.ts", surfaceType: "action", accessIntent: "read", mode: "enforce", audit: false } as const
const writeModule = { ...readModule, accessIntent: "write", audit: true } as const
const readOptions = { permission: "payments.reconciliation.read", auditResource: "SuspenseResolution", module: readModule }
const proposeOptions = { permission: "payments.reconciliation.suspense.propose", auditResource: "SuspenseResolution", module: writeModule }
const decideOptions = { permission: "payments.reconciliation.suspense.post", auditResource: "SuspenseResolution", module: writeModule, freshAuth: { maxAgeSeconds: 300 } }
function control(ctx: ProtectedActionContext, fresh = false) {
  const auth = ctx.freshAuth
  if (fresh && (!auth || auth.claims.userId !== ctx.userId || auth.claims.tenantId !== ctx.orgId || auth.claims.assuranceOrganizationId !== ctx.orgId
    || auth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD || auth.claims.lastAuthAt !== auth.lastAuthAt.getTime())) throw new FreshAuthRequiredError()
  return { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, ...(fresh ? { lastAuthAt: auth!.lastAuthAt } : {}) }
}
function scoped<T>(data: T, ctx: ProtectedActionContext) { return { ...data, scope: { organizationId: ctx.orgId, actorId: ctx.userId } } }
const workspace = protect(readOptions, async (input: unknown, ctx) => scoped(await readSuspenseResolutionWorkspace(suspenseResolutionReadSchema.parse(input), control(ctx)), ctx))
const candidates = protect(readOptions, async (input: unknown, ctx) => scoped(await searchSuspenseClearingJournals(suspenseClearingSearchSchema.parse(input), control(ctx)), ctx))
const preview = protect(readOptions, async (input: unknown, ctx) => scoped(await previewSuspenseResolution(suspenseResolutionDraftSchema.parse(input), control(ctx)), ctx))
const propose = protect(proposeOptions, async (input: unknown, ctx) => scoped(await proposeSuspenseResolution(suspenseResolutionProposalSchema.parse(input), control(ctx)), ctx))
const review = protect(readOptions, async (input: unknown, ctx) => { const parsed = suspenseResolutionReviewSchema.parse(input); return scoped(await reviewSuspenseResolution(parsed.suspenseItemId, parsed.proposalId, control(ctx)), ctx) })
const decide = protect(decideOptions, async (input: unknown, ctx) => scoped(await decideSuspenseResolution(suspenseResolutionDecisionSchema.parse(input), control(ctx, true)), ctx))
const recoveryPreview = protect(readOptions, async (input: unknown, ctx) => scoped(await previewSuspenseResolutionRecovery(suspenseResolutionRecoveryDraftSchema.parse(input), control(ctx)), ctx))
const recoveryPropose = protect(proposeOptions, async (input: unknown, ctx) => scoped(await proposeSuspenseResolutionRecovery(suspenseResolutionRecoveryProposalSchema.parse(input), control(ctx)), ctx))
const recoveryReview = protect(readOptions, async (input: unknown, ctx) => { const parsed = suspenseResolutionReviewSchema.parse(input); return scoped(await reviewSuspenseResolutionRecovery(parsed.suspenseItemId, parsed.proposalId, control(ctx)), ctx) })
const recoveryDecide = protect(decideOptions, async (input: unknown, ctx) => scoped(await decideSuspenseResolutionRecovery(suspenseResolutionRecoveryDecisionSchema.parse(input), control(ctx, true)), ctx))
const exportRecord = protect({ permission: "payments.export", auditResource: "SuspenseResolutionRecord", auditAllowed: true, module: readModule, freshAuth: { maxAgeSeconds: 300 } },
  async (input: unknown, ctx) => scoped(await exportSuspenseResolution(suspenseResolutionExportSchema.parse(input), control(ctx, true)), ctx))

export async function readSuspenseResolutionWorkspaceAction(input: unknown) { return workspace(input) }
export async function searchSuspenseClearingJournalsAction(input: unknown) { return candidates(input) }
export async function previewSuspenseResolutionAction(input: unknown) { return preview(input) }
export async function proposeSuspenseResolutionAction(input: unknown) { return propose(input) }
export async function reviewSuspenseResolutionAction(input: unknown) { return review(input) }
export async function decideSuspenseResolutionAction(input: unknown) { return decide(input) }
export async function previewSuspenseResolutionRecoveryAction(input: unknown) { return recoveryPreview(input) }
export async function proposeSuspenseResolutionRecoveryAction(input: unknown) { return recoveryPropose(input) }
export async function reviewSuspenseResolutionRecoveryAction(input: unknown) { return recoveryReview(input) }
export async function decideSuspenseResolutionRecoveryAction(input: unknown) { return recoveryDecide(input) }
export async function exportSuspenseResolutionAction(input: unknown) { return exportRecord(input) }
