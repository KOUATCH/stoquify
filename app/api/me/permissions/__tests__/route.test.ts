import { GET } from "../route"
import { getOptionalRbacContext } from "@/lib/security/rbac"

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock("@/lib/security/rbac", () => ({
  getOptionalRbacContext: jest.fn(),
}))

const mockGetOptionalRbacContext = getOptionalRbacContext as jest.Mock

describe("GET /api/me/permissions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("fails closed with empty permissions when RBAC context is unavailable", async () => {
    mockGetOptionalRbacContext.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ permissions: [] })
  })

  it("returns only permission, organization, and role claims when RBAC context exists", async () => {
    mockGetOptionalRbacContext.mockResolvedValue({
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
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
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
  })
})
