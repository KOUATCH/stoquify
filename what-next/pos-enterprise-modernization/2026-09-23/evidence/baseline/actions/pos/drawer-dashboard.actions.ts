"use server"

import { err, ok } from "@/services/_shared/action-response"
import { requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { drawerDashboardInputSchema } from "@/services/pos/drawer-dashboard.schemas"
import { getCashDrawerDashboard } from "@/services/pos/drawer-dashboard.service"

function optionalStringField(input: unknown, field: string) {
  if (!input || typeof input !== "object") return undefined
  const value = (input as Record<string, unknown>)[field]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export async function getCashDrawerDashboardAction(input: unknown) {
  try {
    const ctx = await requireAnyPermission(["finance.cash-drawer.read", "finance.read"], {
      resource: "CashDrawerDashboard",
      resourceId: optionalStringField(input, "locationId"),
    })
    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "pos",
      surfaceType: "action",
      surface: "actions/pos/drawer-dashboard.actions.ts:getCashDrawerDashboardAction",
      accessIntent: "read",
      mode: "observe",
      audit: true,
    })
    const parsed = drawerDashboardInputSchema.parse(input)
    const dashboard = await getCashDrawerDashboard({ ...parsed, organizationId: ctx.orgId })
    return ok(dashboard)
  } catch (error) {
    return err(error)
  }
}
