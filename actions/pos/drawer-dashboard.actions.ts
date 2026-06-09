"use server"

import { err, ok } from "@/services/_shared/action-response"
import { requireOrg } from "@/services/_shared/require-org"
import { drawerDashboardInputSchema } from "@/services/pos/drawer-dashboard.schemas"
import { getCashDrawerDashboard } from "@/services/pos/drawer-dashboard.service"

export async function getCashDrawerDashboardAction(input: unknown) {
  try {
    const { orgId } = await requireOrg()
    const parsed = drawerDashboardInputSchema.parse(input)
    const dashboard = await getCashDrawerDashboard({ ...parsed, organizationId: orgId })
    return ok(dashboard)
  } catch (error) {
    return err(error)
  }
}
