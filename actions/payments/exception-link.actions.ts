"use server"

import { FreshAuthRequiredError, SESSION_ASSURANCE_LEVEL } from "@/lib/security/auth-session"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import { exceptionLinkReadSchema, exceptionLinkRepairSchema } from "@/services/reconciliation/payment-exception-link.contracts"
import { readReconciliationExceptionLink, repairReconciliationExceptionLink } from "@/services/reconciliation/payment-exception-link.service"

const readModule = { moduleSlug: "payment_reconciliation", surface: "actions/payments/exception-link.actions.ts", surfaceType: "action", accessIntent: "read", mode: "enforce", audit: false } as const
function control(ctx: ProtectedActionContext, write = false) {
  const auth = ctx.freshAuth
  if (write && (!auth || auth.claims.userId !== ctx.userId || auth.claims.tenantId !== ctx.orgId || auth.claims.assuranceOrganizationId !== ctx.orgId
    || auth.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD || auth.claims.lastAuthAt !== auth.lastAuthAt.getTime())) throw new FreshAuthRequiredError()
  return { organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions, ...(write ? { lastAuthAt: auth!.lastAuthAt } : {}) }
}
const preview = protect({ permission: "payments.reconciliation.read", auditResource: "ReconciliationExceptionLink", module: readModule }, async (input: unknown, ctx) => ({
  ...await readReconciliationExceptionLink(exceptionLinkReadSchema.parse(input), control(ctx)), scope: { organizationId: ctx.orgId, actorId: ctx.userId },
}))
const repair = protect({ permission: "payments.reconciliation.run", auditResource: "ReconciliationExceptionLink", auditAllowed: true,
  module: { ...readModule, accessIntent: "write", audit: true }, freshAuth: { maxAgeSeconds: 300 } }, async (input: unknown, ctx) => ({
  ...await repairReconciliationExceptionLink(exceptionLinkRepairSchema.parse(input), control(ctx, true)), scope: { organizationId: ctx.orgId, actorId: ctx.userId },
}))
export async function readReconciliationExceptionLinkAction(input: unknown) { return preview(input) }
export async function repairReconciliationExceptionLinkAction(input: unknown) { return repair(input) }
