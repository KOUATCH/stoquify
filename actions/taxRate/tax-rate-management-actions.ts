"use server"

import { revalidatePath } from "next/cache"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { assertActiveOrganization } from "@/services/_shared/assert-active-organization"
import { BusinessRuleError, getPrismaKnownRequest, getPrismaKnownRequestField } from "@/services/_shared/action-errors"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { ModuleAccessIntent } from "@/services/modules/module-control-contracts"
import {
  createTaxRateForManagement,
  getTaxRateManagementDataForOrg,
  removeTaxRateForManagement,
  updateTaxRateForManagement,
  type TaxRateManagementData,
  type TaxRateManagementRow,
  type TaxRateRemovalResult,
} from "@/services/tax-rate/tax-rate.service"
import {
  TaxRateManagementSchema,
  type TaxRateManagementInput,
} from "@/services/tax-rate/tax-rate.schemas"

export type {
  TaxRateManagementData,
  TaxRateManagementInput,
  TaxRateManagementRow,
  TaxRateRemovalResult,
}

type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

type PermissionContext = Awaited<ReturnType<typeof requirePermission>>

const ACTIONABLE_ERROR_MESSAGES = new Set([
  "Unauthorized",
  "Forbidden: cannot access another organization",
  "Organization is required",
  "Organization not found or inactive",
  "You do not have access to this organization",
  "Tax rate not found",
  "Tax rate was created but could not be reloaded",
  "Tax rate was updated but could not be reloaded",
  "This tax rate is used by items. Deactivate it instead of deleting.",
])

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getActionErrorMessage(error: unknown, fallback: string) {
  const prismaError = getPrismaKnownRequest(error)

  if (prismaError) {
    if (prismaError.code === "P2002") {
      return "A tax rate with that name already exists for this organization"
    }

    if (prismaError.code === "P2003") {
      const fieldName = getPrismaKnownRequestField(error)

      if (fieldName.includes("organizationId") || fieldName.includes("tax_rates_organizationId_fkey")) {
        return "Organization not found or inactive"
      }

      if (fieldName.includes("taxRateId") || fieldName.includes("items_taxRateId_fkey")) {
        return "This tax rate is used by items. Deactivate it instead of deleting."
      }

      return "Referenced record not found"
    }
  }

  if (error instanceof Error) {
    if (ACTIONABLE_ERROR_MESSAGES.has(error.message)) {
      return error.message
    }

    if (error.message.startsWith("Tax rate ")) {
      return error.message
    }
  }

  return fallback
}

function getValidationMessage(input: unknown) {
  const parsed = TaxRateManagementSchema.safeParse(input)

  if (parsed.success) {
    return { success: true as const, data: parsed.data }
  }

  return {
    success: false as const,
    error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid tax rate input",
  }
}

async function assertOrganizationAccess(
  organizationId: string,
  options: { permission: string; resource: string; resourceId?: string; auditAllowed?: boolean },
) {
  const requestedOrganizationId = cleanText(organizationId)

  if (!requestedOrganizationId) {
    throw new BusinessRuleError("Organization is required")
  }

  const ctx = await requirePermission(options.permission, {
    resource: options.resource,
    ...(options.resourceId ? { resourceId: options.resourceId } : {}),
    ...(options.auditAllowed !== undefined ? { auditAllowed: options.auditAllowed } : {}),
  })
  await assertCanUseOrganization(ctx, requestedOrganizationId)

  return {
    organizationId: await assertActiveOrganization(requestedOrganizationId),
    ctx,
  }
}

async function observeTaxRateAccess(
  ctx: PermissionContext,
  accessIntent: ModuleAccessIntent,
) {
  await observeModuleAccess({
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    moduleSlug: "settings",
    surfaceType: "action",
    surface: "actions/taxRate/tax-rate-management-actions.ts",
    accessIntent,
    mode: "observe",
  })
}

function revalidateTaxRatePaths() {
  revalidatePath("/dashboard/settings/tax-rates", "page")
  revalidatePath("/dashboard/inventory/items", "page")
  revalidatePath("/[locale]/dashboard/settings/tax-rates", "page")
  revalidatePath("/[locale]/dashboard/inventory/items", "page")
  revalidatePath("/[locale]/dashboard/pos", "page")
}

export async function getTaxRateManagementData(
  organizationId: string,
): Promise<ActionResult<TaxRateManagementData>> {
  try {
    const access = await assertOrganizationAccess(organizationId, {
      permission: "taxes.read",
      resource: "TaxRate",
    })
    const data = await getTaxRateManagementDataForOrg(access.organizationId)
    await observeTaxRateAccess(access.ctx, "read")

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching tax rate management data",
        error,
        { action: "getTaxRateManagementData" },
        getActionErrorMessage(error, "Failed to fetch tax rate management data"),
      ),
    }
  }
}

export async function createManagedTaxRate(
  organizationId: string,
  input: TaxRateManagementInput,
): Promise<ActionResult<TaxRateManagementRow>> {
  try {
    const access = await assertOrganizationAccess(organizationId, {
      permission: "taxes.create",
      resource: "TaxRate",
      auditAllowed: true,
    })
    const parsed = getValidationMessage(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await createTaxRateForManagement(access.organizationId, parsed.data)
    await observeTaxRateAccess(access.ctx, "write")
    revalidateTaxRatePaths()

    return { success: true, data: row }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error creating managed tax rate",
        error,
        { action: "createManagedTaxRate" },
        getActionErrorMessage(error, "Failed to create tax rate"),
      ),
    }
  }
}

export async function updateManagedTaxRate(
  organizationId: string,
  taxRateId: string,
  input: TaxRateManagementInput,
): Promise<ActionResult<TaxRateManagementRow>> {
  try {
    const scopedTaxRateId = cleanText(taxRateId)
    const access = await assertOrganizationAccess(organizationId, {
      permission: "taxes.update",
      resource: "TaxRate",
      ...(scopedTaxRateId ? { resourceId: scopedTaxRateId } : {}),
      auditAllowed: true,
    })

    if (!scopedTaxRateId) {
      return { success: false, error: "Tax rate not found" }
    }

    const parsed = getValidationMessage(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await updateTaxRateForManagement(access.organizationId, scopedTaxRateId, parsed.data)
    await observeTaxRateAccess(access.ctx, "write")
    revalidateTaxRatePaths()

    return { success: true, data: row }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating managed tax rate",
        error,
        { action: "updateManagedTaxRate" },
        getActionErrorMessage(error, "Failed to update tax rate"),
      ),
    }
  }
}

export async function deleteManagedTaxRate(
  organizationId: string,
  taxRateId: string,
): Promise<ActionResult<TaxRateRemovalResult>> {
  try {
    const scopedTaxRateId = cleanText(taxRateId)
    const access = await assertOrganizationAccess(organizationId, {
      permission: "taxes.delete",
      resource: "TaxRate",
      ...(scopedTaxRateId ? { resourceId: scopedTaxRateId } : {}),
      auditAllowed: true,
    })

    if (!scopedTaxRateId) {
      return { success: false, error: "Tax rate not found" }
    }

    const data = await removeTaxRateForManagement(access.organizationId, scopedTaxRateId)
    await observeTaxRateAccess(access.ctx, "write")
    revalidateTaxRatePaths()

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error deleting managed tax rate",
        error,
        { action: "deleteManagedTaxRate" },
        getActionErrorMessage(error, "Failed to remove tax rate"),
      ),
    }
  }
}
