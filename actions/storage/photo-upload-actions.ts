"use server"

import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { uploadItemPicture, deleteUnattachedPicture } from "@/services/media/picture.service"
import { requireInventoryPhotoWrite } from "@/services/media/picture-authorization"

export async function uploadPhoto(file: File, organizationId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (!organizationId?.trim()) return { success: false, error: "Organization ID is required" }
    const ctx = await requireInventoryPhotoWrite(organizationId.trim(), "actions/storage/photo-upload-actions.ts#uploadPhoto")
    const url = await uploadItemPicture(file, ctx.orgId, ctx.userId)
    return { success: true, url }
  } catch (error) {
    return { success: false, error: safeLoggedActionErrorMessage("Error uploading photo", error, { action: "inventory.items.media.upload" }, "Failed to upload photo") }
  }
}

export async function deletePhoto(photoUrl: string, organizationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!organizationId?.trim()) return { success: false, error: "Organization ID is required" }
    const ctx = await requireInventoryPhotoWrite(organizationId.trim(), "actions/storage/photo-upload-actions.ts#deletePhoto")
    await deleteUnattachedPicture(photoUrl, ctx.orgId, ctx.userId)
    return { success: true }
  } catch (error) {
    return { success: false, error: safeLoggedActionErrorMessage("Error deleting photo", error, { action: "inventory.items.media.delete" }, "Failed to delete photo") }
  }
}
