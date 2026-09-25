"use server"

import { canUsePermission, RbacError } from "@/lib/security/rbac"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getCustomerStatementResponseHistory, listCustomerStatementResponses, reviewCustomerStatementResponse } from "@/services/accounting/customer-statement-response.service"

function requireCustomerRead(ctx: ProtectedActionContext) {
  if (!canUsePermission(ctx, "customers.read")) throw new RbacError("Customer read access is required", "FORBIDDEN", 403)
}
const readOptions = {
  permission: "accounting.exports.create", auditResource: "CustomerStatementRecipientAction", auditAllowed: true,
  module: { moduleSlug: "accounting" as const, surface: "actions/accounting/customer-statement-response.actions.ts:read", surfaceType: "action" as const, accessIntent: "read" as const, mode: "enforce" as const, audit: true },
}
const list = protect(readOptions, async (input: unknown, ctx) => {
  requireCustomerRead(ctx)
  const result = await listCustomerStatementResponses(input, { organizationId: ctx.orgId, actorId: ctx.userId })
  const access = await observeModuleAccess({ organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, moduleSlug: "accounting", surfaceType: "action", surface: "actions/accounting/customer-statement-response.actions.ts:review-availability", accessIntent: "write", mode: "enforce", audit: true })
  return { ...result, canReview: result.canReviewPermission && access.allowed }
})
const history = protect(readOptions, async (input: unknown, ctx) => {
  requireCustomerRead(ctx)
  return getCustomerStatementResponseHistory(input, { organizationId: ctx.orgId, actorId: ctx.userId })
})
const review = protect({
  permission: "customers.update", auditResource: "CustomerStatementRecipientAction", auditAllowed: true,
  freshAuth: { maxAgeSeconds: 300 },
  module: { moduleSlug: "accounting", surface: "actions/accounting/customer-statement-response.actions.ts:review", surfaceType: "action", accessIntent: "write", mode: "enforce", audit: true },
}, async (input: unknown, ctx) => {
  requireCustomerRead(ctx)
  if (!canUsePermission(ctx, "accounting.exports.create") || !ctx.freshAuth || ctx.freshAuth.claims.userId !== ctx.userId || ctx.freshAuth.claims.tenantId !== ctx.orgId) throw new RbacError("Current statement review authority is required", "FORBIDDEN", 403)
  return reviewCustomerStatementResponse(input, { organizationId: ctx.orgId, actorId: ctx.userId, sessionId: ctx.freshAuth.claims.sessionId })
})

export async function listCustomerStatementResponsesAction(input: unknown) { return list(input) }
export async function getCustomerStatementResponseHistoryAction(input: unknown) { return history(input) }
export async function reviewCustomerStatementResponseAction(input: unknown) { return review(input) }
