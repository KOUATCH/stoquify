import { GET, POST } from "../route"
import { requireApiModuleAccess, requireApiSessionForCurrentOrg, requireAppPermission } from "@/lib/security/server-authz"
import { getApiOrganizationById } from "@/services/organization/organization-read.service"

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock("@/lib/security/server-authz", () => ({
  requireApiModuleAccess: jest.fn(),
  requireApiSessionForCurrentOrg: jest.fn(),
  requireAppPermission: jest.fn(),
}))

jest.mock("@/services/organization/organization-read.service", () => ({
  getApiOrganizationById: jest.fn(),
}))

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockRequireApiModuleAccess = requireApiModuleAccess as jest.Mock
const mockRequireApiSessionForCurrentOrg = requireApiSessionForCurrentOrg as jest.Mock
const mockRequireAppPermission = requireAppPermission as jest.Mock
const mockGetApiOrganizationById = getApiOrganizationById as jest.Mock

describe("GET /api/v1/organisations", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiModuleAccess.mockResolvedValue({ allowed: true, error: null, status: 200 })
  })

  it("returns 401 without module, permission, or data calls when RBAC context is missing", async () => {
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: "Unauthorized",
      status: 401,
      session: null,
      organizationId: null,
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({ error: "Unauthenticated", code: "AUTH_REQUIRED" })
    expect(mockRequireApiModuleAccess).not.toHaveBeenCalled()
    expect(mockRequireAppPermission).not.toHaveBeenCalled()
    expect(mockGetApiOrganizationById).not.toHaveBeenCalled()
  })

  it("requires the settings module before checking system settings permission", async () => {
    const user = { id: "user-1", permissions: ["MANAGE_SYSTEM_SETTINGS"], roles: [] }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })
    mockRequireApiModuleAccess.mockResolvedValue({ allowed: false, error: "Forbidden", status: 403 })

    const response = await GET()

    expect(response.status).toBe(403)
    expect(mockRequireApiModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      user,
      moduleSlug: "settings",
      surface: "GET /api/v1/organisations",
      surfaceType: "api",
      accessIntent: "read",
      audit: true,
    })
    expect(mockRequireAppPermission).not.toHaveBeenCalled()
    expect(mockGetApiOrganizationById).not.toHaveBeenCalled()
  })

  it("requires MANAGE_SYSTEM_SETTINGS before returning organization metadata", async () => {
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

    const response = await GET()

    expect(response.status).toBe(403)
    expect(mockRequireApiModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      user,
      moduleSlug: "settings",
      accessIntent: "read",
    }))
    expect(mockRequireAppPermission).toHaveBeenCalledWith(user, "MANAGE_SYSTEM_SETTINGS")
    expect(mockGetApiOrganizationById).not.toHaveBeenCalled()
  })

  it("returns only the server-resolved organization after tenant, module, and permission checks pass", async () => {
    const user = { id: "user-1", permissions: ["MANAGE_SYSTEM_SETTINGS"], roles: [] }
    const organization = { id: "org-1", name: "AqStoqFlow Demo", currency: "XAF" }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })
    mockRequireAppPermission.mockReturnValue(undefined)
    mockGetApiOrganizationById.mockResolvedValue(organization)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockRequireApiSessionForCurrentOrg).toHaveBeenCalledTimes(1)
    expect(mockRequireApiModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      user,
      moduleSlug: "settings",
      surface: "GET /api/v1/organisations",
      surfaceType: "api",
      accessIntent: "read",
      audit: true,
    })
    expect(mockRequireAppPermission).toHaveBeenCalledWith(user, "MANAGE_SYSTEM_SETTINGS")
    expect(mockGetApiOrganizationById).toHaveBeenCalledWith("org-1")
    expect(body).toEqual([organization])
  })

  it("returns an empty list when the server-resolved organization is missing", async () => {
    const user = { id: "user-1", permissions: ["MANAGE_SYSTEM_SETTINGS"], roles: [] }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })
    mockRequireAppPermission.mockReturnValue(undefined)
    mockGetApiOrganizationById.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetApiOrganizationById).toHaveBeenCalledWith("org-1")
    expect(body).toEqual([])
  })

  it("keeps POST closed", async () => {
    const response = await POST()

    expect(response.status).toBe(405)
    expect(mockRequireApiSessionForCurrentOrg).not.toHaveBeenCalled()
  })
})
