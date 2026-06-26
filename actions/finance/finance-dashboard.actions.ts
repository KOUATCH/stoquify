"use server"

import { requireAnyPermission } from "@/lib/security/rbac"
import { err, ok } from "@/services/_shared/action-response"
import { getFinanceDashboardViewPermissions } from "@/services/finance/finance-dashboard-access"
import { financeDashboardInputSchema } from "@/services/finance/finance-dashboard.schemas"
import { getFinanceDashboard } from "@/services/finance/finance-dashboard.service"

export async function getFinanceDashboardAction(input: unknown) {
  try {
    const parsed = financeDashboardInputSchema.parse(input)
    const ctx = await requireAnyPermission(getFinanceDashboardViewPermissions(parsed.view), {
      resource: "FinanceDashboard",
      resourceId: parsed.view,
    })
    const dashboard = await getFinanceDashboard({ ...parsed, organizationId: ctx.orgId })
    return ok(dashboard)
  } catch (error) {
    return err(error)
  }
}
