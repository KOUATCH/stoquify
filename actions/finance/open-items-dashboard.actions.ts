"use server"

import { z } from "zod"
import { requireAnyPermission } from "@/lib/security/rbac"
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { err, ok } from "@/services/_shared/action-response"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getFinanceDashboardViewPermissions } from "@/services/finance/finance-dashboard-access"
import { openItemsScopeSchema } from "@/services/finance/open-items-dashboard.contract"
import { getOpenItemsDashboard } from "@/services/finance/open-items-dashboard.service"
import { getSalesCollections } from "@/services/analytics/sales-collections.service"

class PurchasingModuleUnavailable extends BusinessRuleError {}

async function guard(view: "receivables" | "payables") {
  const ctx = await requireAnyPermission(getFinanceDashboardViewPermissions(view), { resource: "OpenItemsDashboard", resourceId: view })
  if (view === "payables") {
    const decision = await observeModuleAccess({ organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions,
      moduleSlug: "purchasing", surfaceType: "action", surface: "actions/finance/open-items-dashboard.actions.ts", accessIntent: "read", mode: "enforce", audit: true })
    if (!decision.allowed) throw new PurchasingModuleUnavailable("Purchasing module is not available.")
  }
  return ctx
}

export async function getOpenItemsDashboardAction(input: unknown) {
  try {
    const scope = openItemsScopeSchema.parse(input)
    const ctx = await guard(scope.view)
    const data = await getOpenItemsDashboard(scope, ctx.orgId)
    const current = await guard(scope.view)
    if (current.orgId !== ctx.orgId || current.userId !== ctx.userId) throw new ForbiddenError("Dashboard session changed. Refresh the workspace.")
    return ok(data)
  } catch (error) { return { ...err(error), reason: error instanceof PurchasingModuleUnavailable ? "locked_module" as const : undefined } }
}

const collectionsSchema = z.object({
  locationId: z.string().trim().min(1).max(200).optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict()

/** Independent request: receipt failures or denial cannot remove invoice balances. */
export async function getReceivablesCollectionsAction(input: unknown) {
  try {
    const scope = collectionsSchema.parse(input)
    const ctx = await guard("receivables")
    const permissions = getFinanceDashboardViewPermissions("payments")
    if (!hasAnyRbacPermission(ctx.permissions, permissions)) return ok({ organizationId: ctx.orgId, state: "restricted" as const })
    const report = await getSalesCollections({ ...scope, preset: "custom", organizationId: ctx.orgId }, { includeCreditIssued: false })
    const current = await guard("receivables")
    if (current.orgId !== ctx.orgId || current.userId !== ctx.userId || !hasAnyRbacPermission(current.permissions, permissions)) throw new ForbiddenError("Collection access changed. Refresh the workspace.")
    // Do not return the sales-only credit-issued metric to an AR receipts caller.
    const { creditIssued: _creditIssued, ...collections } = report
    return ok({ organizationId: ctx.orgId, state: "ready" as const, report: collections })
  } catch (error) { return err(error) }
}

export async function getPayablesWorkflowDashboardAction(input: unknown = {}) {
  try {
    z.object({}).strict().parse(input)
    const ctx = await guard("payables")
    if (!hasAnyRbacPermission(ctx.permissions, ["purchasing.ap.invoice.view"])) return ok({ organizationId: ctx.orgId, state: "restricted" as const })
    const access = { approval: hasAnyRbacPermission(ctx.permissions, ["purchasing.ap.payment.approve"]), execution: hasAnyRbacPermission(ctx.permissions, ["purchasing.ap.payment.release"]) }
    const { getPayablesWorkflowDashboard } = await import("@/services/finance/payables-workflow-dashboard.service")
    const report = await getPayablesWorkflowDashboard(ctx.orgId, access)
    const current = await guard("payables")
    if (current.orgId !== ctx.orgId || current.userId !== ctx.userId || !hasAnyRbacPermission(current.permissions, ["purchasing.ap.invoice.view"]) || (access.approval && !hasAnyRbacPermission(current.permissions, ["purchasing.ap.payment.approve"])) || (access.execution && !hasAnyRbacPermission(current.permissions, ["purchasing.ap.payment.release"]))) throw new ForbiddenError("Workflow access changed. Refresh the workspace.")
    return ok({ organizationId: ctx.orgId, state: "ready" as const, report })
  } catch (error) { return err(error) }
}
