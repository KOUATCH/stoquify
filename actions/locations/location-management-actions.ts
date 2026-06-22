"use server"

import { revalidatePath } from "next/cache"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { db } from "@/prisma/db"
import { Prisma } from "@prisma/client"
import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import {
  archiveLocationForManagement,
  createLocationForManagement,
  getLocationManagementDataForOrg,
  updateLocationForManagement,
  type LocationManagementData,
  type LocationManagementRow,
  type LocationManagerOption,
} from "@/services/location/location.service"
import {
  LocationManagementSchema,
  type LocationManagementInput,
} from "@/services/location/location.schemas"

export type {
  LocationManagementData,
  LocationManagementInput,
  LocationManagementRow,
  LocationManagerOption,
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
  "Location not found",
  "Location was created but could not be reloaded",
  "Location was updated but could not be reloaded",
  "Selected manager does not belong to this organization",
  "This location has operational history. Deactivate it instead of archiving.",
])

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    const fieldName = String(error.meta?.field_name ?? error.meta?.constraint ?? "")

    if (fieldName.includes("organizationId") || fieldName.includes("locations_organizationId_fkey")) {
      return "Organization not found or inactive"
    }

    if (fieldName.includes("managerId")) {
      return "Selected manager does not belong to this organization"
    }

    return "Referenced record not found"
  }

  return error instanceof Error && ACTIONABLE_ERROR_MESSAGES.has(error.message)
    ? error.message
    : fallback
}

function getValidationMessage(input: unknown) {
  const parsed = LocationManagementSchema.safeParse(input)

  if (parsed.success) {
    return { success: true as const, data: parsed.data }
  }

  return {
    success: false as const,
    error: parsed.error.issues.map((issue) => issue.message).join("; ") || "Invalid location input",
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

function revalidateLocationPaths() {
  revalidatePath("/[locale]/dashboard/settings/locations", "page")
  revalidatePath("/[locale]/dashboard/inventory/items", "page")
  revalidatePath("/[locale]/dashboard/pos", "page")
  revalidatePath("/[locale]/dashboard/cashDrawer", "page")
}

export async function getLocationManagementData(
  organizationId: string,
): Promise<ActionResult<LocationManagementData>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, {
      permission: "locations.read",
      resource: "Location",
    })
    const data = await getLocationManagementDataForOrg(scopedOrganizationId)

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching location management data",
        error,
        { action: "getLocationManagementData" },
        getActionErrorMessage(error, "Failed to fetch location management data"),
      ),
    }
  }
}

export async function createManagedLocation(
  organizationId: string,
  input: LocationManagementInput,
): Promise<ActionResult<LocationManagementRow>> {
  try {
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, {
      permission: "locations.create",
      resource: "Location",
      auditAllowed: true,
    })
    const parsed = getValidationMessage(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await createLocationForManagement(scopedOrganizationId, parsed.data)
    revalidateLocationPaths()

    return { success: true, data: row }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error creating managed location",
        error,
        { action: "createManagedLocation" },
        getActionErrorMessage(error, "Failed to create location"),
      ),
    }
  }
}

export async function updateManagedLocation(
  organizationId: string,
  locationId: string,
  input: LocationManagementInput,
): Promise<ActionResult<LocationManagementRow>> {
  try {
    const scopedLocationId = cleanText(locationId)
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, {
      permission: "locations.update",
      resource: "Location",
      ...(scopedLocationId ? { resourceId: scopedLocationId } : {}),
      auditAllowed: true,
    })

    if (!scopedLocationId) {
      return { success: false, error: "Location not found" }
    }

    const parsed = getValidationMessage(input)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const row = await updateLocationForManagement(scopedOrganizationId, scopedLocationId, parsed.data)
    revalidateLocationPaths()

    return { success: true, data: row }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating managed location",
        error,
        { action: "updateManagedLocation" },
        getActionErrorMessage(error, "Failed to update location"),
      ),
    }
  }
}

export async function archiveManagedLocation(
  organizationId: string,
  locationId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const scopedLocationId = cleanText(locationId)
    const scopedOrganizationId = await assertOrganizationAccess(organizationId, {
      permission: "locations.delete",
      resource: "Location",
      ...(scopedLocationId ? { resourceId: scopedLocationId } : {}),
      auditAllowed: true,
    })

    if (!scopedLocationId) {
      return { success: false, error: "Location not found" }
    }

    const data = await archiveLocationForManagement(scopedOrganizationId, scopedLocationId)
    revalidateLocationPaths()

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error archiving managed location",
        error,
        { action: "archiveManagedLocation" },
        getActionErrorMessage(error, "Failed to archive location"),
      ),
    }
  }
}
