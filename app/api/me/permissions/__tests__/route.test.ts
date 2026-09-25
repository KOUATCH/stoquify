import { GET } from "../route"
import { requireSession } from "@/lib/security/auth-session"
import { RbacError } from "@/lib/security/rbac"

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
      json: async () => body,
    }),
  },
}))

jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ RbacError: class extends Error { constructor(message: string, public code: string, public status: number) { super(message) } } }))

const mockRequireSession = requireSession as jest.Mock

describe("GET /api/me/permissions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each<["UNAUTHENTICATED" | "FORBIDDEN", 401 | 403]>([["UNAUTHENTICATED", 401], ["FORBIDDEN", 403]])("returns a private explicit %s failure", async (code, status) => {
    mockRequireSession.mockRejectedValue(new RbacError("Private account details", code, status))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(status)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(body).toEqual({ error: code })
  })

  it("does not turn an unavailable authorization service into an empty grant set", async () => {
    mockRequireSession.mockRejectedValue(new Error("Private database connection details"))
    const response = await GET()
    expect(response.status).toBe(500)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(await response.json()).toEqual({ error: "AUTHORIZATION_CHECK_FAILED" })
  })

  it("returns only permission, organization, and role claims when RBAC context exists", async () => {
    mockRequireSession.mockResolvedValue({ ctx: {
      userId: "user-1", fetchedAt: 1000,
      orgId: "org-1",
      permissions: ["inventory.items.read", "dashboard.read"],
      roles: [
        {
          id: "role-1",
          code: "inventory_manager",
          name: "Inventory Manager",
          permissions: ["inventory.items.read"],
          internalOnly: "not returned",
        },
      ],
      user: {
        id: "user-1",
        email: "ada@example.test",
        phone: "+237699000000",
      },
    } })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      userId: "user-1", fetchedAt: 1000,
      permissions: ["inventory.items.read", "dashboard.read"],
      organizationId: "org-1",
      roles: [
        {
          id: "role-1",
          code: "inventory_manager",
          name: "Inventory Manager",
        },
      ],
    })
    expect(JSON.stringify(body)).not.toContain("ada@example.test")
    expect(JSON.stringify(body)).not.toContain("+237699000000")
    expect(JSON.stringify(body)).not.toContain("internalOnly")
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
  })
})
