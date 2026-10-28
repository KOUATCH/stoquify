import { GET } from "../route"
import { requireApiModuleAccess, requireApiSessionForOrg, requireAppPermission } from "@/lib/security/server-authz"
import { listItemApiDTOs } from "@/services/item/item.service"

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
  requireApiSessionForOrg: jest.fn(),
  requireAppPermission: jest.fn(),
}))

jest.mock("@/services/item/item.service", () => ({
  listItemApiDTOs: jest.fn(),
}))

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockRequireApiModuleAccess = requireApiModuleAccess as jest.Mock
const mockRequireApiSessionForOrg = requireApiSessionForOrg as jest.Mock
const mockRequireAppPermission = requireAppPermission as jest.Mock
const mockListItemApiDTOs = listItemApiDTOs as jest.Mock

function request(url = "http://localhost/api/v1/organisations/org-1/items?page=2&limit=5") {
  return { nextUrl: new URL(url) } as any
}

function params(id = "org-1") {
  return { params: Promise.resolve({ id }) }
}

describe("GET /api/v1/organisations/[id]/items", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiModuleAccess.mockResolvedValue({ allowed: true, error: null, status: 200 })
  })

  it("returns 401 without calling module, permission, or item services when the API session is missing", async () => {
    mockRequireApiSessionForOrg.mockResolvedValue({ error: "Unauthorized", status: 401, session: null })

    const response = await GET(request(), params())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({ error: "Unauthenticated", code: "AUTH_REQUIRED" })
    expect(mockRequireApiModuleAccess).not.toHaveBeenCalled()
    expect(mockRequireAppPermission).not.toHaveBeenCalled()
    expect(mockListItemApiDTOs).not.toHaveBeenCalled()
  })

  it("returns 403 without calling module, permission, or item services when tenant authorization fails", async () => {
    mockRequireApiSessionForOrg.mockResolvedValue({ error: "Forbidden", status: 403, session: null })

    const response = await GET(request(), params("org-2"))

    expect(response.status).toBe(403)
    expect(mockRequireApiModuleAccess).not.toHaveBeenCalled()
    expect(mockRequireAppPermission).not.toHaveBeenCalled()
    expect(mockListItemApiDTOs).not.toHaveBeenCalled()
  })

  it("requires the inventory module before checking inventory.items.read", async () => {
    const user = { id: "user-1", permissions: ["inventory.items.read"], roles: [] }
    mockRequireApiSessionForOrg.mockResolvedValue({ error: null, status: 200, session: { user } })
    mockRequireApiModuleAccess.mockResolvedValue({ allowed: false, error: "Forbidden", status: 403 })

    const response = await GET(request(), params())

    expect(response.status).toBe(403)
    expect(mockRequireApiModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      user,
      moduleSlug: "inventory",
      surface: "GET /api/v1/organisations/[id]/items",
      surfaceType: "api",
      accessIntent: "read",
      audit: true,
    })
    expect(mockRequireAppPermission).not.toHaveBeenCalled()
    expect(mockListItemApiDTOs).not.toHaveBeenCalled()
  })

  it("requires inventory.items.read before listing same-org items", async () => {
    const user = { id: "user-1", permissions: [], roles: [] }
    mockRequireApiSessionForOrg.mockResolvedValue({ error: null, status: 200, session: { user } })
    mockRequireAppPermission.mockImplementation(() => {
      throw new Error("Forbidden")
    })

    const response = await GET(request(), params())

    expect(response.status).toBe(403)
    expect(mockRequireApiModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      user,
      moduleSlug: "inventory",
      accessIntent: "read",
    }))
    expect(mockRequireAppPermission).toHaveBeenCalledWith(user, "inventory.items.read")
    expect(mockListItemApiDTOs).not.toHaveBeenCalled()
  })

  it("lists items only after tenant, module, and permission checks pass", async () => {
    const user = { id: "user-1", permissions: ["inventory.items.read"], roles: [] }
    mockRequireApiSessionForOrg.mockResolvedValue({ error: null, status: 200, session: { user } })
    mockRequireAppPermission.mockReturnValue(undefined)
    mockListItemApiDTOs.mockResolvedValue({ data: [{ id: "item-1" }], pagination: { page: 2, limit: 5 } })

    const response = await GET(request(), params())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockRequireApiSessionForOrg).toHaveBeenCalledWith("org-1")
    expect(mockRequireApiModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      user,
      moduleSlug: "inventory",
      surface: "GET /api/v1/organisations/[id]/items",
      surfaceType: "api",
      accessIntent: "read",
      audit: true,
    })
    expect(mockRequireAppPermission).toHaveBeenCalledWith(user, "inventory.items.read")
    expect(mockListItemApiDTOs).toHaveBeenCalledWith("org-1", { page: 2, limit: 5 })
    expect(body.data).toEqual([{ id: "item-1" }])
  })
})
