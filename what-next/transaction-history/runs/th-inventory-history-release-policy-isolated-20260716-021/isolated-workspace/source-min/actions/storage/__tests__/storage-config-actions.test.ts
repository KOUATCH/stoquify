jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  promises: {
    ...jest.requireActual("fs").promises,
    mkdir: jest.fn(),
  },
}))

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  safeLoggedActionErrorMessage: jest.fn(
    (_message: string, _error: unknown, _context: unknown, fallback: string) => fallback,
  ),
}))

jest.mock("@/lib/security/auth-session", () => ({
  requireFreshAuth: jest.fn(),
}))

jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  requireAnyPermission: jest.fn(),
  requirePermission: jest.fn(),
}))

jest.mock("@/services/_shared/assert-active-organization", () => ({
  assertActiveOrganization: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

import { promises as fs } from "fs"
import { requireFreshAuth } from "@/lib/security/auth-session"
import {
  assertCanUseOrganization,
  requireAnyPermission,
  requirePermission,
} from "@/lib/security/rbac"
import { assertActiveOrganization } from "@/services/_shared/assert-active-organization"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  getStorageConfiguration,
  initializeStorageForOrganization,
  updateStorageConfiguration,
} from "../storage-config-actions"

const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockAssertActiveOrganization = assertActiveOrganization as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockMkdir = fs.mkdir as jest.Mock

const ctx = {
  orgId: "org-session",
  userId: "user-session",
  permissions: ["inventory.items.create", "system.settings.update"],
}

describe("storage configuration action authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: Date.now() } })
    mockRequireAnyPermission.mockResolvedValue(ctx)
    mockRequirePermission.mockResolvedValue(ctx)
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockAssertActiveOrganization.mockResolvedValue({ id: "org-session" })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockMkdir.mockResolvedValue(undefined)
  })

  it("authorizes configuration reads and keeps them free of filesystem writes", async () => {
    const result = await getStorageConfiguration("org-session")

    expect(result.success).toBe(true)
    expect(mockRequireAnyPermission).toHaveBeenCalledWith(
      [
        "inventory.items.create",
        "inventory.items.update",
        "system.settings.read",
        "system.settings.update",
      ],
      { resource: "StorageConfiguration", resourceId: "org-session" },
    )
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(ctx, "org-session")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      moduleSlug: "settings",
      organizationId: "org-session",
      accessIntent: "read",
      surface: "actions/storage/storage-config-actions.ts#getStorageConfiguration",
      mode: "observe",
    }))
    expect(mockMkdir).not.toHaveBeenCalled()
  })

  it("requires fresh auth and canonical permission before updating storage configuration", async () => {
    const result = await updateStorageConfiguration("org-session", "local", undefined, 4096, ["image/png"])

    expect(result.success).toBe(true)
    expect(mockRequireFreshAuth).toHaveBeenCalledWith(300)
    expect(mockRequirePermission).toHaveBeenCalledWith("system.settings.update", {
      resource: "StorageConfiguration",
      resourceId: "org-session",
      auditAllowed: true,
    })
    expect(mockRequireFreshAuth.mock.invocationCallOrder[0]).toBeLessThan(
      mockRequirePermission.mock.invocationCallOrder[0],
    )
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(ctx, "org-session")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      moduleSlug: "settings",
      accessIntent: "write",
      surface: "actions/storage/storage-config-actions.ts#updateStorageConfiguration",
      mode: "observe",
    }))
    expect(mockMkdir).toHaveBeenCalledTimes(1)
    expect(result.data).toMatchObject({
      organizationId: "org-session",
      maxFileSize: 4096,
      allowedFileTypes: ["image/png"],
    })
  })

  it("requires the same fresh-auth write boundary before initialization", async () => {
    const result = await initializeStorageForOrganization("org-session")

    expect(result.success).toBe(true)
    expect(mockRequireFreshAuth).toHaveBeenCalledWith(300)
    expect(mockRequirePermission).toHaveBeenCalledWith("system.settings.update", {
      resource: "StorageConfiguration",
      resourceId: "org-session",
      auditAllowed: true,
    })
    expect(mockAssertActiveOrganization).toHaveBeenCalledWith("org-session")
    expect(mockMkdir).toHaveBeenCalledTimes(1)
  })

  it("fails closed before tenant, module, or filesystem access when write permission is denied", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden"))

    const result = await updateStorageConfiguration("org-session", "local")

    expect(result).toMatchObject({ success: false, error: "Failed to update storage configuration" })
    expect(mockAssertCanUseOrganization).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockMkdir).not.toHaveBeenCalled()
  })
})
