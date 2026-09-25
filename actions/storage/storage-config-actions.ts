"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { requireFreshAuth } from "@/lib/security/auth-session"
import {
  assertCanUseOrganization,
  requireAnyPermission,
  requirePermission,
  type RbacContext,
} from "@/lib/security/rbac"
import { assertActiveOrganization } from "@/services/_shared/assert-active-organization"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { PhotoStorageSettings, StorageType } from "@/types/storage"
import { PICTURE_MAX_BYTES, PICTURE_MIME_TYPES } from "@/lib/media/policy"
import { revalidatePath } from "next/cache"


type StorageSettings = PhotoStorageSettings & { alreadyExists?: boolean }

const defaultAllowedFileTypes = [...PICTURE_MIME_TYPES]
const defaultMaxFileSize = PICTURE_MAX_BYTES

function buildLocalStoragePath(organizationId: string) {
  return `/uploads/${organizationId}`
}

async function observeStorageConfigurationAccess(
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

async function requireStorageConfigurationRead(organizationId: string, surface: string) {
  const ctx = await requireAnyPermission(
    [
      "inventory.items.create",
      "inventory.items.update",
      "system.settings.read",
      "system.settings.update",
    ],
    { resource: "StorageConfiguration", resourceId: organizationId },
  )
  await assertCanUseOrganization(ctx, organizationId)
  await observeStorageConfigurationAccess(ctx, surface, "read")
  return ctx
}

async function requireStorageConfigurationWrite(organizationId: string, surface: string) {
  await requireFreshAuth(300)
  const ctx = await requirePermission("system.settings.update", {
    resource: "StorageConfiguration",
    resourceId: organizationId,
    auditAllowed: true,
  })
  await assertCanUseOrganization(ctx, organizationId)
  await observeStorageConfigurationAccess(ctx, surface, "write")
  return ctx
}

function defaultStorageConfiguration(
  organizationId: string,
  overrides: Partial<Pick<StorageSettings, "storageType" | "localStoragePath" | "maxFileSize" | "allowedFileTypes">> = {},
): StorageSettings {
  const now = new Date()

  return {
    id: `storage_${organizationId}`,
    organizationId,
    storageType: "online",
    localStoragePath: overrides.localStoragePath ?? buildLocalStoragePath(organizationId),
    maxFileSize: overrides.maxFileSize ?? defaultMaxFileSize,
    allowedFileTypes: overrides.allowedFileTypes ?? defaultAllowedFileTypes,
    createdAt: now,
    updatedAt: now,
  }
}


export async function getStorageConfiguration(organizationId: string) {
  try {
    const requestedOrganizationId = organizationId?.trim()

    if (!requestedOrganizationId) {
      return {
        success: false,
        error: "Organization ID is required",
        data: null,
      }
    }

    const ctx = await requireStorageConfigurationRead(
      requestedOrganizationId,
      "actions/storage/storage-config-actions.ts#getStorageConfiguration",
    )

    return {
      success: true,
      data: defaultStorageConfiguration(ctx.orgId, { localStoragePath: buildLocalStoragePath(ctx.orgId) }),
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error fetching storage configuration",
        error,
        { action: "system.settings.read" },
        "Failed to fetch storage configuration",
      ),
      data: null,
    }
  }
}

export async function updateStorageConfiguration(
  organizationId: string,
  storageType: StorageType,
  localStoragePath?: string,
  maxFileSize?: number,
  allowedFileTypes?: string[],
) {
  try {
    const requestedOrganizationId = organizationId?.trim()

    if (!requestedOrganizationId) {
      return {
        success: false,
        error: "Organization ID is required",
        data: null,
      }
    }

    const ctx = await requireStorageConfigurationWrite(
      requestedOrganizationId,
      "actions/storage/storage-config-actions.ts#updateStorageConfiguration",
    )

    // Storage policy is deployment-owned. Never acknowledge an unpersisted override.
    if (storageType !== "online" || localStoragePath ||
        (maxFileSize !== undefined && maxFileSize !== defaultMaxFileSize) ||
        (allowedFileTypes !== undefined && JSON.stringify([...allowedFileTypes].sort()) !== JSON.stringify([...defaultAllowedFileTypes].sort()))) {
      return { success: false, error: "Pictures use managed online storage with a 4 MB limit. Per-organization overrides are unavailable.", data: null }
    }
    const config = defaultStorageConfiguration(ctx.orgId)
    revalidatePath("/dashboard/settings")
    revalidatePath("/dashboard/settings/company")

    return {
      success: true,
      data: config,
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error updating storage configuration",
        error,
        { action: "system.settings.update" },
        "Failed to update storage configuration",
      ),
      data: null,
    }
  }
}

export async function initializeStorageForOrganization(organizationId: string) {
  try {
    const requestedOrganizationId = organizationId?.trim()

    if (!requestedOrganizationId) {
      return {
        success: false,
        error: "Organization ID is required",
        data: null,
      }
    }

    const ctx = await requireStorageConfigurationWrite(
      requestedOrganizationId,
      "actions/storage/storage-config-actions.ts#initializeStorageForOrganization",
    )

    await assertActiveOrganization(ctx.orgId)


    return {
      success: true,
      data: {
        ...defaultStorageConfiguration(ctx.orgId),
        alreadyExists: true,
      },
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error initializing storage configuration",
        error,
        { action: "system.settings.update" },
        "Failed to initialize storage configuration",
      ),
      data: null,
    }
  }
}
