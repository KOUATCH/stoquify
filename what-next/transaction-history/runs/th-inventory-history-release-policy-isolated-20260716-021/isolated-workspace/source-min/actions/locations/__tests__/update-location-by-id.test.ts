import updateLocationById from "@/actions/locations/updateLocationById"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { requirePermission } from "@/lib/security/rbac"
import { updateLegacyLocationByIdForOrg } from "@/services/location/location.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { revalidatePath } from "next/cache"

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
  updateLegacyLocationByIdForOrg: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockUpdateLegacyLocationByIdForOrg = updateLegacyLocationByIdForOrg as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock
const mockSafeSuccessActionErrorResult = safeSuccessActionErrorResult as jest.Mock

const rbacContext = {
  orgId: "org-1",
  userId: "user-1",
  permissions: ["locations.update"],
}

const validInput = {
  id: "loc-1",
  organizationId: "caller-org",
  name: "Main Store",
  code: "MAIN",
  type: "STORE",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
} as any

describe("updateLocationById", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext)
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockUpdateLegacyLocationByIdForOrg.mockResolvedValue({
      id: "loc-1",
      name: "Main Store",
      organizationId: "org-1",
    })
  })

  it("requires update permission, observes settings before the write, and updates inside the RBAC organization", async () => {
    const result = await updateLocationById("loc-1", validInput)

    expect(result).toEqual({
      success: true,
      error: null,
      data: {
        id: "loc-1",
        name: "Main Store",
        organizationId: "org-1",
      },
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("locations.update", {
      resource: "Location",
      resourceId: "loc-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["locations.update"],
      moduleSlug: "settings",
      surfaceType: "action",
      surface: "actions/locations/updateLocationById.ts",
      accessIntent: "write",
      mode: "observe",
    })
    expect(mockObserveModuleAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpdateLegacyLocationByIdForOrg.mock.invocationCallOrder[0],
    )
    expect(mockUpdateLegacyLocationByIdForOrg).toHaveBeenCalledWith("org-1", "loc-1", validInput)
    expect(mockRevalidatePath).toHaveBeenCalledWith("/inventory/locations")
  })

  it("fails closed before module observation or service write when RBAC denies access", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden: missing permission locations.update"))

    const result = await updateLocationById("loc-1", validInput)

    expect(result).toEqual({
      success: false,
      error: "Failed to update location",
      data: null,
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockUpdateLegacyLocationByIdForOrg).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockSafeSuccessActionErrorResult).toHaveBeenCalledWith(
      expect.any(Error),
      { action: "updateLocationById" },
      "Failed to update location",
    )
  })

  it("does not write or revalidate when module observation fails", async () => {
    const error = new Error("module observation unavailable")
    mockObserveModuleAccess.mockRejectedValueOnce(error)

    const result = await updateLocationById("loc-1", validInput)

    expect(result).toEqual({
      success: false,
      error: "Failed to update location",
      data: null,
    })
    expect(mockUpdateLegacyLocationByIdForOrg).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockSafeSuccessActionErrorResult).toHaveBeenCalledWith(
      error,
      { action: "updateLocationById" },
      "Failed to update location",
    )
  })

  it("normalizes service failures through the safe action response helper", async () => {
    const error = new Error("database unavailable")
    mockUpdateLegacyLocationByIdForOrg.mockRejectedValueOnce(error)

    const result = await updateLocationById("loc-1", validInput)

    expect(result).toEqual({
      success: false,
      error: "Failed to update location",
      data: null,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockSafeSuccessActionErrorResult).toHaveBeenCalledWith(
      error,
      { action: "updateLocationById" },
      "Failed to update location",
    )
  })
})
