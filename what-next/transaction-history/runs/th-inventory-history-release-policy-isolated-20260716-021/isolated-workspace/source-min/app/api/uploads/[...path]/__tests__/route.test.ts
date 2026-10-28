import { promises as fs } from "fs"
import { GET } from "../route"
import { requireApiModuleAccess, requireApiSessionForCurrentOrg, requireAppPermission } from "@/lib/security/server-authz"

jest.mock("next/server", () => ({
  NextResponse: class MockNextResponse {
    status: number
    body: unknown
    headers: Map<string, string>

    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.status = init?.status ?? 200
      this.body = body
      this.headers = new Map(Object.entries(init?.headers ?? {}))
    }

    static json(body: unknown, init?: { status?: number }) {
      return {
        status: init?.status ?? 200,
        json: async () => body,
      }
    }
  },
}))

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  promises: {
    ...jest.requireActual("fs").promises,
    access: jest.fn(),
    readFile: jest.fn(),
  },
}))

jest.mock("@/lib/security/server-authz", () => ({
  requireApiModuleAccess: jest.fn(),
  requireApiSessionForCurrentOrg: jest.fn(),
  requireAppPermission: jest.fn(),
}))

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockRequireApiModuleAccess = requireApiModuleAccess as jest.Mock
const mockRequireApiSessionForCurrentOrg = requireApiSessionForCurrentOrg as jest.Mock
const mockRequireAppPermission = requireAppPermission as jest.Mock
const mockAccess = fs.access as jest.Mock
const mockReadFile = fs.readFile as jest.Mock

function params(pathSegments: string[]) {
  return { params: Promise.resolve({ path: pathSegments }) }
}

describe("GET /api/uploads/[...path]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiModuleAccess.mockResolvedValue({ allowed: true, error: null, status: 200 })
    mockRequireAppPermission.mockReturnValue(undefined)
    mockAccess.mockResolvedValue(undefined)
    mockReadFile.mockResolvedValue(Buffer.from("image-bytes"))
  })

  it("returns 401 before path, module, permission, or filesystem checks when RBAC context is missing", async () => {
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: "Unauthorized",
      status: 401,
      session: null,
      organizationId: null,
    })

    const response = await GET({} as any, params(["org-1", "item.png"]))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({ code: "AUTH_REQUIRED", error: "Unauthenticated" })
    expect(mockRequireApiModuleAccess).not.toHaveBeenCalled()
    expect(mockRequireAppPermission).not.toHaveBeenCalled()
    expect(mockAccess).not.toHaveBeenCalled()
    expect(mockReadFile).not.toHaveBeenCalled()
  })

  it("returns 403 for cross-organization asset paths before module or filesystem checks", async () => {
    const user = { id: "user-1", permissions: ["dashboard.read"], roles: [] }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })

    const response = await GET({} as any, params(["org-2", "item.png"]))

    expect(response.status).toBe(403)
    expect(mockRequireApiModuleAccess).not.toHaveBeenCalled()
    expect(mockRequireAppPermission).not.toHaveBeenCalled()
    expect(mockAccess).not.toHaveBeenCalled()
  })

  it("requires dashboard module entitlement before RBAC permission or filesystem checks", async () => {
    const user = { id: "user-1", permissions: ["dashboard.read"], roles: [] }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })
    mockRequireApiModuleAccess.mockResolvedValue({ allowed: false, error: "Forbidden", status: 403 })

    const response = await GET({} as any, params(["org-1", "item.png"]))

    expect(response.status).toBe(403)
    expect(mockRequireApiModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      user,
      moduleSlug: "dashboard",
      surface: "GET /api/uploads/[...path]",
      surfaceType: "api",
      accessIntent: "read",
      audit: true,
    })
    expect(mockRequireAppPermission).not.toHaveBeenCalled()
    expect(mockAccess).not.toHaveBeenCalled()
  })

  it("requires dashboard.read before filesystem checks", async () => {
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

    const response = await GET({} as any, params(["org-1", "item.png"]))

    expect(response.status).toBe(403)
    expect(mockRequireAppPermission).toHaveBeenCalledWith(user, "dashboard.read")
    expect(mockAccess).not.toHaveBeenCalled()
  })

  it("blocks path traversal before filesystem checks", async () => {
    const user = { id: "user-1", permissions: ["dashboard.read"], roles: [] }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })

    const response = await GET({} as any, params(["org-1", "../secret.png"]))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({ code: "VALIDATION_ERROR", error: "Invalid file path" })
    expect(mockAccess).not.toHaveBeenCalled()
    expect(mockReadFile).not.toHaveBeenCalled()
  })

  it("blocks unsupported file types before filesystem checks", async () => {
    const user = { id: "user-1", permissions: ["dashboard.read"], roles: [] }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })

    const response = await GET({} as any, params(["org-1", "report.pdf"]))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({ code: "VALIDATION_ERROR", error: "Unsupported file type" })
    expect(mockAccess).not.toHaveBeenCalled()
    expect(mockReadFile).not.toHaveBeenCalled()
  })

  it("serves same-organization supported image assets after guard checks pass", async () => {
    const user = { id: "user-1", permissions: ["dashboard.read"], roles: [] }
    mockRequireApiSessionForCurrentOrg.mockResolvedValue({
      error: null,
      status: 200,
      session: { user },
      organizationId: "org-1",
    })

    const response = await GET({} as any, params(["org-1", "item.webp"])) as any

    expect(response.status).toBe(200)
    expect(mockRequireApiModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      moduleSlug: "dashboard",
      accessIntent: "read",
    }))
    expect(mockRequireAppPermission).toHaveBeenCalledWith(user, "dashboard.read")
    expect(mockAccess).toHaveBeenCalledTimes(1)
    expect(mockReadFile).toHaveBeenCalledTimes(1)
    expect(response.headers.get("Content-Type")).toBe("image/webp")
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
  })
})
