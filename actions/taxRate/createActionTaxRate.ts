"use server"

import { createManagedTaxRate } from "@/actions/taxRate/tax-rate-management-actions"
import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { assertActiveOrganization } from "@/services/_shared/assert-active-organization"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { TaxRateManagementInput } from "@/actions/taxRate/tax-rate-management-actions"
import type { TaxRateCreateDTO } from "@/types/taxRates"

function normalizeTaxRateInput(data: TaxRateCreateDTO): TaxRateManagementInput {
  return {
    nameEn: data.nameEn ?? data.taxRateName ?? data.name ?? "",
    nameFr: data.nameFr ?? null,
    rate: Number(data.rate ?? 0),
    type: (data.type as TaxRateManagementInput["type"]) ?? "SALES",
    isActive: data.isActive ?? true,
  }
}

const createActionTaxRate = async (data: TaxRateCreateDTO & { organizationId: string }) => {
  try {
    const ctx = await requirePermission("taxes.create", {
      resource: "TaxRate",
      auditAllowed: true,
    })
    const requestedOrganizationId = data.organizationId?.trim()

    if (!requestedOrganizationId) {
      return {
        success: false,
        error: "Organization is required",
        data: null,
      }
    }

    await assertCanUseOrganization(ctx, requestedOrganizationId)
    const organizationId = await assertActiveOrganization(requestedOrganizationId)
    const result = await createManagedTaxRate(organizationId, normalizeTaxRateInput(data))

    if (result.success) {
      await observeModuleAccess({
        organizationId,
        userId: ctx.userId,
        actorPermissions: ctx.permissions,
        moduleSlug: "settings",
        surfaceType: "action",
        surface: "actions/taxRate/createActionTaxRate.ts",
        accessIntent: "write",
        mode: "observe",
      })
    }

    return {
      success: result.success,
      error: result.error ?? null,
      data: result.data ?? null,
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error creating action tax rate",
        error,
        { action: "createActionTaxRate" },
        "Failed to create tax rate",
      ),
      data: null,
    }
  }
}

export default createActionTaxRate
