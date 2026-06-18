"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth-server"
import { db } from "@/prisma/db"
import { Prisma } from "@prisma/client"
import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { AuthRequiredError, BusinessRuleError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
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
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "A unit with that name or symbol already exists for this organization"
    }

    if (error.code === "P2003") {
      const fieldName = String(error.meta?.field_name ?? error.meta?.constraint ?? "")

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

async function assertOrganizationAccess(organizationId: string) {
  const requestedOrganizationId = cleanText(organizationId)

  if (!requestedOrganizationId) {
    throw new BusinessRuleError("Organization is required")
  }

  const session = await getSession()

  if (!session?.user?.id) {
    throw new AuthRequiredError("Unauthorized")
  }

  const user = await db.user.findFirst({
    where: {
      id: session.user.id,
      isActive: true,
    },
    select: {
      organizationId: true,
      roles: {
        select: {
          permissions: true,
        },
      },
    },
  })

  if (!user) {
    throw new AuthRequiredError("Unauthorized")
  }

  const permissions = new Set([
    ...((session.user as any).permissions ?? []),
    ...user.roles.flatMap((role) => role.permissions ?? []),
  ])

  if (user.organizationId !== requestedOrganizationId && !permissions.has("*")) {
    throw new ForbiddenError("You do not have access to this organization")
  }

  const organization = await db.organization.findFirst({
    where: {
      id: requestedOrganizationId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!organization) {
    throw new NotFoundError("Organization not found or inactive")
  }

  return organization.id
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
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
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
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
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
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
    const scopedUnitId = cleanText(unitId)

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
    const scopedOrganizationId = await assertOrganizationAccess(organizationId)
    const scopedUnitId = cleanText(unitId)

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
