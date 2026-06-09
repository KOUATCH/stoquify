"use server"

import { getSession } from "@/lib/auth-server"
import { db } from "@/prisma/db"
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

async function requireMatchingOrganization(organizationId: string) {
  const session = await getSession()
  if (!session?.user?.organizationId) {
    return { ok: false as const, error: "Unauthorized" }
  }

  if (session.user.organizationId !== organizationId) {
    return { ok: false as const, error: "Forbidden" }
  }

  return { ok: true as const }
}

function defaultStorageConfiguration(
  organizationId: string,
  overrides: Partial<Pick<StorageSettings, "storageType" | "localStoragePath" | "maxFileSize" | "allowedFileTypes">> = {}
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
    const trimmedOrgId = organizationId?.trim()

    if (!trimmedOrgId) {
      return {
        success: false,
        error: "Organization ID is required",
        data: null,
      }
    }

    const authz = await requireMatchingOrganization(trimmedOrgId)
    if (!authz.ok) {
      return {
        success: false,
        error: authz.error,
        data: null,
      }
    }

    await ensureLocalStorageDirectories(trimmedOrgId)

    return {
      success: true,
      data: defaultStorageConfiguration(trimmedOrgId, { localStoragePath: buildLocalStoragePath(trimmedOrgId) }),
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch storage configuration",
      data: null,
    }
  }
}

export async function updateStorageConfiguration(
  organizationId: string,
  storageType: StorageType,
  localStoragePath?: string,
  maxFileSize?: number,
  allowedFileTypes?: string[]
) {
  try {
    const trimmedOrgId = organizationId?.trim()

    if (!trimmedOrgId) {
      return {
        success: false,
        error: "Organization ID is required",
        data: null,
      }
    }

    const authz = await requireMatchingOrganization(trimmedOrgId)
    if (!authz.ok) {
      return {
        success: false,
        error: authz.error,
        data: null,
      }
    }

    if (storageType !== "local" && storageType !== "online") {
      return {
        success: false,
        error: 'Storage type must be either "local" or "online"',
        data: null,
      }
    }

    const config = defaultStorageConfiguration(trimmedOrgId, {
      storageType,
      localStoragePath: localStoragePath || buildLocalStoragePath(trimmedOrgId),
      maxFileSize: maxFileSize || defaultMaxFileSize,
      allowedFileTypes: allowedFileTypes || defaultAllowedFileTypes,
    })

    if (config.storageType === "local") {
      await ensureLocalStorageDirectories(trimmedOrgId)
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
      error: error instanceof Error ? error.message : "Failed to update storage configuration",
      data: null,
    }
  }
}

export async function initializeStorageForOrganization(organizationId: string) {
  try {
    const trimmedOrgId = organizationId?.trim()

    if (!trimmedOrgId) {
      return {
        success: false,
        error: "Organization ID is required",
        data: null,
      }
    }

    const authz = await requireMatchingOrganization(trimmedOrgId)
    if (!authz.ok) {
      return {
        success: false,
        error: authz.error,
        data: null,
      }
    }

    const organizationExists = await db.organization.findUnique({
      where: { id: trimmedOrgId },
      select: { id: true },
    })

    if (!organizationExists) {
      return {
        success: false,
        error: `Organization not found: ${trimmedOrgId}`,
        data: null,
      }
    }

    await ensureLocalStorageDirectories(trimmedOrgId)

    return {
      success: true,
      data: {
        ...defaultStorageConfiguration(trimmedOrgId),
        alreadyExists: true,
      },
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to initialize storage configuration",
      data: null,
    }
  }
}
