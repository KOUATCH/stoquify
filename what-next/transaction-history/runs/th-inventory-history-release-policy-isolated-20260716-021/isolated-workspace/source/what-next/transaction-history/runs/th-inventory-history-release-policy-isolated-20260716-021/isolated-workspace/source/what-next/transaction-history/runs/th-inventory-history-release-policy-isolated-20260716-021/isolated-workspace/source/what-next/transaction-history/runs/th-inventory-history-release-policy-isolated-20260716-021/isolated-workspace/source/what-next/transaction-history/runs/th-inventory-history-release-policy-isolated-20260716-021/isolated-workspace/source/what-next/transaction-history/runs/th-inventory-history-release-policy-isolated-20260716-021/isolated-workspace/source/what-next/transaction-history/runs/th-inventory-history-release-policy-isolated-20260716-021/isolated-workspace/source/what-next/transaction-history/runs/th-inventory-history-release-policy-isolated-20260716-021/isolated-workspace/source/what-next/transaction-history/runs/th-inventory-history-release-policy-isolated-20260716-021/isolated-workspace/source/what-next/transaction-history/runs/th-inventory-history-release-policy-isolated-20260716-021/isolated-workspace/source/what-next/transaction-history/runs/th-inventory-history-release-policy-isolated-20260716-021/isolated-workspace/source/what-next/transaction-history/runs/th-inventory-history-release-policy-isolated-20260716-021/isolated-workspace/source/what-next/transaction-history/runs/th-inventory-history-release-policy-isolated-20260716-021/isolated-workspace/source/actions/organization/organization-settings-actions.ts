"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { assertCanUseOrganization, requirePermission, type RbacContext } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { revalidatePath } from "next/cache"
import {
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

async function observeOrganizationSettingsAccess(
  ctx: RbacContext,
  surface: string,
  accessIntent: "read" | "write",
) {
  await observeModuleAccess({
    moduleSlug: "settings",
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    surfaceType: "action",
    surface,
    accessIntent,
    mode: "observe",
  })
}

async function requireOrganizationRead(organizationId: string, surface: string) {
  const requestedOrganizationId = organizationId.trim()
  const ctx = await requirePermission("system.organization.read", {
    resource: "Organization",
    resourceId: requestedOrganizationId,
  })

  await assertCanUseOrganization(ctx, requestedOrganizationId)
  await observeOrganizationSettingsAccess(ctx, surface, "read")

  return ctx
}

async function requireOrganizationWrite(organizationId: string, surface: string) {
  const requestedOrganizationId = organizationId.trim()

  await requireFreshAuth(300)
  const ctx = await requirePermission("system.organization.update", {
    resource: "Organization",
    resourceId: requestedOrganizationId,
    auditAllowed: true,
  })

  await assertCanUseOrganization(ctx, requestedOrganizationId)
  await observeOrganizationSettingsAccess(ctx, surface, "write")

  return ctx
}

function revalidateOrganizationSettingsPaths() {
  revalidatePath("/[locale]/dashboard/settings/company", "page")
  revalidatePath("/[locale]/dashboard/settings/organization", "page")
}

export async function getOrganizationSettings(organizationId: string) {
  try {
    const ctx = await requireOrganizationRead(organizationId, "actions/organization/organization-settings-actions.ts#getOrganizationSettings")
    const organization = await getOrganizationSettingsForOrg(ctx.orgId)

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
        { action: "system.organization.read" },
        "Failed to fetch organization settings",
      ),
    }
  }
}

export async function getOrganizationManagementRows(
  organizationId: string,
): Promise<{ success: true; data: OrganizationManagementRow[] } | { success: false; error: string }> {
  try {
    const ctx = await requireOrganizationRead(organizationId, "actions/organization/organization-settings-actions.ts#getOrganizationManagementRows")
    const data = await getOrganizationManagementRowsForActor({ organizationId: ctx.orgId, actor: ctx.user })

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching organization management rows",
        error,
        { action: "system.organization.read" },
        "Failed to fetch organization management rows",
      ),
    }
  }
}

export async function createOrganizationSettings(
  data: CreateOrganizationSettingsInput,
): Promise<{ success: true; data: OrganizationManagementRow } | { success: false; error: string }> {
  try {
    await requireFreshAuth(300)
    const ctx = await requirePermission("system.organization.update", {
      resource: "Organization",
      auditAllowed: true,
    })

    await observeOrganizationSettingsAccess(
      ctx,
      "actions/organization/organization-settings-actions.ts#createOrganizationSettings",
      "write",
    )

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
        { action: "system.organization.update" },
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
    const ctx = await requireOrganizationWrite(
      organizationId,
      "actions/organization/organization-settings-actions.ts#updateOrganizationSettings",
    )
    const organization = await updateOrganizationSettingsForOrg(ctx.orgId, data)

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating organization settings",
        error,
        { action: "system.organization.update" },
        "Failed to update organization settings",
      ),
    }
  }
}

export async function updateOrganizationCurrency(organizationId: string, currency: string) {
  try {
    const ctx = await requireOrganizationWrite(
      organizationId,
      "actions/organization/organization-settings-actions.ts#updateOrganizationCurrency",
    )
    const organization = await updateOrganizationCurrencyForOrg(ctx.orgId, currency)

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating organization currency",
        error,
        { action: "system.organization.update" },
        "Failed to update organization currency",
      ),
    }
  }
}

export async function updateOrganizationTimezone(organizationId: string, timezone: string) {
  try {
    const ctx = await requireOrganizationWrite(
      organizationId,
      "actions/organization/organization-settings-actions.ts#updateOrganizationTimezone",
    )
    const organization = await updateOrganizationTimezoneForOrg(ctx.orgId, timezone)

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating organization timezone",
        error,
        { action: "system.organization.update" },
        "Failed to update organization timezone",
      ),
    }
  }
}

export async function updateInventoryStartDate(organizationId: string, inventoryStartDate: Date) {
  try {
    const ctx = await requireOrganizationWrite(
      organizationId,
      "actions/organization/organization-settings-actions.ts#updateInventoryStartDate",
    )
    const organization = await updateInventoryStartDateForOrg(ctx.orgId, inventoryStartDate)

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating inventory start date",
        error,
        { action: "system.organization.update" },
        "Failed to update inventory start date",
      ),
    }
  }
}

export async function updateFiscalYearStart(organizationId: string, fiscalYearStart: string) {
  try {
    const ctx = await requireOrganizationWrite(
      organizationId,
      "actions/organization/organization-settings-actions.ts#updateFiscalYearStart",
    )
    const organization = await updateFiscalYearStartForOrg(ctx.orgId, fiscalYearStart)

    revalidateOrganizationSettingsPaths()
    return { success: true, data: organization }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating fiscal year start",
        error,
        { action: "system.organization.update" },
        "Failed to update fiscal year start",
      ),
    }
  }
}
