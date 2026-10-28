import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { requireAllPermissions } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { sendInviteWorkflow } from "@/services/users/user-identity.service"

import { sendInvite } from "../sendInvite"

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  safeStatusActionErrorResult: jest.fn(),
}))
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requireAllPermissions: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))
jest.mock("@/services/users/user-identity.service", () => ({
  sendInviteWorkflow: jest.fn(),
}))

const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockRequireAllPermissions = requireAllPermissions as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockSendInviteWorkflow = sendInviteWorkflow as jest.Mock
const mockSafeStatusActionErrorResult = safeStatusActionErrorResult as jest.Mock

const inviteData = {
  email: " User@Example.com ",
  roleId: "role-1",
  organizationId: "org-1",
  organizationName: "Demo Org",
  name: "Cashier",
}

describe("sendInvite grant authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue(undefined)
    mockObserveModuleAccess.mockResolvedValue(undefined)
    mockSendInviteWorkflow.mockResolvedValue({ error: null, status: 200, data: null })
    mockSafeStatusActionErrorResult.mockReturnValue({
      error: "Forbidden",
      status: 403,
      data: null,
    })
  })

  it("requires invite and role-assignment authority before invoking the workflow", async () => {
    const missingAssignAuthority = new Error("missing users.roles.assign")
    mockRequireAllPermissions.mockRejectedValue(missingAssignAuthority)

    const result = await sendInvite(inviteData)

    expect(mockRequireAllPermissions).toHaveBeenCalledWith(
      ["users.invite", "users.roles.assign"],
      { resource: "UserInvite" },
    )
    expect(mockSendInviteWorkflow).not.toHaveBeenCalled()
    expect(mockSafeStatusActionErrorResult).toHaveBeenCalledWith(
      missingAssignAuthority,
      { action: "users.invite", component: "User" },
      "Something went wrong, Please try again",
    )
    expect(result).toEqual({ error: "Forbidden", status: 403, data: null })
  })

  it("passes authenticated permission evidence into the invitation workflow", async () => {
    const permissions = ["users.invite", "users.roles.assign", "dashboard.read"]
    const actor = {
      id: "admin-1",
      organizationId: "org-1",
      organizationName: "Demo Org",
    }
    mockRequireAllPermissions.mockResolvedValue({
      orgId: "org-1",
      userId: "admin-1",
      permissions,
      user: actor,
    })

    await sendInvite(inviteData)

    expect(mockSendInviteWorkflow).toHaveBeenCalledWith({
      actor,
      actorPermissions: permissions,
      email: "user@example.com",
      roleId: "role-1",
      roleName: "Cashier",
    })
  })
})
