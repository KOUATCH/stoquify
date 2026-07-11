"use server"

import { promises as fs } from "fs"
import { logSafeActionWarning, safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import {
  assertCanUseOrganization,
  auditRbacDecision,
  requireAnyPermission,
  type RbacContext,
} from "@/lib/security/rbac"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import { revalidatePath } from "next/cache"
import { getStorageConfiguration } from "./storage-config-actions"
import { ApplicationError, BusinessRuleError } from "@/services/_shared/action-errors"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
}

async function requireInventoryPhotoWrite(
  organizationId: string,
  surface: string,
): Promise<RbacContext> {
  const ctx = await requireAnyPermission(
    ["inventory.items.create", "inventory.items.update"],
    { resource: "InventoryItemPhoto" },
  )
  await assertCanUseOrganization(ctx, organizationId)
  await observeModuleAccess({
    moduleSlug: "inventory",
    organizationId: ctx.orgId,
    userId: ctx.userId,
    actorPermissions: ctx.permissions,
    surfaceType: "action",
    surface,
    accessIntent: "write",
    mode: "observe",
  })
  await auditRbacDecision({
    ctx,
    permission: "inventory.items.create|inventory.items.update",
    result: "allowed",
    risk: "high",
    resource: "InventoryItemPhoto",
    reason: "Inventory item media write authorized",
  })
  return ctx
}

async function savePhotoLocally(
  file: File,
  organizationId: string,
  _localStoragePath: string,
): Promise<string> {
  const fileExtension = extensionByMimeType[file.type]
  if (!fileExtension) {
    throw new BusinessRuleError("Unsupported file type")
  }

  const fileName = `${uuidv4()}.${fileExtension}`
  const baseUploadsPath = path.join(process.cwd(), "public", "uploads")
  const orgDirectory = path.join(baseUploadsPath, organizationId)
  const filePath = path.join(orgDirectory, fileName)

  try {
    await fs.access(orgDirectory)
  } catch (error) {
    try {
      await fs.mkdir(orgDirectory, { recursive: true })
    } catch (mkdirError) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Failed to prepare upload storage",
        500,
        false,
        { organizationId, cause: mkdirError instanceof Error ? mkdirError.name : typeof mkdirError },
      )
    }
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await fs.writeFile(filePath, buffer)

  return `/uploads/${organizationId}/${fileName}`
}

async function deletePhotoLocally(
  photoPath: string,
  organizationId: string,
): Promise<boolean> {
  try {
    const baseUploadsPath = path.resolve(process.cwd(), "public", "uploads", organizationId)
    const expectedPrefix = `/uploads/${organizationId}/`

    if (!photoPath.startsWith(expectedPrefix)) {
      return false
    }

    const fileName = photoPath.slice(expectedPrefix.length)
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName) || fileName.includes("..")) {
      return false
    }

    const fullPath = path.resolve(baseUploadsPath, fileName)
    if (!fullPath.startsWith(`${baseUploadsPath}${path.sep}`)) {
      return false
    }

    await fs.unlink(fullPath)
    return true
  } catch (error) {
    logSafeActionWarning("Error deleting local photo", error, { action: "deletePhotoLocally" })
    return false
  }
}

export async function uploadPhoto(
  file: File,
  organizationId: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const requestedOrganizationId = organizationId?.trim()
    if (!requestedOrganizationId) {
      return { success: false, error: "Organization ID is required" }
    }

    const ctx = await requireInventoryPhotoWrite(
      requestedOrganizationId,
      "actions/storage/photo-upload-actions.ts#uploadPhoto",
    )
    const configResult = await getStorageConfiguration(ctx.orgId)
    if (!configResult.success || !configResult.data) {
      return { success: false, error: "Storage configuration not found" }
    }

    const config = configResult.data

    if (file.size > config.maxFileSize) {
      return {
        success: false,
        error: `File size exceeds maximum allowed size of ${config.maxFileSize / (1024 * 1024)}MB`,
      }
    }

    if (!config.allowedFileTypes.includes(file.type)) {
      return {
        success: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${config.allowedFileTypes.join(", ")}`,
      }
    }

    if (config.storageType !== "local") {
      return {
        success: false,
        error: "Online storage should be handled client-side through UploadThing component",
      }
    }

    const url = await savePhotoLocally(file, ctx.orgId, config.localStoragePath)
    return { success: true, url }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error uploading photo",
        error,
        { action: "inventory.items.media.upload" },
        "Failed to upload photo",
      ),
    }
  }
}

export async function deletePhoto(
  photoUrl: string,
  organizationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const requestedOrganizationId = organizationId?.trim()
    if (!requestedOrganizationId) {
      return { success: false, error: "Organization ID is required" }
    }

    const ctx = await requireInventoryPhotoWrite(
      requestedOrganizationId,
      "actions/storage/photo-upload-actions.ts#deletePhoto",
    )
    const configResult = await getStorageConfiguration(ctx.orgId)
    if (!configResult.success || !configResult.data) {
      return { success: false, error: "Storage configuration not found" }
    }

    const config = configResult.data

    if (config.storageType === "local") {
      const deleted = await deletePhotoLocally(photoUrl, ctx.orgId)
      if (!deleted) {
        return { success: false, error: "Failed to delete photo" }
      }
    }

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        "Error deleting photo",
        error,
        { action: "inventory.items.media.delete" },
        "Failed to delete photo",
      ),
    }
  }
}
