jest.mock("server-only", () => ({}))
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requireAllPermissions: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/users/member-history.service", () => ({ getMemberHistory: jest.fn(), exportMemberHistory: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), warn: jest.fn() } }))
import { requireFreshAuth } from "@/lib/security/auth-session"
import { requireAllPermissions } from "@/lib/security/rbac"
import { getMemberHistory, exportMemberHistory } from "@/services/users/member-history.service"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getMemberHistoryAction, exportMemberHistoryAction } from "../memberHistory"

const page = { beforeId: "older", throughId: "snapshot" }, input = { page, expectedHash: "a".repeat(64), locale: "fr" as const }
beforeEach(() => {
  jest.clearAllMocks()
  ;(requireAllPermissions as jest.Mock).mockResolvedValue({ orgId: "org", userId: "actor", permissions: ["users.read", "controls.audit.read", "reports.export"] })
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { userId: "actor", tenantId: "org", sessionId: "session", sessionToken: "private-token" } })
  ;(getMemberHistory as jest.Mock).mockResolvedValue({ entries: [], pageHash: "a".repeat(64) })
  ;(exportMemberHistory as jest.Mock).mockResolvedValue({ contentBase64: "cmV2aWV3ZWQgQ1NW", auditId: "audit" })
})
it("requires both read permissions and forwards only the server organization and actor", async () => {
  await expect(getMemberHistoryAction("member", page)).resolves.toMatchObject({ success: true })
  expect(requireAllPermissions).toHaveBeenCalledWith(["users.read", "controls.audit.read"], { resource: "User", resourceId: "member" })
  expect(getMemberHistory).toHaveBeenCalledWith({ organizationId: "org", actorId: "actor", targetUserId: "member" }, page)
})
it("keeps a denied read from reaching the history service", async () => {
  ;(requireAllPermissions as jest.Mock).mockRejectedValue(new ForbiddenError())
  await expect(getMemberHistoryAction("member")).resolves.toMatchObject({ success: false, data: null, code: "FORBIDDEN" })
  expect(getMemberHistory).not.toHaveBeenCalled()
})
it("requires fresh authentication and the distinct export permission", async () => {
  const result = await exportMemberHistoryAction("member", input)
  expect(requireFreshAuth).toHaveBeenCalledWith(300)
  expect(requireAllPermissions).toHaveBeenCalledWith(["users.read", "controls.audit.read", "reports.export"], { resource: "User", resourceId: "member" })
  expect(exportMemberHistory).toHaveBeenCalledWith({ organizationId: "org", actorId: "actor", targetUserId: "member" }, input, { id: "session", token: "private-token" })
  expect(result).toMatchObject({ success: true, data: { auditId: "audit" } })
  expect(JSON.stringify(result)).not.toContain("private-token")
})
it.each([{ userId: "other", tenantId: "org" }, { userId: "actor", tenantId: "other" }])("rejects mismatched session authority", async claims => {
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims })
  await expect(exportMemberHistoryAction("member", input)).resolves.toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(exportMemberHistory).not.toHaveBeenCalled()
})
it("does not release a CSV when current export authority is denied", async () => {
  ;(requireAllPermissions as jest.Mock).mockRejectedValue(new ForbiddenError())
  await expect(exportMemberHistoryAction("member", input)).resolves.toMatchObject({ success: false, data: null })
  expect(exportMemberHistory).not.toHaveBeenCalled()
})
it.each(["read", "export"])("keeps a failed %s distinct from empty records or a prepared download", async kind => {
  const service = kind === "read" ? getMemberHistory : exportMemberHistory
  ;(service as jest.Mock).mockRejectedValue(new Error("private database detail"))
  const result = kind === "read" ? await getMemberHistoryAction("member") : await exportMemberHistoryAction("member", input)
  expect(result).toMatchObject({ success: false, data: null })
  expect(JSON.stringify(result)).not.toContain("private database detail")
})
