jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  safeSuccessActionErrorResult: jest.fn(
    (_error: unknown, _context: unknown, fallback: string) => ({
      success: false,
      error: fallback,
      data: null,
    }),
  ),
}))

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/unit/unit.service", () => ({
  removeUnitForManagement: jest.fn(),
}))

import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { removeUnitForManagement } from "@/services/unit/unit.service"
import deleteUnit from "../deleteUnit"

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockRemoveUnitForManagement = removeUnitForManagement as jest.Mock

const ctx = {
  orgId: "org-session",
  userId: "user-session",
  permissions: ["inventory.units.delete"],
}

describe("deleteUnit authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(ctx)
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockRemoveUnitForManagement.mockResolvedValue({ id: "unit-1", deactivated: false })
  })

  it("uses canonical permission, trusted tenant context, and inventory observation", async () => {
    const result = await deleteUnit("unit-1")

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.units.delete", {
      resource: "Unit",
      resourceId: "unit-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      moduleSlug: "inventory",
      organizationId: "org-session",
      userId: "user-session",
      actorPermissions: ["inventory.units.delete"],
      surfaceType: "action",
      surface: "actions/units/deleteUnit.ts",
      accessIntent: "write",
      mode: "observe",
    })
    expect(mockRemoveUnitForManagement).toHaveBeenCalledWith("org-session", "unit-1")
  })

  it("fails closed before module or service access when permission is denied", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Forbidden"))

    const result = await deleteUnit("unit-1")

    expect(result).toMatchObject({
      success: false,
      error: "Something went wrong, please try again",
      data: null,
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockRemoveUnitForManagement).not.toHaveBeenCalled()
  })
})
