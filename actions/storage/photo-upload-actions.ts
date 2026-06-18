"use server"

import { promises as fs } from 'fs'
import { logSafeActionWarning, safeLoggedActionErrorMessage } from '@/actions/_shared/safe-action-responses'
import { getSession } from '@/lib/auth-server'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { revalidatePath } from 'next/cache'
import { getStorageConfiguration } from './storage-config-actions'
import { ApplicationError, BusinessRuleError } from '@/services/_shared/action-errors'

// Directory creation is now handled during storage configuration save
// This ensures folders exist before upload attempts

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

async function requireMatchingOrganization(organizationId: string) {
  const session = await getSession()
  if (!session?.user?.organizationId) {
    return { ok: false as const, error: 'Unauthorized', status: 401 }
  }

  if (session.user.organizationId !== organizationId) {
    return { ok: false as const, error: 'Forbidden', status: 403 }
  }

  return { ok: true as const }
}

async function savePhotoLocally(
  file: File,
  organizationId: string,
  localStoragePath: string
): Promise<string> {
  const fileExtension = extensionByMimeType[file.type]
  if (!fileExtension) {
    throw new BusinessRuleError('Unsupported file type')
  }

  const fileName = `${uuidv4()}.${fileExtension}`

  // Use public/uploads path structure
  const baseUploadsPath = path.join(process.cwd(), 'public', 'uploads')
  const orgDirectory = path.join(baseUploadsPath, organizationId)
  const filePath = path.join(orgDirectory, fileName)

  // Ensure directory exists, create if it doesn't
  try {
    await fs.access(orgDirectory)
  } catch (error) {
    // Directory doesn't exist, create it
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

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Save file
  await fs.writeFile(filePath, buffer)

  // Return relative path from public directory
  return `/uploads/${organizationId}/${fileName}`
}

async function deletePhotoLocally(
  photoPath: string,
  organizationId: string
): Promise<boolean> {
  try {
    const baseUploadsPath = path.resolve(process.cwd(), 'public', 'uploads', organizationId)
    const expectedPrefix = `/uploads/${organizationId}/`

    if (!photoPath.startsWith(expectedPrefix)) {
      return false
    }

    const fileName = photoPath.slice(expectedPrefix.length)
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName) || fileName.includes('..')) {
      return false
    }

    const fullPath = path.resolve(baseUploadsPath, fileName)
    if (!fullPath.startsWith(`${baseUploadsPath}${path.sep}`)) {
      return false
    }

    await fs.unlink(fullPath)
    return true
  } catch (error) {
    logSafeActionWarning('Error deleting local photo', error, { action: 'deletePhotoLocally' })
    return false
  }
}

export async function uploadPhoto(
  file: File,
  organizationId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const authz = await requireMatchingOrganization(organizationId)
    if (!authz.ok) {
      return { success: false, error: authz.error }
    }

    // Get current storage configuration
    const configResult = await getStorageConfiguration(organizationId)
    if (!configResult.success || !configResult.data) {
      return { success: false, error: 'Storage configuration not found' }
    }

    const config = configResult.data

    // Validate file size
    if (file.size > config.maxFileSize) {
      return {
        success: false,
        error: `File size exceeds maximum allowed size of ${config.maxFileSize / (1024 * 1024)}MB`
      }
    }

    // Validate file type
    if (!config.allowedFileTypes.includes(file.type)) {
      return {
        success: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${config.allowedFileTypes.join(', ')}`
      }
    }

    // Upload the file based on storage type
    let url: string

    if (config.storageType === 'local') {
      url = await savePhotoLocally(file, organizationId, config.localStoragePath)
    } else {
      // For online storage, we'll use the existing UploadThing flow
      // This is handled client-side in the component
      return {
        success: false,
        error: 'Online storage should be handled client-side through UploadThing component'
      }
    }

    return { success: true, url }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        'Error uploading photo',
        error,
        { action: 'uploadPhoto' },
        'Failed to upload photo',
      )
    }
  }
}

export async function deletePhoto(
  photoUrl: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authz = await requireMatchingOrganization(organizationId)
    if (!authz.ok) {
      return { success: false, error: authz.error }
    }

    // Get current storage configuration
    const configResult = await getStorageConfiguration(organizationId)
    if (!configResult.success || !configResult.data) {
      return { success: false, error: 'Storage configuration not found' }
    }

    const config = configResult.data

    if (config.storageType === 'local') {
      const deleted = await deletePhotoLocally(photoUrl, organizationId)
      if (!deleted) {
        return { success: false, error: 'Failed to delete photo' }
      }
    }
    // For online storage, deletion would be handled differently
    // UploadThing doesn't provide easy deletion APIs

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: safeLoggedActionErrorMessage(
        'Error deleting photo',
        error,
        { action: 'deletePhoto' },
        'Failed to delete photo',
      )
    }
  }
}
