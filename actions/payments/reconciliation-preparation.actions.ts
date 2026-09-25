"use server"

import { FreshAuthRequiredError, SESSION_ASSURANCE_LEVEL } from "@/lib/security/auth-session"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import { reconciliationPreparationReadSchema, reconciliationPreparationSchema, reconciliationPreparationQuerySchema } from "@/services/reconciliation/reconciliation-run-preparation.contracts"
import { previewReconciliationPreparation, prepareReconciliationRun, readReconciliationPreparation } from "@/services/reconciliation/reconciliation-run-preparation.service"

const moduleRead = { moduleSlug: "payment_reconciliation", surface: "actions/payments/reconciliation-preparation.actions.ts", surfaceType: "action", accessIntent: "read", mode: "enforce", audit: false } as const
function control(ctx: ProtectedActionContext, write = false) {
  const auth = ctx.freshAuth
  if (write && (!auth || auth.claims.userId !== ctx.userId || auth.claims.tenantId !== ctx.orgId || auth.claims.assuranceOrganizationId !== ctx.orgId
    || auth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD || auth.claims.lastAuthAt !== auth.lastAuthAt.getTime())) throw new FreshAuthRequiredError()
  return { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, ...(write ? { lastAuthAt: auth!.lastAuthAt } : {}) }
}
const preview = protect({ permission: "payments.reconciliation.read", auditResource: "ReconciliationRunPreparation", module: moduleRead }, async (input: unknown, ctx) => ({
  ...await previewReconciliationPreparation(reconciliationPreparationReadSchema.parse(input), control(ctx)), scope: { organizationId: ctx.orgId, actorId: ctx.userId },
}))
const prepare = protect({ permission: "payments.reconciliation.run", auditResource: "ReconciliationRunPreparation", auditAllowed: true,
  module: { ...moduleRead, accessIntent: "write", audit: true }, freshAuth: { maxAgeSeconds: 300 } }, async (input: unknown, ctx) => ({
  ...await prepareReconciliationRun(reconciliationPreparationSchema.parse(input), control(ctx, true)), scope: { organizationId: ctx.orgId, actorId: ctx.userId },
}))
export async function previewReconciliationPreparationAction(input: unknown) { return preview(input) }
export async function prepareReconciliationRunAction(input: unknown) { return prepare(input) }
const read = protect({ permission: "payments.reconciliation.read", auditResource: "ReconciliationRunPreparation", module: moduleRead }, async (input: unknown, ctx) => ({
  ...await readReconciliationPreparation(reconciliationPreparationQuerySchema.parse(input), control(ctx)), scope: { organizationId: ctx.orgId, actorId: ctx.userId },
}))
export async function readReconciliationPreparationAction(input: unknown) { return read(input) }
