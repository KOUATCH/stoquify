import { AuthRequiredError, ForbiddenError } from "@/services/_shared/action-errors"
import { requireApiModuleAccess, requireApiSessionForCurrentOrg, requireAppPermission } from "@/lib/security/server-authz"
import { requireUploadAuth } from "../core"

jest.mock("uploadthing/next", () => {
  const mockRouteBuilder: any = {}
  mockRouteBuilder.middleware = jest.fn(() => mockRouteBuilder)
  mockRouteBuilder.onUploadComplete = jest.fn(() => mockRouteBuilder)

  return {
    createUploadthing: () => jest.fn(() => mockRouteBuilder),
  }
})

jest.mock("@/lib/security/server-authz", () => ({
  requireApiModuleAccess: jest.fn(),
  requireApiSessionForCurrentOrg: jest.fn(),
  requireAppPermission: jest.fn(),
}))

const mockRequireApiModuleAccess = requireApiModuleAccess as jest.Mock
const mockRequireApiSessionForCurrentOrg = requireApiSessionForCurrentOrg as jest.Mock
const mockRequireAppPermission = requireAppPermission as jest.Mock

describe("requireUploadAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiModuleAccess.mockResolvedValue({ allowed: true, error: null, status: 200 })
    mockRequireAppPermission.mockReturnValue(undefined)
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
    expect(mockRequireAppPermission).not.toHaveBeenCalled()
  })

  it("requires dashboard module access before returning upload metadata", async () => {
    const user = { id: "user-1", permissions: ["dashboard.read"], roles: [] }
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
      moduleSlug: "dashboard",
      surface: "POST /api/uploadthing",
      surfaceType: "api",
      accessIntent: "write",
      audit: true,
    })
    expect(mockRequireAppPermission).not.toHaveBeenCalled()
  })

  it("requires dashboard.read before returning upload metadata", async () => {
    const user = { id: "user-1", permissions: [], roles: [] }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })
    mockRequireAppPermission.mockImplementation(() => {
      throw new Error("Forbidden")
    })

    await expect(requireUploadAuth()).rejects.toBeInstanceOf(ForbiddenError)
    expect(mockRequireAppPermission).toHaveBeenCalledWith(user, "dashboard.read")
  })

  it("returns server-resolved tenant metadata after auth, module, and permission checks pass", async () => {
    const user = { id: "user-1", permissions: ["dashboard.read"], roles: [] }
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
      moduleSlug: "dashboard",
      accessIntent: "write",
    }))
    expect(mockRequireAppPermission).toHaveBeenCalledWith(user, "dashboard.read")
  })
})
