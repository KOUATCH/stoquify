"use server"

import { revalidatePath } from "next/cache"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { assertActiveOrganization } from "@/services/_shared/assert-active-organization"
import { BusinessRuleError, getPrismaKnownRequest, getPrismaKnownRequestField } from "@/services/_shared/action-errors"
import {
  createUnitForManagement,
  getUnitManagementDataForOrg,
  removeUnitForManagement,
  updateUnitForManagement,
  type UnitManagementData,
  type UnitManagementRow,
  type UnitRemovalResult,
} from "@/services/unit/unit.service"
import {
  UnitManagementSchema,
  type UnitManagementInput,
} from "@/services/unit/unit.schemas"

export type {
  UnitManagementData,
  UnitManagementInput,
  UnitManagementRow,
  UnitRemovalResult,
}

type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

const ACTIONABLE_ERROR_MESSAGES = new Set([
  "Unauthorized",
  "Forbidden: cannot access another organization",
  "Organization is required",
  "Organization not found or inactive",
  "You do not have access to this organization",
  "Unit not found",
  "Unit was created but could not be reloaded",
  "Unit was updated but could not be reloaded",
  "This unit is used by inventory items. Deactivate it instead of deleting.",
])

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getActionErrorMessage(error: unknown, fallback: string) {
  const prismaError = getPrismaKnownRequest(error)

  if (prismaError) {
    if (prismaError.code === "P2002") {
      return "A unit with that name or symbol already exists for this organization"
    }

    if (prismaError.code === "P2003") {
      const fieldName = getPrismaKnownRequestField(error)

      if (fieldName.includes("organizationId") || fieldName.includes("units_organizationId_fkey")) {
        return "Organization not found or inactive"
      }

      if (fieldName.includes("unitId") || fieldName.includes("items_unitId_fkey")) {
        return "This unit is used by inventory items. Deactivate it instead of deleting."
      }

      return "Referenced record not found"
    }
  }

  if (error instanceof Error) {
    if (ACTIONABLE_ERROR_MESSAGES.has(error.message)) {
      return error.message
    }

    if (
      error.message.startsWith("Unit name ") ||
      error.message.startsWith("Unit symbol ")
    ) {
      return error.message
    }
  }

  return fallback
}

function getValidationMessage(input: unknown) {
  const parsed = UnitManagementSchema.safeParse(input)

  if (parsed.success) {
    return { success: true as const, data: parsed.data }
  }

  return {
    success: false as const,
    error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid unit input",
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

  return assertActiveOrganization(requestedOrganizationId)
}

function revalidateUnitPaths() {
  revalidatePath("/dashboard/inventory/units", "page")
  revalidatePath("/dashboard/inventory/items", "page")
  revalidatePath("/[locale]/dashboard/inventory/units", "page")
  revalidatePath("/[locale]/dashboard/inventory/items", "page")
  revalidatePath("/[locale]/dashboard/pos", "page")
}

export async function getUnitManagementData(
  organizationId: string,
): Promise<ActionResult<UnitManagementData>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, {
      permission: "inventory.units.read",
      resource: "Unit",
    })
    const data = await getUnitManagementDataForOrg(scopedOrganizationId)

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching unit management data",
        error,
        { action: "getUnitManagementData" },
        getActionErrorMessage(error, "Failed to fetch unit management data"),
      ),
    }
  }
}

export async function createManagedUnit(
  organizationId: string,
  input: UnitManagementInput,
): Promise<ActionResult<UnitManagementRow>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, {
      permission: "inventory.units.create",
      resource: "Unit",
      auditAllowed: true,
    })
    const parsed = getValidationMessage(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await createUnitForManagement(scopedOrganizationId, parsed.data)
    revalidateUnitPaths()

    return { success: true, data: row }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error creating managed unit",
        error,
        { action: "createManagedUnit" },
        getActionErrorMessage(error, "Failed to create unit"),
      ),
    }
  }
}

export async function updateManagedUnit(
  organizationId: string,
  unitId: string,
  input: UnitManagementInput,
): Promise<ActionResult<UnitManagementRow>> {
  try {
    const scopedUnitId = cleanText(unitId)
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, {
      permission: "inventory.units.update",
      resource: "Unit",
      ...(scopedUnitId ? { resourceId: scopedUnitId } : {}),
      auditAllowed: true,
    })

    if (!scopedUnitId) {
      return { success: false, error: "Unit not found" }
    }

    const parsed = getValidationMessage(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await updateUnitForManagement(scopedOrganizationId, scopedUnitId, parsed.data)
    revalidateUnitPaths()

    return { success: true, data: row }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating managed unit",
        error,
        { action: "updateManagedUnit" },
        getActionErrorMessage(error, "Failed to update unit"),
      ),
    }
  }
}

export async function deleteManagedUnit(
  organizationId: string,
  unitId: string,
): Promise<ActionResult<UnitRemovalResult>> {
  try {
    const scopedUnitId = cleanText(unitId)
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, {
      permission: "inventory.units.delete",
      resource: "Unit",
      ...(scopedUnitId ? { resourceId: scopedUnitId } : {}),
      auditAllowed: true,
    })

    if (!scopedUnitId) {
      return { success: false, error: "Unit not found" }
    }

    const data = await removeUnitForManagement(scopedOrganizationId, scopedUnitId)
    revalidateUnitPaths()

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error deleting managed unit",
        error,
        { action: "deleteManagedUnit" },
        getActionErrorMessage(error, "Failed to remove unit"),
      ),
    }
  }
}
