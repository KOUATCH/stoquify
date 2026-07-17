import { revalidatePath } from "next/cache"
import { safeLoggedActionErrorMessage } from "@/actions/_shared/safe-action-responses"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { assertActiveOrganization } from "@/services/_shared/assert-active-organization"
import {
  archiveLocationForManagement,
  createLocationForManagement,
  getLocationManagementDataForOrg,
  updateLocationForManagement,
} from "@/services/location/location.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  archiveManagedLocation,
  createManagedLocation,
  getLocationManagementData,
  updateManagedLocation,
} from "@/actions/locations/location-management-actions"

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  safeLoggedActionErrorMessage: jest.fn((_message, _error, _context, fallback) => fallback),
}))

jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  requirePermission: jest.fn(),
}))

jest.mock("@/services/_shared/assert-active-organization", () => ({
  assertActiveOrganization: jest.fn(),
}))

jest.mock("@/services/location/location.service", () => ({
  archiveLocationForManagement: jest.fn(),
  createLocationForManagement: jest.fn(),
  getLocationManagementDataForOrg: jest.fn(),
  updateLocationForManagement: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockAssertActiveOrganization = assertActiveOrganization as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetLocationManagementDataForOrg = getLocationManagementDataForOrg as jest.Mock
const mockCreateLocationForManagement = createLocationForManagement as jest.Mock
const mockUpdateLocationForManagement = updateLocationForManagement as jest.Mock
const mockArchiveLocationForManagement = archiveLocationForManagement as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock
const mockSafeLoggedActionErrorMessage = safeLoggedActionErrorMessage as jest.Mock

const rbacContext = {
  orgId: "session-org",
  userId: "user-1",
  permissions: ["locations.read", "locations.create", "locations.update", "locations.delete"],
}

const validInput = {
  name: "Main Warehouse",
  code: "MAIN",
  type: "WAREHOUSE",
  isActive: true,
} as any

const managementRow = {
  id: "loc-1",
  name: "Main Warehouse",
  organizationId: "org-1",
}

function expectSettingsObservation(accessIntent: "read" | "write") {
  expect(mockObserveModuleAccess).toHaveBeenCalledWith({
    organizationId: "org-1",
    userId: "user-1",
    actorPermissions: ["locations.read", "locations.create", "locations.update", "locations.delete"],
    moduleSlug: "settings",
    surfaceType: "action",
    surface: "actions/locations/location-management-actions.ts",
    accessIntent,
    mode: "observe",
  })
}

describe("location management actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext)
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockAssertActiveOrganization.mockResolvedValue("org-1")
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockGetLocationManagementDataForOrg.mockResolvedValue({ locations: [managementRow], managers: [] })
    mockCreateLocationForManagement.mockResolvedValue(managementRow)
    mockUpdateLocationForManagement.mockResolvedValue(managementRow)
    mockArchiveLocationForManagement.mockResolvedValue({ id: "loc-1" })
  })

  it("reads management data with tenant guard, settings observation, and scoped service access", async () => {
    const result = await getLocationManagementData("org-1")

    expect(result).toEqual({ success: true, data: { locations: [managementRow], managers: [] } })
    expect(mockRequirePermission).toHaveBeenCalledWith("locations.read", { resource: "Location" })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(rbacContext, "org-1")
    expect(mockAssertActiveOrganization).toHaveBeenCalledWith("org-1")
    expectSettingsObservation("read")
    expect(mockObserveModuleAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockGetLocationManagementDataForOrg.mock.invocationCallOrder[0],
    )
    expect(mockGetLocationManagementDataForOrg).toHaveBeenCalledWith("org-1")
  })

  it("creates locations after settings observation and writes inside the active organization", async () => {
    const result = await createManagedLocation("org-1", validInput)

    expect(result).toEqual({ success: true, data: managementRow })
    expect(mockRequirePermission).toHaveBeenCalledWith("locations.create", {
      resource: "Location",
      auditAllowed: true,
    })
    expectSettingsObservation("write")
    expect(mockObserveModuleAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockCreateLocationForManagement.mock.invocationCallOrder[0],
    )
    expect(mockCreateLocationForManagement).toHaveBeenCalledWith("org-1", expect.objectContaining({ name: "Main Warehouse" }))
    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]/dashboard/settings/locations", "page")
  })

  it("updates locations after settings observation and writes inside the active organization", async () => {
    const result = await updateManagedLocation("org-1", "loc-1", validInput)

    expect(result).toEqual({ success: true, data: managementRow })
    expect(mockRequirePermission).toHaveBeenCalledWith("locations.update", {
      resource: "Location",
      resourceId: "loc-1",
      auditAllowed: true,
    })
    expectSettingsObservation("write")
    expect(mockObserveModuleAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockUpdateLocationForManagement.mock.invocationCallOrder[0],
    )
    expect(mockUpdateLocationForManagement).toHaveBeenCalledWith("org-1", "loc-1", expect.objectContaining({ name: "Main Warehouse" }))
  })

  it("archives locations after settings observation and writes inside the active organization", async () => {
    const result = await archiveManagedLocation("org-1", "loc-1")

    expect(result).toEqual({ success: true, data: { id: "loc-1" } })
    expect(mockRequirePermission).toHaveBeenCalledWith("locations.delete", {
      resource: "Location",
      resourceId: "loc-1",
      auditAllowed: true,
    })
    expectSettingsObservation("write")
    expect(mockObserveModuleAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockArchiveLocationForManagement.mock.invocationCallOrder[0],
    )
    expect(mockArchiveLocationForManagement).toHaveBeenCalledWith("org-1", "loc-1")
  })

  it("fails closed before module observation or service access when RBAC denies access", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden: missing permission locations.create"))

    const result = await createManagedLocation("org-1", validInput)

    expect(result).toEqual({ success: false, error: "Failed to create location" })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockCreateLocationForManagement).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockSafeLoggedActionErrorMessage).toHaveBeenCalledWith(
      "Error creating managed location",
      expect.any(Error),
      { action: "createManagedLocation" },
      "Failed to create location",
    )
  })

  it("fails closed before the update service when settings observation fails", async () => {
    const error = new Error("module observation unavailable")
    mockObserveModuleAccess.mockRejectedValueOnce(error)

    const result = await updateManagedLocation("org-1", "loc-1", validInput)

    expect(result).toEqual({ success: false, error: "Failed to update location" })
    expect(mockUpdateLocationForManagement).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
    expect(mockSafeLoggedActionErrorMessage).toHaveBeenCalledWith(
      "Error updating managed location",
      error,
      { action: "updateManagedLocation" },
      "Failed to update location",
    )
  })
})
