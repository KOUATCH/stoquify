jest.mock("server-only", () => ({}))
import { serialize, deserialize } from "node:v8"
const structuredClone = <T,>(value: T): T => deserialize(serialize(value))
import { changeUserPasswordWorkflow } from "../user-password-change.service"
import { db } from "@/prisma/db"
import { hashPolicyCompliantPassword, syncUserCredentialPassword, verifyUserCredentialPassword } from "@/lib/security/auth-credentials"
import { verifyPassword } from "@/lib/password"

jest.mock("@/prisma/db", () => ({ db: { user: { findFirst: jest.fn() }, account: { findMany: jest.fn() }, session: { findFirst: jest.fn() }, $transaction: jest.fn() } }))
jest.mock("@/lib/security/auth-credentials", () => ({ AUTH_MESSAGES: {}, CREDENTIAL_PROVIDER_ID: "credential", hashPolicyCompliantPassword: jest.fn(), syncUserCredentialPassword: jest.fn(), verifyUserCredentialPassword: jest.fn(), upsertCredentialAccount: jest.fn() }))
jest.mock("@/lib/password", () => ({ verifyPassword: jest.fn() }))
jest.mock("@/lib/security/audit-log", () => ({ SecurityEventType: { AUTH_PASSWORD_CHANGED: "AUTH_PASSWORD_CHANGED" }, logSecurityEvent: jest.fn() }))
jest.mock("resend", () => ({ Resend: jest.fn() }))
jest.mock("../user-invitation-redemption-authority.service", () => ({ readInvitationRedemptionAuthority: jest.fn() }))
jest.mock("@/lib/security/server-authz", () => ({ safeUserSelect: {} }))
jest.mock("@/services/referrals/referral-attribution.service", () => ({ recordReferralConversionInTx: jest.fn() }))
jest.mock("@/services/security/public-identity-abuse.service", () => ({ enforcePublicIdentityAbuseLimits: jest.fn() }))
const mockDb = db as unknown as { user: { findFirst: jest.Mock }; account: { findMany: jest.Mock }; session: { findFirst: jest.Mock }; $transaction: jest.Mock }
const hash = hashPolicyCompliantPassword as jest.Mock, sync = syncUserCredentialPassword as jest.Mock
let target: Record<string, any>, actor: Record<string, any>, account: Record<string, any>[], session: Record<string, any>, organization: Record<string, any>, permissions: string[]
const tx = { $queryRaw: jest.fn(), auditLog: { create: jest.fn() }, user: { update: jest.fn() } }
const input = (self = true) => ({ actor: { id: self ? "target" : "admin", organizationId: "org" }, actorPermissions: ["profile.password.update", "users.password.reset"], targetUserId: "target", oldPassword: "Old!LocalCredential-57", newPassword: "New!LocalCredential-86", isSelfChange: self, session: { id: "session", token: "private-session" } })
beforeEach(() => {
  jest.clearAllMocks()
  permissions = ["profile.password.update", "users.password.reset"]
  organization = { id: "org", isActive: true, deletedAt: null }
  target = { id: "target", organizationId: "org", email: "target@example.invalid", password: "old-hash", isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null, verificationToken: "a".repeat(32), verificationTokenExpires: new Date(Date.now() + 60000), organization, roles: [{ organizationId: "org", permissions }] }
  actor = { ...target, id: "admin" }
  account = [{ id: "credential", userId: "target", accountId: "target", password: "old-hash" }]
  session = { id: "session", token: "private-session", userId: "target", expiresAt: new Date(Date.now() + 600000), assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: "org", assuranceLevel: 1, assuranceLockedUntil: null }
  mockDb.user.findFirst.mockImplementation(async ({ where }) => structuredClone(where.id === "admin" ? actor : target))
  mockDb.account.findMany.mockImplementation(async () => structuredClone(account))
  mockDb.session.findFirst.mockImplementation(async () => structuredClone(session))
  mockDb.$transaction.mockImplementation(async work => work(tx))
  tx.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) => {
    const sql = strings.join("?")
    if (sql.includes("FROM organizations")) return [structuredClone(organization)]
    if (sql.includes("FROM users")) return [structuredClone(target), structuredClone(actor)]
    if (sql.includes("FROM accounts")) return structuredClone(account)
    if (sql.includes("FROM sessions")) return [structuredClone(session)]
    if (sql.includes('"_UserRoles"')) return [{ permissions: [...permissions] }]
    throw new Error("Unmodeled query")
  })
  tx.auditLog.create.mockResolvedValue({ id: "audit" }); tx.user.update.mockResolvedValue({})
  hash.mockResolvedValue({ ok: true, hash: "new-hash" }); sync.mockResolvedValue(undefined)
  ;(verifyPassword as jest.Mock).mockImplementation(async password => password === input().oldPassword)
  ;(verifyUserCredentialPassword as jest.Mock).mockResolvedValue(true)
})
it("rejects an older request when the credential changes during password preparation", async () => {
  hash.mockImplementation(async () => { target.password = "newer-hash"; account[0].password = "newer-hash"; return { ok: true, hash: "new-hash" } })
  expect(await changeUserPasswordWorkflow(input())).toMatchObject({ status: 409 })
  expect(sync).not.toHaveBeenCalled()
})
it("does not commit an unrecorded password change when mandatory audit storage fails", async () => {
  tx.auditLog.create.mockRejectedValueOnce(new Error("OWNED_AUDIT_FAILURE"))
  await expect(changeUserPasswordWorkflow(input())).rejects.toThrow("OWNED_AUDIT_FAILURE")
})
it("rechecks a session revoked during password preparation", async () => {
  hash.mockImplementation(async () => { session.expiresAt = new Date(0); return { ok: true, hash: "new-hash" } })
  expect(await changeUserPasswordWorkflow(input())).toMatchObject({ status: 401 })
  expect(sync).not.toHaveBeenCalled()
})
it("rejects self-service password updates when the old password is wrong", async () => {
  ;(verifyPassword as jest.Mock).mockResolvedValue(false)
  expect(await changeUserPasswordWorkflow(input())).toMatchObject({ status: 403, code: "INVALID_CREDENTIALS" })
  expect(hash).not.toHaveBeenCalled(); expect(mockDb.$transaction).not.toHaveBeenCalled()
})
it("revokes target sessions and records a mandatory audit on an authorized administrative update", async () => {
  session.userId = "admin"
  expect(await changeUserPasswordWorkflow(input(false))).toMatchObject({ status: 200, data: { selfService: false, sessionsRevoked: true } })
  expect(sync).toHaveBeenCalledWith(tx, { userId: "target", passwordHash: "new-hash", revokeSessions: true })
  expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "AUTH_PASSWORD_CHANGED", userId: "admin", organizationId: "org", entityId: "target", changes: expect.objectContaining({ selfService: false, sessionsRevoked: true }) }) })
  expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toMatch(/private-session|old-hash|new-hash|Credential-86/)
})
it("derives self service from server identity instead of a caller mode flag", async () => {
  ;(verifyPassword as jest.Mock).mockResolvedValue(false)
  expect(await changeUserPasswordWorkflow({ ...input(), isSelfChange: false } as ReturnType<typeof input>)).toMatchObject({ code: "INVALID_CREDENTIALS" })
  expect(sync).not.toHaveBeenCalled()
})
it.each(["WEAK", "BREACHED", "RECENTLY_USED", "CONTAINS_EMAIL"])("returns the policy failure %s without writes", async code => {
  hash.mockResolvedValue({ ok: false, code, message: "Choose another password" })
  expect(await changeUserPasswordWorkflow(input())).toMatchObject({ status: 400, code })
  expect(mockDb.$transaction).not.toHaveBeenCalled()
})
it.each([{ actorPermissions: [] }, { actorPermissions: ["*"] }, { actorPermissions: ["PASSWORD_READ"] }])("denies missing or unsupported own-password authority %j", async ({ actorPermissions }) => {
  expect(await changeUserPasswordWorkflow({ ...input(), actorPermissions })).toMatchObject({ status: 403 })
  expect(hash).not.toHaveBeenCalled()
})
it("does not accept a context permission absent from the current stored actor", async () => {
  target.roles = [{ organizationId: "org", permissions: [] }]
  expect(await changeUserPasswordWorkflow(input())).toMatchObject({ status: 403 })
  expect(hash).not.toHaveBeenCalled()
})
it.each(["role", "actor", "organization", "target", "assurance"])("rejects %s revocation during password preparation", async kind => {
  hash.mockImplementation(async () => {
    if (kind === "role") permissions = []
    if (kind === "actor") actor.isActive = false
    if (kind === "organization") organization.isActive = false
    if (kind === "target") target.isActive = false
    if (kind === "assurance") session.assuranceVerifiedAt = new Date(0)
    return { ok: true, hash: "new-hash" }
  })
  session.userId = "admin"
  expect((await changeUserPasswordWorkflow(input(false))).status).toBe(kind === "target" ? 404 : 403)
  expect(sync).not.toHaveBeenCalled()
})
it("rejects a foreign target even when the context supplies reset authority", async () => {
  session.userId = "admin"; target.organizationId = "other"
  expect(await changeUserPasswordWorkflow(input(false))).toMatchObject({ status: 404 })
  expect(hash).not.toHaveBeenCalled()
})
it.each(["duplicate", "foreign", "wrong-key"])("requires review of an ambiguous %s credential", async kind => {
  if (kind === "duplicate") account.push({ ...account[0], id: "other" })
  if (kind === "foreign") account[0].userId = "other"
  if (kind === "wrong-key") account[0].accountId = "other"
  expect(await changeUserPasswordWorkflow(input())).toMatchObject({ status: 409, code: "CREDENTIAL_REVIEW_REQUIRED" })
  expect(hash).not.toHaveBeenCalled()
})
it("uses the legacy user hash only when no canonical account password exists", async () => {
  account = []
  expect(await changeUserPasswordWorkflow(input())).toMatchObject({ status: 200 })
  expect(verifyPassword).toHaveBeenCalledWith(input().oldPassword, "old-hash")
})
it("invalidates a previous reset link while leaving unrelated OTP state alone", async () => {
  expect(await changeUserPasswordWorkflow(input())).toMatchObject({ status: 200 })
  expect(tx.user.update).toHaveBeenCalledWith({ where: { id: "target" }, data: { verificationToken: null, verificationTokenExpires: null } })
  tx.user.update.mockClear(); target.verificationToken = "654321"
  expect(await changeUserPasswordWorkflow(input())).toMatchObject({ status: 200 })
  expect(tx.user.update).not.toHaveBeenCalled()
})
it("keeps credential failure from producing an audit success", async () => {
  sync.mockRejectedValueOnce(new Error("OWNED_CREDENTIAL_FAILURE"))
  await expect(changeUserPasswordWorkflow(input())).rejects.toThrow("OWNED_CREDENTIAL_FAILURE")
  expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it.each(["P2034", "P2002"])("reports concurrent conflict %s without automatic password replay", async code => {
  mockDb.$transaction.mockRejectedValueOnce({ code })
  expect(await changeUserPasswordWorkflow(input())).toMatchObject({ status: 409, code: "CREDENTIAL_CHANGED" })
  expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
})
it.each([{ oldPassword: "x".repeat(1025) }, { newPassword: "x".repeat(129) }, { targetUserId: "" }])("bounds input before password work", async change => {
  expect(await changeUserPasswordWorkflow({ ...input(), ...change })).toMatchObject({ status: 400 })
  expect(hash).not.toHaveBeenCalled(); expect(mockDb.user.findFirst).not.toHaveBeenCalled()
})
