"use server"

import { getTaxRateManagementData } from "@/actions/taxRate/tax-rate-management-actions"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

const getOrgTaxRates = async (organizationId: string) => {
  const ctx = await requirePermission("taxes.read", { resource: "TaxRate" })
  const result = await getTaxRateManagementData(organizationId)

  if (!result.success || !result.data) {
    return {
      error: result.error || "Failed to fetch tax rates",
      success: false,
      data: [],
    }
  }

  await observeModuleAccess({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    moduleSlug: "settings",
    surfaceType: "action",
    surface: "actions/taxRate/getOrgTaxRates.ts",
    accessIntent: "read",
    mode: "observe",
  })

  return {
    error: null,
    success: true,
    data: result.data.taxRates,
  }
}

export default getOrgTaxRates
