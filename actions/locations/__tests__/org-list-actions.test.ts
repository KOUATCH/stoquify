import { getOrgLocations } from "@/actions/locations/getOrgLocations"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { getAuthenticatedUser } from "@/config/useAuth"
import { db } from "@/prisma/db"
import { listLocations } from "@/services/location/location.service"
import { listUnits } from "@/services/unit/unit.service"

jest.mock("@/config/useAuth", () => ({
  getAuthenticatedUser: jest.fn(),
}))

jest.mock("@/services/location/location.service", () => ({
  listLocations: jest.fn(),
}))

jest.mock("@/services/unit/unit.service", () => ({
  listUnits: jest.fn(),
}))

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock
const mockListLocations = listLocations as jest.Mock
const mockListUnits = listUnits as jest.Mock
const mockDb = db as unknown as {
  organization: {
    findFirst: jest.Mock
  }
}

function authedUser(permissions: string[] = []) {
  return {
    id: "user-1",
    email: "user@example.com",
    firstName: "Ada",
    lastName: "Admin",
    organizationId: "org-1",
    organizationName: "Org One",
    roles: [],
    permissions,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(db as any).organization = {
    findFirst: jest.fn(),
  }
})

describe("tenant-scoped organization list actions", () => {
  it("uses the authenticated organization when no organization id is provided", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(authedUser())
    mockListLocations.mockResolvedValue([{ id: "loc-1" }])

    const result = await getOrgLocations()

    expect(result.success).toBe(true)
    expect(mockListLocations).toHaveBeenCalledWith("org-1")
  })

  it("rejects cross-organization location reads for non-superusers", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(authedUser())

    const result = await getOrgLocations("org-2")

    expect(result.success).toBe(false)
    expect(mockListLocations).not.toHaveBeenCalled()
  })

  it("allows superusers to read another active organization's units", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(authedUser(["*"]))
    mockDb.organization.findFirst.mockResolvedValue({ id: "org-2" })
    mockListUnits.mockResolvedValue([{ id: "unit-1" }])

    const result = await getOrgUnits("org-2")

    expect(result.success).toBe(true)
    expect(mockDb.organization.findFirst).toHaveBeenCalledWith({
      where: {
        id: "org-2",
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    })
    expect(mockListUnits).toHaveBeenCalledWith("org-2")
  })

  it("rejects superuser overrides for inactive or missing organizations", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(authedUser(["*"]))
    mockDb.organization.findFirst.mockResolvedValue(null)

    const result = await getOrgUnits("org-2")

    expect(result.success).toBe(false)
    expect(mockListUnits).not.toHaveBeenCalled()
  })
})
