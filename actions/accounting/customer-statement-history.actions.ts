"use server"

import { auditRbacDecision, canUsePermission, RbacError } from "@/lib/security/rbac"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import {
  customerStatementHistoryInputSchema, customerStatementRecordInputSchema,
  listCustomerStatementHistory, getCustomerStatementRecord,
  type CustomerStatementHistory, type CustomerStatementRecord,
} from "@/services/accounting/customer-statement-history.service"
import { retryCustomerStatementDelivery, type CustomerStatementRetryReceipt } from "@/services/accounting/customer-statement-retry.service"
import { retryCustomerStatementInputSchema } from "@/services/accounting/customer-statement.schemas"

async function requireCustomerRead(ctx: ProtectedActionContext) {
  if (canUsePermission(ctx, "customers.read")) return
  await auditRbacDecision({ ctx, permission: "customers.read", result: "denied", resource: "CustomerStatementHistory", reason: "Missing permission" })
  throw new RbacError("Customer read access is required", "FORBIDDEN", 403)
}

const listHistory = protect<unknown, CustomerStatementHistory>({
  permission: "accounting.exports.create", auditResource: "CustomerStatementHistory", auditAllowed: true,
  module: { moduleSlug: "accounting", surface: "actions/accounting/customer-statement-history.actions.ts:list", surfaceType: "action", accessIntent: "read", mode: "enforce", audit: true },
}, async (input, ctx) => {
  await requireCustomerRead(ctx)
  const parsed = customerStatementHistoryInputSchema.parse(input)
  return listCustomerStatementHistory({ ...parsed, organizationId: ctx.orgId })
})

const readRecord = protect<unknown, CustomerStatementRecord>({
  permission: "accounting.exports.create", auditResource: "CustomerStatementHistory", auditAllowed: true,
  module: { moduleSlug: "accounting", surface: "actions/accounting/customer-statement-history.actions.ts:read", surfaceType: "action", accessIntent: "read", mode: "enforce", audit: true },
}, async (input, ctx) => {
  await requireCustomerRead(ctx)
  const parsed = customerStatementRecordInputSchema.parse(input)
  return getCustomerStatementRecord({ ...parsed, organizationId: ctx.orgId })
})

export async function listCustomerStatementHistoryAction(input: unknown) { return listHistory(input) }
export async function getCustomerStatementRecordAction(input: unknown) { return readRecord(input) }

const retryDelivery = protect<unknown, CustomerStatementRetryReceipt>({
  permission: "accounting.exports.create", auditResource: "CustomerStatementDelivery", auditAllowed: true,
  freshAuth: { maxAgeSeconds: 300 },
  module: { moduleSlug: "accounting", surface: "actions/accounting/customer-statement-history.actions.ts:retry", surfaceType: "action", accessIntent: "export", mode: "enforce", audit: true },
}, async (input, ctx) => {
  await requireCustomerRead(ctx)
  return retryCustomerStatementDelivery({ ...retryCustomerStatementInputSchema.parse(input), organizationId: ctx.orgId, actorId: ctx.userId })
})

export async function retryCustomerStatementDeliveryAction(input: unknown) { return retryDelivery(input) }
