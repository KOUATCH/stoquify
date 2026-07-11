import { assertActiveOrganization } from "../assert-active-organization"
import { ForbiddenError } from "../action-errors"
import { requireOrg } from "../require-org"
import { canResolveCrossOrganization, resolveActionOrganization } from "../resolve-action-organization"

jest.mock("../require-org", () => ({
  requireOrg: jest.fn(),
}))

jest.mock("../assert-active-organization", () => ({
  assertActiveOrganization: jest.fn(),
}))

const mockRequireOrg = requireOrg as jest.Mock
const mockAssertActiveOrganization = assertActiveOrganization as jest.Mock

function mockOrg(permissions: string[] = []) {
  mockRequireOrg.mockResolvedValue({
    user: { id: "user-1", permissions },
    userId: "user-1",
    orgId: "org-1",
  })
}

describe("resolveActionOrganization", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAssertActiveOrganization.mockResolvedValue("org-2")
  })

  it("uses the session organization when no explicit organization is supplied", async () => {
    mockOrg()

    await expect(resolveActionOrganization()).resolves.toBe("org-1")

    expect(mockAssertActiveOrganization).not.toHaveBeenCalled()
  })

  it("uses the session organization when the explicit organization matches", async () => {
    mockOrg()

    await expect(resolveActionOrganization(" org-1 ")).resolves.toBe("org-1")

    expect(mockAssertActiveOrganization).not.toHaveBeenCalled()
  })

  it("denies cross-organization access without an explicit high-risk organization permission", async () => {
    mockOrg(["inventory.items.read"])

    await expect(resolveActionOrganization("org-2", "units")).rejects.toBeInstanceOf(ForbiddenError)

    expect(mockAssertActiveOrganization).not.toHaveBeenCalled()
  })

  it("denies cross-organization access for a raw wildcard permission", async () => {
    mockOrg(["*"])

    await expect(resolveActionOrganization("org-2", "units")).rejects.toBeInstanceOf(ForbiddenError)

    expect(canResolveCrossOrganization(["*"])).toBe(false)
    expect(mockAssertActiveOrganization).not.toHaveBeenCalled()
  })

  it("allows cross-organization access only with the explicit high-risk organization permission", async () => {
    mockOrg(["system.organization.update"])

    await expect(resolveActionOrganization("org-2", "units")).resolves.toBe("org-2")

    expect(mockAssertActiveOrganization).toHaveBeenCalledWith("org-2")
  })

  it("allows the canonical organization management alias for reviewed cross-organization access", () => {
    expect(canResolveCrossOrganization(["MANAGE_ORGANIZATION"])).toBe(true)
  })
})