import createLocation from "@/actions/locations/createLocation"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { requirePermission } from "@/lib/security/rbac"
import { createLocationForManagement } from "@/services/location/location.service"
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
  createLocationForManagement: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockCreateLocationForManagement = createLocationForManagement as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock
const mockSafeSuccessActionErrorResult = safeSuccessActionErrorResult as jest.Mock

const rbacContext = {
  orgId: "org-1",
  userId: "user-1",
  permissions: ["locations.create"],
}

const validInput = {
  organizationId: "ignored-org",
  name: "Main Warehouse",
  code: "MAIN",
  type: "WAREHOUSE",
  isActive: true,
}

describe("createLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext)
    mockCreateLocationForManagement.mockResolvedValue({
      id: "loc-1",
      name: "Main Warehouse",
      organizationId: "org-1",
    })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
  })

  it("requires location create permission, writes inside the RBAC organization, observes settings, and revalidates locations", async () => {
    const result = await createLocation(validInput)

    expect(result).toEqual({
      success: true,
      error: null,
      data: {
        id: "loc-1",
        name: "Main Warehouse",
        organizationId: "org-1",
      },
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("locations.create", {
      resource: "Location",
      auditAllowed: true,
    })
    expect(mockCreateLocationForManagement).toHaveBeenCalledWith("org-1", expect.objectContaining({
      name: "Main Warehouse",
      code: "MAIN",
      type: "WAREHOUSE",
    }))
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["locations.create"],
      moduleSlug: "settings",
      surfaceType: "action",
      surface: "actions/locations/createLocation.ts",
      accessIntent: "write",
      mode: "observe",
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/settings/locations")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]/dashboard/settings/locations", "page")
  })

  it("fails closed before validation, service write, or module observation when RBAC denies access", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden: missing permission locations.create"))

    const result = await createLocation(validInput)

    expect(result).toEqual({
      success: false,
      error: "Failed to create location. Please try again.",
      data: null,
    })
    expect(mockCreateLocationForManagement).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockSafeSuccessActionErrorResult).toHaveBeenCalledWith(
      expect.any(Error),
      { action: "createLocation" },
      "Failed to create location. Please try again.",
    )
  })

  it("does not write or observe module access when validation fails", async () => {
    const result = await createLocation({ ...validInput, name: "" })

    expect(result.success).toBe(false)
    expect(result.error).toContain("Location name is required")
    expect(mockCreateLocationForManagement).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it("normalizes service failures through the safe action response helper", async () => {
    const error = new Error("database unavailable")
    mockCreateLocationForManagement.mockRejectedValueOnce(error)

    const result = await createLocation(validInput)

    expect(result).toEqual({
      success: false,
      error: "Failed to create location. Please try again.",
      data: null,
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockSafeSuccessActionErrorResult).toHaveBeenCalledWith(
      error,
      { action: "createLocation" },
      "Failed to create location. Please try again.",
    )
  })
})