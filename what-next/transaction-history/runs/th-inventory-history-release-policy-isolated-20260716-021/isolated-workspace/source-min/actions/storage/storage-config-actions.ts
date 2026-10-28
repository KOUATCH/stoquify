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
import { promises as fs } from "fs"
import { revalidatePath } from "next/cache"
import path from "path"

type StorageSettings = PhotoStorageSettings & { alreadyExists?: boolean }

const defaultAllowedFileTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const defaultMaxFileSize = 1024 * 1024

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
    storageType: overrides.storageType ?? "local",
    localStoragePath: overrides.localStoragePath ?? buildLocalStoragePath(organizationId),
    maxFileSize: overrides.maxFileSize ?? defaultMaxFileSize,
    allowedFileTypes: overrides.allowedFileTypes ?? defaultAllowedFileTypes,
    createdAt: now,
    updatedAt: now,
  }
}

async function ensureLocalStorageDirectories(organizationId: string) {
  const orgDirectory = path.join(process.cwd(), "public", "uploads", organizationId)
  await fs.mkdir(orgDirectory, { recursive: true })
  return orgDirectory
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

    if (storageType !== "local" && storageType !== "online") {
      return {
        success: false,
        error: 'Storage type must be either "local" or "online"',
        data: null,
      }
    }

    const config = defaultStorageConfiguration(ctx.orgId, {
      storageType,
      localStoragePath: localStoragePath || buildLocalStoragePath(ctx.orgId),
      maxFileSize: maxFileSize || defaultMaxFileSize,
      allowedFileTypes: allowedFileTypes || defaultAllowedFileTypes,
    })

    if (config.storageType === "local") {
      await ensureLocalStorageDirectories(ctx.orgId)
    }

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
    await ensureLocalStorageDirectories(ctx.orgId)

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
