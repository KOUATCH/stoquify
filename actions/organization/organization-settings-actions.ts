"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { getAuthenticatedUser } from "@/lib/auth-server"
import { revalidatePath } from "next/cache"
import { ForbiddenError } from "@/services/_shared/action-errors"
import {
  canCreateOrganizations,
  createOrganizationForSettings,
  getOrganizationManagementRowsForActor,
  getOrganizationSettingsForOrg,
  updateFiscalYearStartForOrg,
  updateInventoryStartDateForOrg,
  updateOrganizationCurrencyForOrg,
  updateOrganizationSettingsForOrg,
  updateOrganizationTimezoneForOrg,
  type CreateOrganizationSettingsInput,
  type OrganizationManagementRow,
  type OrganizationSettingsInput,
} from "@/services/organization/organization-settings.service"

export type {
  CreateOrganizationSettingsInput,
  OrganizationManagementRow,
  OrganizationSettingsInput,
}

async function assertOrganizationAccess(organizationId: string) {
  const user = await getAuthenticatedUser()

  if (user.organizationId !== organizationId) {
    throw new ForbiddenError("You do not have access to this organization")
  }

  return user
}

function revalidateOrganizationSettingsPaths() {
  revalidatePath("/[locale]/dashboard/settings/company", "page")
  revalidatePath("/[locale]/dashboard/settings/organization", "page")
}

export async function getOrganizationSettings(organizationId: string) {
  try {
    await assertOrganizationAccess(organizationId)
    const organization = await getOrganizationSettingsForOrg(organizationId)

    if (!organization) {
      return { success: false, error: "Organization not found" }
    }

    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching organization settings",
        error,
        { action: "getOrganizationSettings" },
        "Failed to fetch organization settings",
      ),
    }
  }
}

export async function getOrganizationManagementRows(
  organizationId: string,
): Promise<{ success: true; data: OrganizationManagementRow[] } | { success: false; error: string }> {
  try {
    const user = await assertOrganizationAccess(organizationId)
    const data = await getOrganizationManagementRowsForActor({ organizationId, actor: user })

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching organization management rows",
        error,
        { action: "getOrganizationManagementRows" },
        "Failed to fetch organization management rows",
      ),
    }
  }
}

export async function createOrganizationSettings(
  data: CreateOrganizationSettingsInput,
): Promise<{ success: true; data: OrganizationManagementRow } | { success: false; error: string }> {
  try {
    const user = await getAuthenticatedUser()

    if (!canCreateOrganizations(user)) {
      return { success: false, error: "You do not have permission to create organizations" }
    }

    if (!data.name.trim()) {
      return { success: false, error: "Organization name is required" }
    }

    const organization = await createOrganizationForSettings(data)
    revalidateOrganizationSettingsPaths()

    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error creating organization",
        error,
        { action: "createOrganizationSettings" },
        "Failed to create organization",
      ),
    }
  }
}

export async function updateOrganizationSettings(
  organizationId: string,
  data: OrganizationSettingsInput,
) {
  try {
    await assertOrganizationAccess(organizationId)
    const organization = await updateOrganizationSettingsForOrg(organizationId, data)

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating organization settings",
        error,
        { action: "updateOrganizationSettings" },
        "Failed to update organization settings",
      ),
    }
  }
}

export async function updateOrganizationCurrency(organizationId: string, currency: string) {
  try {
    await assertOrganizationAccess(organizationId)
    const organization = await updateOrganizationCurrencyForOrg(organizationId, currency)

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating organization currency",
        error,
        { action: "updateOrganizationCurrency" },
        "Failed to update organization currency",
      ),
    }
  }
}

export async function updateOrganizationTimezone(organizationId: string, timezone: string) {
  try {
    await assertOrganizationAccess(organizationId)
    const organization = await updateOrganizationTimezoneForOrg(organizationId, timezone)

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating organization timezone",
        error,
        { action: "updateOrganizationTimezone" },
        "Failed to update organization timezone",
      ),
    }
  }
}

export async function updateInventoryStartDate(organizationId: string, inventoryStartDate: Date) {
  try {
    await assertOrganizationAccess(organizationId)
    const organization = await updateInventoryStartDateForOrg(organizationId, inventoryStartDate)

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating inventory start date",
        error,
        { action: "updateInventoryStartDate" },
        "Failed to update inventory start date",
      ),
    }
  }
}

export async function updateFiscalYearStart(organizationId: string, fiscalYearStart: string) {
  try {
    await assertOrganizationAccess(organizationId)
    const organization = await updateFiscalYearStartForOrg(organizationId, fiscalYearStart)

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating fiscal year start",
        error,
        { action: "updateFiscalYearStart" },
        "Failed to update fiscal year start",
      ),
    }
  }
}
