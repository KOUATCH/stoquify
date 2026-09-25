jest.mock("@/lib/security/rbac", () => ({ requireAllPermissions: jest.fn() }))
jest.mock("@/actions/_shared/safe-action-responses", () => ({ safeStatusActionErrorResult: jest.fn(() => ({ status: 403, data: null })) }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/users/user-invitation-history.service", () => ({ INVITATION_HISTORY_PERMISSIONS: ["users.read", "users.invite", "users.roles.assign"], readUserInvitationHistory: jest.fn() }))
import { requireAllPermissions } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { readUserInvitationHistory } from "@/services/users/user-invitation-history.service"
import { getInvitationHistory } from "../getInvitationHistory"
beforeEach(() => jest.resetAllMocks())
it("requires current invitation-review authority before calling the service", async () => {
  ;(requireAllPermissions as jest.Mock).mockRejectedValue(new Error("denied"))
  await getInvitationHistory({ inviteId: "invite" })
  expect(readUserInvitationHistory).not.toHaveBeenCalled()
  expect(requireAllPermissions).toHaveBeenCalledWith(["users.read", "users.invite", "users.roles.assign"], { resource: "UserInvite" })
})
it("derives actor and tenant from the server and records read access", async () => {
  const permissions = ["users.read", "users.invite", "users.roles.assign"]
  ;(requireAllPermissions as jest.Mock).mockResolvedValue({ userId: "actor", orgId: "org", permissions })
  const request = { inviteId: "invite", organizationId: "foreign", actorId: "forged" }
  await getInvitationHistory(request)
  expect(readUserInvitationHistory).toHaveBeenCalledWith({ actorId: "actor", organizationId: "org", actorPermissions: permissions, request })
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org", userId: "actor", accessIntent: "read", moduleSlug: "settings" }))
})
