import { getOrgInvites } from "../getOrgInvites"
import { requireAnyPermission, assertCanUseOrganization } from "@/lib/security/rbac"
import { listOrganizationInvites } from "@/services/users/user-identity.service"
import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses"
jest.mock("@/lib/security/rbac", () => ({ requireAnyPermission: jest.fn(), assertCanUseOrganization: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/users/user-identity.service", () => ({ listOrganizationInvites: jest.fn() }))
jest.mock("@/actions/_shared/safe-action-responses", () => ({ safeStatusActionErrorResult: jest.fn() }))
const permission = requireAnyPermission as jest.Mock, scope = assertCanUseOrganization as jest.Mock, read = listOrganizationInvites as jest.Mock, fail = safeStatusActionErrorResult as jest.Mock
beforeEach(() => {
  jest.resetAllMocks()
  permission.mockResolvedValue({ orgId: "server-org", userId: "server-user", permissions: ["users.read"] })
  fail.mockReturnValue({ status: 503, data: null, code: "DATABASE_UNAVAILABLE", error: "Unavailable" })
})
it("returns verified empty data with a checked time", async () => {
  const data = { rows: [], asOf: "2026-09-06T00:00:00Z" }; read.mockResolvedValue(data)
  expect(await getOrgInvites()).toEqual({ status: 200, error: null, data })
  expect(read).toHaveBeenCalledWith("server-org")
})
it("does not turn a failed query into a successful empty list", async () => {
  read.mockRejectedValue(new Error("database offline"))
  expect(await getOrgInvites()).toMatchObject({ status: 503, data: null, code: "DATABASE_UNAVAILABLE" })
})
it("denies a foreign organization before reading invitations", async () => {
  scope.mockRejectedValue(new Error("foreign organization")); fail.mockReturnValue({ status: 403, data: null, code: "FORBIDDEN" })
  expect(await getOrgInvites("foreign-org")).toMatchObject({ status: 403, data: null })
  expect(read).not.toHaveBeenCalled()
})
it("requires invitation or user-read authority", async () => {
  permission.mockRejectedValue(new Error("denied")); await getOrgInvites()
  expect(permission).toHaveBeenCalledWith(["users.invite", "users.read"], { resource: "UserInvite" })
  expect(read).not.toHaveBeenCalled()
})
