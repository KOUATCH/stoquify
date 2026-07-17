import { AuthRequiredError, ForbiddenError } from "@/services/_shared/action-errors"
import {
  requireAnyAppPermission,
  requireApiModuleAccess,
  requireApiSessionForCurrentOrg,
} from "@/lib/security/server-authz"
import { ourFileRouter, requireUploadAuth } from "../core"

jest.mock("uploadthing/next", () => {
  const mockRouteBuilder: any = {}
  mockRouteBuilder.middleware = jest.fn(() => mockRouteBuilder)
  mockRouteBuilder.onUploadComplete = jest.fn(() => mockRouteBuilder)

  return {
    createUploadthing: () => jest.fn(() => mockRouteBuilder),
  }
})

jest.mock("@/lib/security/server-authz", () => ({
  requireAnyAppPermission: jest.fn(),
  requireApiModuleAccess: jest.fn(),
  requireApiSessionForCurrentOrg: jest.fn(),
}))

const mockRequireAnyAppPermission = requireAnyAppPermission as jest.Mock
const mockRequireApiModuleAccess = requireApiModuleAccess as jest.Mock
const mockRequireApiSessionForCurrentOrg = requireApiSessionForCurrentOrg as jest.Mock

describe("requireUploadAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiModuleAccess.mockResolvedValue({ allowed: true, error: null, status: 200 })
    mockRequireAnyAppPermission.mockReturnValue(undefined)
  })

  it("throws AuthRequiredError when RBAC context is missing", async () => {
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: "Unauthorized",
      status: 401,
      session: null,
      organizationId: null,
    })

    await expect(requireUploadAuth()).rejects.toBeInstanceOf(AuthRequiredError)
    expect(mockRequireApiModuleAccess).not.toHaveBeenCalled()
    expect(mockRequireAnyAppPermission).not.toHaveBeenCalled()
  })

  it("requires inventory module access before returning upload metadata", async () => {
    const user = { id: "user-1", permissions: ["inventory.items.create"], roles: [] }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })
    mockRequireApiModuleAccess.mockResolvedValue({ allowed: false, error: "Forbidden", status: 403 })

    await expect(requireUploadAuth()).rejects.toBeInstanceOf(ForbiddenError)
    expect(mockRequireApiModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      user,
      moduleSlug: "inventory",
      surface: "POST /api/uploadthing",
      surfaceType: "api",
      accessIntent: "write",
      audit: true,
    })
    expect(mockRequireAnyAppPermission).not.toHaveBeenCalled()
  })

  it("requires inventory item create or update permission before returning upload metadata", async () => {
    const user = { id: "user-1", permissions: ["dashboard.read"], roles: [] }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })
    mockRequireAnyAppPermission.mockImplementation(() => {
      throw new Error("Forbidden")
    })

    await expect(requireUploadAuth()).rejects.toBeInstanceOf(ForbiddenError)
    expect(mockRequireAnyAppPermission).toHaveBeenCalledWith(user, [
      "inventory.items.create",
      "inventory.items.update",
    ])
  })

  it("returns server-resolved tenant metadata after auth, module, and permission checks pass", async () => {
    const user = { id: "user-1", permissions: ["inventory.items.update"], roles: [] }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })

    await expect(requireUploadAuth()).resolves.toEqual({
      userId: "user-1",
      organizationId: "org-1",
    })
    expect(mockRequireApiModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      moduleSlug: "inventory",
      accessIntent: "write",
    }))
    expect(mockRequireAnyAppPermission).toHaveBeenCalledWith(user, [
      "inventory.items.create",
      "inventory.items.update",
    ])
  })

  it("exposes only the repository-used item image upload endpoint", () => {
    expect(Object.keys(ourFileRouter)).toEqual(["itemImageUpload"])
  })
})
