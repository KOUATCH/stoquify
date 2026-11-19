jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requireAllPermissions: jest.fn() }))
jest.mock("@/actions/_shared/safe-action-responses", () => ({ safeStatusActionErrorResult: jest.fn(() => ({ status: 403, data: null, code: "FORBIDDEN" })) }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/users/user-invitation-management.service", () => ({ cancelUserInvitation: jest.fn() }))
import { requireFreshAuth } from "@/lib/security/auth-session"
import { requireAllPermissions } from "@/lib/security/rbac"
import { cancelUserInvitation } from "@/services/users/user-invitation-management.service"
import { cancelInvite } from "../cancelInvite"
beforeEach(() => jest.resetAllMocks())
it("requires fresh authentication before looking up authority or mutating", async () => {
  ;(requireFreshAuth as jest.Mock).mockRejectedValue(new Error("fresh required"))
  await cancelInvite({}); expect(requireAllPermissions).not.toHaveBeenCalled(); expect(cancelUserInvitation).not.toHaveBeenCalled()
})
it("requires both invite and role-assignment permissions", async () => {
  ;(requireAllPermissions as jest.Mock).mockRejectedValue(new Error("denied"))
  await cancelInvite({})
  expect(requireAllPermissions).toHaveBeenCalledWith(["users.invite", "users.roles.assign"], { resource: "UserInvite" }); expect(cancelUserInvitation).not.toHaveBeenCalled()
})
it("uses server identity and tenant even when client input claims another actor", async () => {
  const permissions = ["users.invite", "users.roles.assign"]
  ;(requireAllPermissions as jest.Mock).mockResolvedValue({ userId: "real-actor", orgId: "real-org", permissions })
  const request = { actorId: "forged-actor", organizationId: "foreign", inviteId: "invite" }
  await cancelInvite(request)
  expect(requireFreshAuth).toHaveBeenCalledWith(300)
  expect(cancelUserInvitation).toHaveBeenCalledWith({ actorId: "real-actor", organizationId: "real-org", actorPermissions: permissions, request })
})
