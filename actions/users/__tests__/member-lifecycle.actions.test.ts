jest.mock("server-only", () => ({}))
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requireAnyPermission: jest.fn(), requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/users/user-lifecycle.service", () => ({ deactivateUserForOrganization: jest.fn() }))
jest.mock("@/services/users/user-identity.service", () => ({ listOrganizationUsers: jest.fn() }))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), warn: jest.fn() } }))

import { requireFreshAuth } from "@/lib/security/auth-session"
import { requireAnyPermission, requirePermission, assertCanUseOrganization } from "@/lib/security/rbac"
import { deactivateUserForOrganization } from "@/services/users/user-lifecycle.service"
import { listOrganizationUsers } from "@/services/users/user-identity.service"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { deleteUser } from "../deleteUser"
import getOrgUsers from "../getOrgUsers"

const ctx = { orgId: "org-1", userId: "actor", permissions: ["users.read", "users.deactivate"] }
const command = { requestId: "09ba28c2-5a3a-48ae-b8c5-46e7abff3991", expectedUpdatedAt: "2026-09-06T09:00:00.000Z", reason: "Member departure" }
beforeEach(() => {
  jest.clearAllMocks()
  ;(requireAnyPermission as jest.Mock).mockResolvedValue(ctx)
  ;(requirePermission as jest.Mock).mockResolvedValue(ctx)
  ;(assertCanUseOrganization as jest.Mock).mockResolvedValue(undefined)
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ ctx, claims: { userId: "actor", tenantId: "org-1", sessionId: "session", sessionToken: "private-test-token" } })
  ;(deactivateUserForOrganization as jest.Mock).mockResolvedValue({ id: "target", auditId: "audit" })
  ;(listOrganizationUsers as jest.Mock).mockResolvedValue([])
})
it("binds the command to the private fresh session and canonical operation authority", async () => {
  await expect(deleteUser("target", command)).resolves.toMatchObject({ ok: true, data: { id: "target" } })
  expect(deactivateUserForOrganization).toHaveBeenCalledWith({ organizationId: "org-1", actorId: "actor", targetUserId: "target", command, session: { id: "session", token: "private-test-token" } })
  expect(requireAnyPermission).toHaveBeenCalledWith(["users.deactivate", "users.delete"], expect.anything())
})
it.each([{ userId: "other", tenantId: "org-1" }, { userId: "actor", tenantId: "org-2" }])("rejects an actor or organization change between checks", async claims => {
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ ctx, claims })
  expect((await deleteUser("target", command)).data).toBeNull()
  expect(deactivateUserForOrganization).not.toHaveBeenCalled()
})
it("returns denial without a success receipt", async () => {
  ;(deactivateUserForOrganization as jest.Mock).mockRejectedValue(new ForbiddenError())
  await expect(deleteUser("target", command)).resolves.toMatchObject({ data: null, code: "FORBIDDEN" })
})
it("represents an empty directory as successful only after a successful read", async () => {
  await expect(getOrgUsers()).resolves.toMatchObject({ success: true, data: [] })
  expect(listOrganizationUsers).toHaveBeenCalledWith("org-1")
})
it("does not replace a database failure with a zero-row result", async () => {
  ;(listOrganizationUsers as jest.Mock).mockRejectedValue(new Error("private database details"))
  const result = await getOrgUsers()
  expect(result).toMatchObject({ success: false, data: null })
  expect(JSON.stringify(result)).not.toContain("private database details")
})
it("rejects cross-organization directory requests before loading members", async () => {
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValue(new ForbiddenError())
  await expect(getOrgUsers("org-2")).resolves.toMatchObject({ success: false, data: null, code: "FORBIDDEN" })
  expect(listOrganizationUsers).not.toHaveBeenCalled()
})
