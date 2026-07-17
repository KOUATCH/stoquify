import deleteLocation from "@/actions/locations/deleteLocation"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { requirePermission } from "@/lib/security/rbac"
import { archiveLocationForManagement } from "@/services/location/location.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  safeSuccessActionErrorResult: jest.fn((_error, _context, fallback) => ({
    success: false,
    error: fallback,
    data: null,
  })),
}))

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/services/location/location.service", () => ({
  archiveLocationForManagement: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockArchiveLocationForManagement = archiveLocationForManagement as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockSafeSuccessActionErrorResult = safeSuccessActionErrorResult as jest.Mock

const rbacContext = {
  orgId: "org-1",
  userId: "user-1",
  permissions: ["locations.delete"],
}

describe("deleteLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext)
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockArchiveLocationForManagement.mockResolvedValue({ id: "loc-1" })
  })

  it("requires delete permission, observes settings before archiving, and archives inside the RBAC organization", async () => {
    const result = await deleteLocation("loc-1")

    expect(result).toEqual({
      success: true,
      error: null,
      data: { id: "loc-1" },
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("locations.delete", {
      resource: "Location",
      resourceId: "loc-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["locations.delete"],
      moduleSlug: "settings",
      surfaceType: "action",
      surface: "actions/locations/deleteLocation.ts",
      accessIntent: "write",
      mode: "observe",
    })
    expect(mockObserveModuleAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockArchiveLocationForManagement.mock.invocationCallOrder[0],
    )
    expect(mockArchiveLocationForManagement).toHaveBeenCalledWith("org-1", "loc-1")
  })

  it("fails closed before module observation or archive when RBAC denies access", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden: missing permission locations.delete"))

    const result = await deleteLocation("loc-1")

    expect(result).toEqual({
      success: false,
      error: "Something went wrong, Please try again",
      data: null,
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockArchiveLocationForManagement).not.toHaveBeenCalled()
    expect(mockSafeSuccessActionErrorResult).toHaveBeenCalledWith(
      expect.any(Error),
      { action: "deleteLocation" },
      "Something went wrong, Please try again",
    )
  })

  it("does not archive when module observation fails", async () => {
    const error = new Error("module observation unavailable")
    mockObserveModuleAccess.mockRejectedValueOnce(error)

    const result = await deleteLocation("loc-1")

    expect(result).toEqual({
      success: false,
      error: "Something went wrong, Please try again",
      data: null,
    })
    expect(mockArchiveLocationForManagement).not.toHaveBeenCalled()
    expect(mockSafeSuccessActionErrorResult).toHaveBeenCalledWith(
      error,
      { action: "deleteLocation" },
      "Something went wrong, Please try again",
    )
  })

  it("normalizes archive failures through the safe action response helper", async () => {
    const error = new Error("database unavailable")
    mockArchiveLocationForManagement.mockRejectedValueOnce(error)

    const result = await deleteLocation("loc-1")

    expect(result).toEqual({
      success: false,
      error: "Something went wrong, Please try again",
      data: null,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalled()
    expect(mockSafeSuccessActionErrorResult).toHaveBeenCalledWith(
      error,
      { action: "deleteLocation" },
      "Something went wrong, Please try again",
    )
  })
})
