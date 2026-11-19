jest.mock("server-only", () => ({}))
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/users/member-access.service", () => ({ changeMemberAccess: jest.fn() }))
jest.mock("@/services/users/member-access-read.service", () => ({ getMemberAccess: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), warn: jest.fn() } }))
import { requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import { changeMemberAccess } from "@/services/users/member-access.service"
import { getMemberAccess } from "@/services/users/member-access-read.service"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { changeMemberAccessAction, getMemberAccessAction } from "../memberAccess"

const command = { requestId: "09ba28c2-5a3a-48ae-b8c5-46e7abff3991", expectedRevision: "a".repeat(64), roleIds: ["role"], operation: "roles" as const, reason: "Changed work" }
beforeEach(() => { jest.clearAllMocks(); (requirePermission as jest.Mock).mockResolvedValue({ orgId: "org", userId: "actor", permissions: ["users.read"] }); (requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { userId: "actor", tenantId: "org", sessionId: "session", sessionToken: "private-token" } }); (changeMemberAccess as jest.Mock).mockResolvedValue({ id: "member", auditId: "record" }); (getMemberAccess as jest.Mock).mockResolvedValue({ organizationId: "org" }) })
it("uses only server-derived organization, actor and session authority", async () => { await expect(changeMemberAccessAction("member", command)).resolves.toMatchObject({ success: true }); expect(changeMemberAccess).toHaveBeenCalledWith({ organizationId: "org", actorId: "actor", targetUserId: "member", session: { id: "session", token: "private-token" }, command }) })
it.each([{ userId: "other", tenantId: "org" }, { userId: "actor", tenantId: "other" }])("rejects session/context disagreement", async claims => { (requireFreshAuth as jest.Mock).mockResolvedValue({ claims }); expect((await changeMemberAccessAction("member", command)).success).toBe(false); expect(changeMemberAccess).not.toHaveBeenCalled() })
it("does not fabricate a receipt after service denial", async () => { (changeMemberAccess as jest.Mock).mockRejectedValue(new ForbiddenError()); await expect(changeMemberAccessAction("member", command)).resolves.toMatchObject({ success: false, data: null, code: "FORBIDDEN" }) })
it("keeps failed reads distinct from an empty catalogue", async () => { (getMemberAccess as jest.Mock).mockRejectedValue(new Error("private database detail")); const result = await getMemberAccessAction("member"); expect(result).toMatchObject({ success: false, data: null }); expect(JSON.stringify(result)).not.toContain("private database detail") })
