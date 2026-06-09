"use server"

import { err, ok } from "@/services/_shared/action-response"
import { requireOrg } from "@/services/_shared/require-org"
import { financeDashboardInputSchema } from "@/services/finance/finance-dashboard.schemas"
import { getFinanceDashboard } from "@/services/finance/finance-dashboard.service"

export async function getFinanceDashboardAction(input: unknown) {
  try {
    const { orgId } = await requireOrg()
    const parsed = financeDashboardInputSchema.parse(input)
    const dashboard = await getFinanceDashboard({ ...parsed, organizationId: orgId })
    return ok(dashboard)
  } catch (error) {
    return err(error)
  }
}
