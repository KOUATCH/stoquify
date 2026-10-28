jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("uuid", () => ({
  v4: jest.fn(() => "photo-id"),
}))

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  promises: {
    ...jest.requireActual("fs").promises,
    access: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}))

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  logSafeActionWarning: jest.fn(),
  safeLoggedActionErrorMessage: jest.fn(
    (_message: string, _error: unknown, _context: unknown, fallback: string) => fallback,
  ),
}))

jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  auditRbacDecision: jest.fn(),
  requireAnyPermission: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("../storage-config-actions", () => ({
  getStorageConfiguration: jest.fn(),
}))

import { promises as fs } from "fs"
import {
  assertCanUseOrganization,
  auditRbacDecision,
  requireAnyPermission,
} from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getStorageConfiguration } from "../storage-config-actions"
import { deletePhoto, uploadPhoto } from "../photo-upload-actions"

const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockAuditRbacDecision = auditRbacDecision as jest.Mock
const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetStorageConfiguration = getStorageConfiguration as jest.Mock
const mockAccess = fs.access as jest.Mock
const mockMkdir = fs.mkdir as jest.Mock
const mockWriteFile = fs.writeFile as jest.Mock
const mockUnlink = fs.unlink as jest.Mock

const ctx = {
  orgId: "org-session",
  userId: "user-session",
  permissions: ["inventory.items.create"],
}

const localConfiguration = {
  success: true,
  error: null,
  data: {
    id: "storage_org-session",
    organizationId: "org-session",
    storageType: "local",
    localStoragePath: "/uploads/org-session",
    maxFileSize: 1024,
    allowedFileTypes: ["image/png"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

function pngFile() {
  return {
    type: "image/png",
    size: 4,
    arrayBuffer: jest.fn().mockResolvedValue(Uint8Array.from([1, 2, 3, 4]).buffer),
  } as unknown as File
}

describe("inventory photo action authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue(ctx)
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockAuditRbacDecision.mockResolvedValue(undefined)
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockGetStorageConfiguration.mockResolvedValue(localConfiguration)
    mockAccess.mockResolvedValue(undefined)
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockUnlink.mockResolvedValue(undefined)
  })

  it("authorizes, tenant-scopes, observes, and audits photo uploads before filesystem access", async () => {
    const result = await uploadPhoto(pngFile(), "org-session")

    expect(result).toMatchObject({ success: true, url: "/uploads/org-session/photo-id.png" })
    expect(mockRequireAnyPermission).toHaveBeenCalledWith(
      ["inventory.items.create", "inventory.items.update"],
      { resource: "InventoryItemPhoto" },
    )
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(ctx, "org-session")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      moduleSlug: "inventory",
      organizationId: "org-session",
      accessIntent: "write",
      surface: "actions/storage/photo-upload-actions.ts#uploadPhoto",
      mode: "observe",
    }))
    expect(mockAuditRbacDecision).toHaveBeenCalledWith(expect.objectContaining({
      ctx,
      permission: "inventory.items.create|inventory.items.update",
      result: "allowed",
      risk: "high",
      resource: "InventoryItemPhoto",
    }))
    expect(mockGetStorageConfiguration).toHaveBeenCalledWith("org-session")
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("photo-id.png"),
      expect.any(Buffer),
    )
  })

  it("rejects cross-organization uploads before configuration or filesystem access", async () => {
    mockAssertCanUseOrganization.mockRejectedValueOnce(new Error("Forbidden"))

    const result = await uploadPhoto(pngFile(), "org-other")

    expect(result).toMatchObject({ success: false, error: "Failed to upload photo" })
    expect(mockGetStorageConfiguration).not.toHaveBeenCalled()
    expect(mockAccess).not.toHaveBeenCalled()
    expect(mockMkdir).not.toHaveBeenCalled()
    expect(mockWriteFile).not.toHaveBeenCalled()
  })

  it("uses the same permission and tenant boundary before deleting local photos", async () => {
    const result = await deletePhoto("/uploads/org-session/photo-id.png", "org-session")

    expect(result).toEqual({ success: true })
    expect(mockRequireAnyPermission).toHaveBeenCalledWith(
      ["inventory.items.create", "inventory.items.update"],
      { resource: "InventoryItemPhoto" },
    )
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(ctx, "org-session")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      surface: "actions/storage/photo-upload-actions.ts#deletePhoto",
      accessIntent: "write",
    }))
    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining("photo-id.png"))
  })

  it("fails closed before configuration and filesystem access when RBAC is denied", async () => {
    mockRequireAnyPermission.mockRejectedValueOnce(new Error("Forbidden"))

    const result = await uploadPhoto(pngFile(), "org-session")

    expect(result).toMatchObject({ success: false, error: "Failed to upload photo" })
    expect(mockAssertCanUseOrganization).not.toHaveBeenCalled()
    expect(mockGetStorageConfiguration).not.toHaveBeenCalled()
    expect(mockWriteFile).not.toHaveBeenCalled()
  })
})
