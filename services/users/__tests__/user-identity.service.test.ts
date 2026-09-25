jest.mock("server-only", () => ({}))

import { adminPermissions } from "@/config/permissions"
import { hashPolicyCompliantPassword, syncUserCredentialPassword, upsertCredentialAccount, verifyUserCredentialPassword } from "@/lib/security/auth-credentials"
import { logSecurityEvent } from "@/lib/security/audit-log"
import { db } from "@/prisma/db"
import { recordReferralConversionInTx } from "@/services/referrals/referral-attribution.service"
import { enforcePublicIdentityAbuseLimits } from "@/services/security/public-identity-abuse.service"
import { Resend } from "resend"
import { readInvitationRedemptionAuthority } from "../user-invitation-redemption-authority.service"
jest.mock("../user-invitation-redemption-authority.service", () => ({ readInvitationRedemptionAuthority: jest.fn() }))
import {
  acceptInvitationWorkflow,
  completePasswordResetWorkflow,
  createOrganizationOwner,
  requestPasswordResetLinkWorkflow,
  requestEmailVerificationCodeWorkflow,
  registerOrganizationAccount,
  sendInviteWorkflow,
  getInviteRegistrationContext,
  listOrganizationInvites,
  verifyEmailOtpWorkflow,
} from "../user-identity.service"

jest.mock("@/components/email-templates/verify-email", () => ({
  __esModule: true,
  default: jest.fn(() => "verify-email"),
}))

jest.mock("@/components/email-templates/reset-password", () => ({
  ResetPasswordEmail: jest.fn(() => "reset-password-email"),
}))

jest.mock("@/components/email-templates/user-invite", () => ({
  __esModule: true,
  default: jest.fn(() => "user-invite-email"),
}))

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: "email-1" }, error: null }),
    },
  })),
}))

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    invite: { findUnique: jest.fn(), findMany: jest.fn() },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

jest.mock("@/lib/security/auth-credentials", () => ({
  AUTH_MESSAGES: {
    registrationUnavailable:
      "We could not complete registration with the provided details. Check your information or sign in if you already have an account.",
  },
  hashPolicyCompliantPassword: jest.fn(),
  syncUserCredentialPassword: jest.fn(),
  upsertCredentialAccount: jest.fn(),
  verifyUserCredentialPassword: jest.fn(),
}))

jest.mock("@/lib/security/audit-log", () => ({
  SecurityEventType: {
    AUTH_REGISTERED: "AUTH_REGISTERED",
    AUTH_EMAIL_VERIFICATION_SENT: "AUTH_EMAIL_VERIFICATION_SENT",
    AUTH_PASSWORD_CHANGED: "AUTH_PASSWORD_CHANGED",
    AUTH_PASSWORD_RESET_REQUESTED: "AUTH_PASSWORD_RESET_REQUESTED",
    AUTH_PASSWORD_RESET_COMPLETED: "AUTH_PASSWORD_RESET_COMPLETED",
    AUTH_EMAIL_VERIFIED: "AUTH_EMAIL_VERIFIED",
    INVITE_CREATED: "INVITE_CREATED",
    INVITE_REDEEMED: "INVITE_REDEEMED",
  },
  logSecurityEvent: jest.fn(),
}))

jest.mock("@/services/security/public-identity-abuse.service", () => ({
  enforcePublicIdentityAbuseLimits: jest.fn(),
}))

jest.mock("@/services/referrals/referral-attribution.service", () => ({
  recordReferralConversionInTx: jest.fn(),
}))

jest.mock("@/lib/security/server-authz", () => ({
  safeUserSelect: {
    id: true,
    email: true,
  },
}))

jest.mock("@/lib/generateOtp", () => ({
  generateOtp: jest.fn(() => "123456"),
}))

jest.mock("@/lib/token", () => ({
  generateToken: jest.fn(() => "reset-token"),
}))

const mockDb = db as unknown as {
  $transaction: jest.Mock
  invite: { findUnique: jest.Mock; findMany: jest.Mock }
  user: {
    findFirst: jest.Mock
    findUnique: jest.Mock
    update: jest.Mock
    updateMany: jest.Mock
  }
}
const mockHashPolicyCompliantPassword = hashPolicyCompliantPassword as jest.Mock
const mockVerifyUserCredentialPassword = verifyUserCredentialPassword as jest.Mock
const mockSyncUserCredentialPassword = syncUserCredentialPassword as jest.Mock
const mockUpsertCredentialAccount = upsertCredentialAccount as jest.Mock
const mockLogSecurityEvent = logSecurityEvent as jest.Mock
const mockEnforcePublicIdentityAbuseLimits = enforcePublicIdentityAbuseLimits as jest.Mock

const mockRecordReferralConversionInTx = recordReferralConversionInTx as jest.Mock
const mockResend = Resend as jest.Mock

describe("email verification resend recovery", () => {
  const pendingUser = () => ({
    id: "user-1", email: "owner@example.com", organizationId: "org-1",
    isVerified: false, emailVerified: false, isActive: true,
    verificationToken: "654321", verificationTokenExpires: new Date(Date.now() + 600000),
  })
  const response = { status: 200, error: null, data: null }

  it("requests delivery of the current valid OTP without changing its expiry or credentials", async () => {
    mockDb.user.findFirst.mockResolvedValue(pendingUser())
    await expect(requestEmailVerificationCodeWorkflow("user-1", " OWNER@example.com ", { ipAddress: "203.0.113.10" })).resolves.toEqual(response)
    expect(mockEnforcePublicIdentityAbuseLimits).toHaveBeenCalledWith(expect.objectContaining({ operation: "email_otp_resend", subject: "user-1", requestContext: { ipAddress: "203.0.113.10" } }))
    expect(mockDb.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "user-1", email: { equals: "owner@example.com", mode: "insensitive" }, isVerified: false, emailVerified: false, isActive: true }) }))
    expect(mockResend).toHaveBeenCalledTimes(1)
    expect(mockDb.user.updateMany).not.toHaveBeenCalled()
    expect(mockSyncUserCredentialPassword).not.toHaveBeenCalled()
  })

  it("rotates an expired code only while the same unverified state still exists", async () => {
    const user = { ...pendingUser(), verificationTokenExpires: new Date(Date.now() - 1000) }
    mockDb.user.findFirst.mockResolvedValue(user)
    mockDb.user.updateMany.mockResolvedValue({ count: 1 })
    await expect(requestEmailVerificationCodeWorkflow("user-1", user.email)).resolves.toEqual(response)
    expect(mockDb.user.updateMany).toHaveBeenCalledWith({ where: expect.objectContaining({ id: user.id, verificationToken: user.verificationToken, verificationTokenExpires: user.verificationTokenExpires, isVerified: false, emailVerified: false, isActive: true }), data: { verificationToken: "123456", verificationTokenExpires: expect.any(Date) } })
    expect(mockResend).toHaveBeenCalledTimes(1)
  })

  it("does not send a losing concurrent rotation", async () => {
    mockDb.user.findFirst.mockResolvedValue({ ...pendingUser(), verificationTokenExpires: null })
    mockDb.user.updateMany.mockResolvedValue({ count: 0 })
    await expect(requestEmailVerificationCodeWorkflow("user-1", "owner@example.com")).resolves.toEqual(response)
    expect(mockResend).not.toHaveBeenCalled()
  })

  it("preserves a live password-reset token", async () => {
    mockDb.user.findFirst.mockResolvedValue({ ...pendingUser(), verificationToken: "a".repeat(32) })
    await expect(requestEmailVerificationCodeWorkflow("user-1", "owner@example.com")).resolves.toEqual(response)
    expect(mockDb.user.updateMany).not.toHaveBeenCalled()
    expect(mockResend).not.toHaveBeenCalled()
  })

  it("does not reveal an unknown, verified, disabled or mismatched account", async () => {
    mockDb.user.findFirst.mockResolvedValue(null)
    await expect(requestEmailVerificationCodeWorkflow("user-1", "wrong@example.com")).resolves.toEqual(response)
    expect(mockResend).not.toHaveBeenCalled()
  })

  it("limits resend before lookup and mail", async () => {
    mockEnforcePublicIdentityAbuseLimits.mockResolvedValue({ allowed: false })
    await expect(requestEmailVerificationCodeWorkflow("user-1", "owner@example.com")).resolves.toEqual(response)
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
    expect(mockResend).not.toHaveBeenCalled()
  })

  it("keeps provider rejection private without a sent audit or account failure", async () => {
    mockDb.user.findFirst.mockResolvedValue(pendingUser())
    mockResend.mockImplementationOnce(() => ({ emails: { send: jest.fn().mockResolvedValue({ data: null, error: { message: "provider detail" } }) } }))
    await expect(requestEmailVerificationCodeWorkflow("user-1", "owner@example.com")).resolves.toEqual(response)
    expect(mockLogSecurityEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: "AUTH_EMAIL_VERIFICATION_SENT" }))
  })
})

beforeEach(() => {
  ;(readInvitationRedemptionAuthority as jest.Mock).mockReset().mockResolvedValue({ issueId: "issue-1", issuerId: "issuer-1", payloadHash: "approval-hash", rolePermissions: ["items.read"] })
  mockResend.mockClear()
  mockDb.$transaction.mockReset()
  mockDb.invite.findUnique.mockReset()
  mockDb.user.findFirst.mockReset()
  mockDb.user.findUnique.mockReset()
  mockDb.user.update.mockReset()
  mockDb.user.updateMany.mockReset()
  mockHashPolicyCompliantPassword.mockReset()
  mockVerifyUserCredentialPassword.mockReset()
  mockSyncUserCredentialPassword.mockReset()
  mockUpsertCredentialAccount.mockReset()
  mockLogSecurityEvent.mockReset()
  mockEnforcePublicIdentityAbuseLimits.mockReset()
  mockRecordReferralConversionInTx.mockReset()
  mockEnforcePublicIdentityAbuseLimits.mockResolvedValue({
    allowed: true,
    operation: "registration",
    retryAfterSeconds: 0,
  })
  mockHashPolicyCompliantPassword.mockResolvedValue({ ok: true, hash: "hash-1" })
  mockVerifyUserCredentialPassword.mockResolvedValue(true)
  mockRecordReferralConversionInTx.mockResolvedValue(null)
})

function runTransactionWith(tx: unknown) {
  const invitation = tx as { role?: { findFirst?: jest.Mock }; invite?: { create?: jest.Mock }; user?: { findFirst: jest.Mock }; businessEvent?: unknown; auditLog?: { create: jest.Mock } }
  if (invitation.role?.findFirst && invitation.invite?.create && invitation.user) {
    process.env.RESEND_FROM_EMAIL = "invites@example.invalid"
    process.env.NEXT_PUBLIC_BASE_URL = "http://127.0.0.1:3107"
    invitation.user.findFirst.mockImplementation(async args => args.where.id ? {
      id: "admin-1", isLocked: false, isVerified: true, emailVerified: true,
      organization: { name: "Demo Org", isActive: true, deletedAt: null },
      roles: [{ permissions: ["users.invite", "users.roles.assign", "dashboard.read", "items.read"] }],
    } : null)
    invitation.businessEvent = { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "issue-1" }) }
    invitation.auditLog = { create: jest.fn() }
  }
  mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
}

type InviteRoleFixture = {
  id: string
  nameEn: string
  nameFr: string | null
  code: string
  organizationId: string
  permissions: string[]
}

const inviteActor = {
  id: "admin-1",
  organizationId: "org-1",
  organizationName: "Demo Org",
}
const inviteGrantAuthority = ["users.invite", "users.roles.assign"]

describe("invitation input and register boundaries", () => {
  it.each([null, undefined, {}, { token: 5 }, { token: "a".repeat(64), password: "x".repeat(129) }, { token: "a".repeat(64), password: "Local!Password123", firstName: "x".repeat(101) }, { token: "a".repeat(64), password: "Local!Password123", phone: { unsafe: true } }])("rejects malformed redemption before lookup or hashing", async input => {
    expect(await acceptInvitationWorkflow(input as Parameters<typeof acceptInvitationWorkflow>[0])).toMatchObject({ status: 400, data: null, code: "INVITATION_INVALID" })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(mockHashPolicyCompliantPassword).not.toHaveBeenCalled()
    expect(mockEnforcePublicIdentityAbuseLimits).toHaveBeenCalled()
  })
  it("rejects malformed issuance even when the service is called directly", async () => {
    expect(await sendInviteWorkflow({ actor: inviteActor, actorPermissions: inviteGrantAuthority, email: "not-email", roleId: "role-1" })).toMatchObject({ status: 400, data: null })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(mockResend).not.toHaveBeenCalled()
  })
  it("derives expired state without changing accepted or cancelled records", async () => {
    const role = { nameEn: "Reader", nameFr: "Lecteur", code: "reader" }
    mockDb.invite.findMany.mockResolvedValue(["PENDING", "ACCEPTED", "CANCELLED"].map((status, index) => ({ id: String(index), email: "colleague@example.invalid", organizationId: "org-1", roleId: "reader", updatedAt: new Date("2020-01-01"), status, expiresAt: new Date("2020-01-01"), role })))
    const result = await listOrganizationInvites("org-1")
    expect(result.rows.map(row => row.status)).toEqual(["EXPIRED", "ACCEPTED", "CANCELLED"])
    expect(result.rows[0].storedStatus).toBe("PENDING")
    expect(Number.isNaN(Date.parse(result.asOf))).toBe(false)
    expect(mockDb.invite.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" }, select: expect.not.objectContaining({ token: true }) }))
  })
  it("propagates a failed register read and rejects an empty organization", async () => {
    mockDb.invite.findMany.mockRejectedValueOnce(new Error("offline"))
    await expect(listOrganizationInvites("org-1")).rejects.toThrow("offline")
    mockDb.invite.findMany.mockClear()
    await expect(listOrganizationInvites("")).rejects.toThrow("Organization scope is required")
    expect(mockDb.invite.findMany).not.toHaveBeenCalled()
  })
})

describe("current invitation redemption", () => {
  const token = "b".repeat(64)
  const invitation = () => ({ id: "invite-current", token, email: "Invited@Example.com", organizationId: "org-1", roleId: "role-1", status: "PENDING", expiresAt: new Date(Date.now() + 60000), organization: { name: "Scoped org", isActive: true, deletedAt: null }, role: { id: "role-1", organizationId: "org-1", permissions: ["items.read"], nameEn: "Reader", nameFr: "Lecteur", code: "reader" } })
  function setup(row = invitation()) {
    const tx = {
      invite: { findUnique: jest.fn().mockResolvedValue(row), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      user: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "invited-user", email: "invited@example.com" }) },
      passwordHistory: { create: jest.fn() }, auditLog: { create: jest.fn() },
    }
    runTransactionWith(tx)
    return tx
  }
  it("claims the current invitation before credentials and persists audit in the same transaction", async () => {
    const tx = setup()
    const input = { token, password: "Local!Password123", firstName: "Invited", email: "forged@example.com", organizationId: "foreign", roleId: "admin" }
    expect(await acceptInvitationWorkflow(input)).toMatchObject({ status: 200, data: { email: "invited@example.com", organizationId: "org-1", roleId: "role-1" } })
    expect(tx.invite.updateMany).toHaveBeenCalledWith({ where: expect.objectContaining({ id: "invite-current", token, email: "Invited@Example.com", roleId: "role-1", organizationId: "org-1", status: "PENDING", expiresAt: { gt: expect.any(Date) }, organization: { isActive: true, deletedAt: null }, role: { organizationId: "org-1", NOT: { permissions: { has: "*" } } } }), data: { status: "ACCEPTED" } })
    expect(tx.invite.updateMany.mock.invocationCallOrder[0]).toBeLessThan(tx.user.create.mock.invocationCallOrder[0])
    expect(mockUpsertCredentialAccount).toHaveBeenCalledWith(tx, { userId: "invited-user", passwordHash: "hash-1" })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: { entityType: "SecurityEvent", entityId: "invited-user", action: "INVITE_REDEEMED", userId: "invited-user", organizationId: "org-1", changes: { inviteId: "invite-current", roleId: "role-1", issueId: "issue-1", issuerId: "issuer-1", approvalPayloadHash: "approval-hash", rolePermissions: ["items.read"] } } })
    expect(mockLogSecurityEvent).not.toHaveBeenCalled()
    expect(mockResend).not.toHaveBeenCalled()
  })
  it.each(["disabled", "deleted", "foreign-role", "wildcard-role"])("refuses %s before credentials", async condition => {
    const row = invitation()
    if (condition === "disabled") row.organization.isActive = false
    if (condition === "deleted") Object.assign(row.organization, { deletedAt: new Date() })
    if (condition === "foreign-role") row.role.organizationId = "foreign"
    if (condition === "wildcard-role") row.role.permissions = ["*"]
    const tx = setup(row)
    expect(await acceptInvitationWorkflow({ token, password: "Local!Password123" })).toMatchObject({ status: 403, data: null })
    expect(mockHashPolicyCompliantPassword).not.toHaveBeenCalled()
    expect(tx.invite.updateMany).not.toHaveBeenCalled()
    expect(tx.user.create).not.toHaveBeenCalled()
  })
  it("does not overwrite concurrent redemption, cancellation, reissue or authority change", async () => {
    const tx = setup()
    tx.invite.updateMany.mockResolvedValue({ count: 0 })
    expect(await acceptInvitationWorkflow({ token, password: "Local!Password123" })).toMatchObject({ status: 409, data: null })
    expect(tx.user.create).not.toHaveBeenCalled()
    expect(mockUpsertCredentialAccount).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })
  it("rechecks expiry after password hashing", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-06T12:00:00Z"))
    try {
      const tx = setup()
      mockHashPolicyCompliantPassword.mockImplementation(async () => { jest.setSystemTime(new Date("2026-09-06T12:02:00Z")); return { ok: true, hash: "hash" } })
      expect(await acceptInvitationWorkflow({ token, password: "Local!Password123" })).toMatchObject({ status: 410, data: null })
      expect(tx.invite.updateMany).toHaveBeenCalledWith({ where: expect.objectContaining({ token, status: "PENDING", expiresAt: { lte: new Date("2026-09-06T12:02:00Z") } }), data: { status: "EXPIRED" } })
      expect(tx.user.create).not.toHaveBeenCalled()
    } finally { jest.useRealTimers() }
  })
  it("keeps invalid passwords from consuming the invitation", async () => {
    const tx = setup()
    mockHashPolicyCompliantPassword.mockResolvedValue({ ok: false, message: "Choose a stronger password" })
    expect(await acceptInvitationWorkflow({ token, password: "weak" })).toMatchObject({ status: 400 })
    expect(tx.invite.updateMany).not.toHaveBeenCalled()
    expect(tx.user.create).not.toHaveBeenCalled()
  })
  it("rejects unrecorded approval before hashing or consuming a link", async () => {
    const tx = setup()
    ;(readInvitationRedemptionAuthority as jest.Mock).mockResolvedValue(null)
    expect(await acceptInvitationWorkflow({ token, password: "Local!Password123" })).toMatchObject({ status: 403, code: "INVITATION_REISSUE_REQUIRED", data: null })
    expect(mockHashPolicyCompliantPassword).not.toHaveBeenCalled()
    expect(tx.invite.updateMany).not.toHaveBeenCalled()
    expect(tx.user.create).not.toHaveBeenCalled()
    mockDb.invite.findUnique.mockResolvedValue(invitation())
    expect(await getInviteRegistrationContext(token)).toMatchObject({ email: "", roleName: "", isValidInvite: false })
  })
  it("rechecks authority with locks after hashing and rejects a changed approval", async () => {
    const tx = setup()
    ;(readInvitationRedemptionAuthority as jest.Mock).mockResolvedValueOnce({ issueId: "issue-1", payloadHash: "approval-hash" }).mockResolvedValueOnce(null)
    expect(await acceptInvitationWorkflow({ token, password: "Local!Password123" })).toMatchObject({ status: 403, code: "INVITATION_REISSUE_REQUIRED", data: null })
    expect(readInvitationRedemptionAuthority).toHaveBeenLastCalledWith(tx, expect.objectContaining({ token }), tx)
    expect(mockHashPolicyCompliantPassword).toHaveBeenCalledTimes(1)
    expect(tx.invite.updateMany).not.toHaveBeenCalled()
    expect(tx.user.create).not.toHaveBeenCalled()
  })
  it("does not claim success if mandatory audit persistence fails", async () => {
    const tx = setup()
    tx.auditLog.create.mockRejectedValue(new Error("audit unavailable"))
    await expect(acceptInvitationWorkflow({ token, password: "Local!Password123" })).rejects.toThrow("audit unavailable")
    expect(mockLogSecurityEvent).not.toHaveBeenCalled()
  })
  it("rejects malformed tokens and hides invalid invitation metadata", async () => {
    expect(await acceptInvitationWorkflow({ token: "forged", password: "Local!Password123" })).toMatchObject({ status: 400 })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
    expect(await getInviteRegistrationContext("forged")).toMatchObject({ email: "", roleName: "", isValidInvite: false })
    expect(mockDb.invite.findUnique).not.toHaveBeenCalled()
    mockDb.invite.findUnique.mockResolvedValue({ ...invitation(), organization: { name: "Private disabled org", isActive: false, deletedAt: null } })
    expect(await getInviteRegistrationContext(token)).toMatchObject({ email: "", roleName: "", isValidInvite: false })
  })
})

function buildInviteTransaction(role: InviteRoleFixture | null) {
  return {
    role: {
      findFirst: jest.fn().mockResolvedValue(role),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    invite: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "invite-1" }),
      update: jest.fn(),
    },
  }
}

describe("user identity service creation and invite workflows", () => {
  it("loads identity read workflows without constructing an email provider", () => {
    jest.isolateModules(() => {
      const isolatedProvider = jest.requireMock("resend").Resend as jest.Mock
      isolatedProvider.mockClear()
      jest.requireActual("../user-identity.service")
      expect(isolatedProvider).not.toHaveBeenCalled()
    })
  })

  it("records invitation intent without contacting an email provider", async () => {
    const tx = buildInviteTransaction({ id: "role-1", nameEn: "Reader", nameFr: "Lecteur", code: "reader", organizationId: "org-1", permissions: ["items.read"] })
    runTransactionWith(tx)
    await expect(sendInviteWorkflow({ actor: inviteActor, actorPermissions: [...inviteGrantAuthority, "items.read"], email: "invite@example.com", roleId: "role-1" })).resolves.toMatchObject({ status: 200, data: { delivery: "PENDING" } })
    expect(mockResend).not.toHaveBeenCalled()
    expect(mockLogSecurityEvent).not.toHaveBeenCalled()
  })
  it("preserves the legacy registration conflict response without creating an organization", async () => {
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: "existing-user" }),
      },
      organization: {
        create: jest.fn(),
      },
    }
    runTransactionWith(tx)

    const result = await createOrganizationOwner(
      {
        email: "Owner@Example.com",
        password: "Password123!",
        firstName: "Owner",
        lastName: "One",
        name: "Owner One",
        organizationName: "Demo Org",
        phone: "+237600000001",
      },
      {
        name: "Demo Org",
      },
    )

    expect(result).toEqual({
      error:
        "We could not complete registration with the provided details. Check your information or sign in if you already have an account.",
      status: 409,
      data: null,
    })
    expect(tx.organization.create).not.toHaveBeenCalled()
  })

  it("creates the legacy owner administrator role with canonical explicit permissions", async () => {
    const verificationExpiresAt = new Date(Date.now() + 60_000)
    const tx = {
      auditLog: { create: jest.fn() },
      user: {
        findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue({
          id: "user-1",
          email: "owner@example.com",
          verificationToken: "123456",
          verificationTokenExpires: verificationExpiresAt,
        }),
      },
      organization: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "org-1" }),
      },
      role: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "role-1" }),
      },
      passwordHistory: {
        create: jest.fn().mockResolvedValue({ id: "history-1" }),
      },
    }
    runTransactionWith(tx)

    const result = await createOrganizationOwner(
      {
        email: "Owner@Example.com",
        password: "Password123!",
        firstName: "Owner",
        lastName: "One",
        name: "Owner One",
        organizationName: "Demo Org",
        phone: "+237600000001",
      },
      { name: "Demo Org" },
    )

    expect(result).toEqual({
      error: null,
      status: 200,
      data: {
        id: "user-1",
        email: "owner@example.com",
        organizationId: "org-1",
      },
    })
    expect(tx.role.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "admin",
        permissions: ["*", ...adminPermissions],
        organizationId: "org-1",
      }),
    })
    const createdPermissions = tx.role.create.mock.calls[0][0].data.permissions
    expect(createdPermissions).toEqual(
      expect.arrayContaining(["users.invite", "users.roles.assign"]),
    )
  })

  it("expires stale invitations without creating a user", async () => {
    const tx = {
      invite: {
        findUnique: jest.fn().mockResolvedValue({
          id: "invite-1",
          email: "user@example.com",
          organizationId: "org-1",
          roleId: "role-1",
          status: "PENDING",
          expiresAt: new Date("2020-01-01T00:00:00Z"),
          role: { id: "role-1", organizationId: "org-1" },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        create: jest.fn(),
      },
    }
    runTransactionWith(tx)

    const result = await acceptInvitationWorkflow({
      token: "a".repeat(64),
      password: "Password123!",
    })

    expect(result).toEqual({
      error: "Invitation link has expired",
      status: 410,
      data: null,
      code: "INVITATION_EXPIRED",
    })
    expect(tx.invite.updateMany).toHaveBeenCalledWith({
      where: { id: "invite-1", token: "a".repeat(64), status: "PENDING", expiresAt: { lte: expect.any(Date) } },
      data: { status: "EXPIRED" },
    })
    expect(tx.user.create).not.toHaveBeenCalled()
  })

  it("does not issue duplicate pending invitations", async () => {
    const tx = {
      role: {
        findFirst: jest.fn().mockResolvedValue({
          id: "role-1",
          nameEn: "Cashier",
          nameFr: null,
          code: "cashier",
          organizationId: "org-1",
          permissions: [],
        }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      invite: {
        findUnique: jest.fn().mockResolvedValue({
          id: "invite-1",
          status: "PENDING",
          expiresAt: new Date(Date.now() + 60_000),
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
    }
    runTransactionWith(tx)

    const result = await sendInviteWorkflow({
      actor: inviteActor,
      actorPermissions: inviteGrantAuthority,
      email: "User@Example.com",
      roleId: "role-1",
    })

    expect(result).toMatchObject({
      error: "This email already has a pending invitation",
      status: 409,
      data: null,
      code: "INVITATION_PENDING",
    })
    expect(tx.invite.create).not.toHaveBeenCalled()
    expect(tx.invite.update).not.toHaveBeenCalled()
  })

  it("rejects invitations without role-assignment authority before opening a transaction", async () => {
    const result = await sendInviteWorkflow({
      actor: inviteActor,
      actorPermissions: ["users.invite", "dashboard.read"],
      email: "user@example.com",
      roleId: "role-1",
    })

    expect(result).toMatchObject({
      error: "You are not allowed to invite users with roles",
      status: 403,
      data: null,
    })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("rejects invitation target roles containing wildcard permissions", async () => {
    const tx = buildInviteTransaction({
      id: "role-1",
      nameEn: "Administrator",
      nameFr: null,
      code: "administrator",
      organizationId: "org-1",
      permissions: ["*"],
    })
    runTransactionWith(tx)

    const result = await sendInviteWorkflow({
      actor: inviteActor,
      actorPermissions: [...inviteGrantAuthority, "dashboard.read"],
      email: "user@example.com",
      roleId: "role-1",
    })

    expect(result).toMatchObject({
      error: "You cannot grant the selected role",
      status: 403,
      data: null,
    })
    expect(tx.user.findFirst).not.toHaveBeenCalled()
    expect(tx.invite.create).not.toHaveBeenCalled()
  })

  it("rejects invitation target roles above the actor's explicit permission ceiling", async () => {
    const tx = buildInviteTransaction({
      id: "role-1",
      nameEn: "Controller",
      nameFr: null,
      code: "controller",
      organizationId: "org-1",
      permissions: ["dashboard.read", "accounting.period.close"],
    })
    runTransactionWith(tx)

    const result = await sendInviteWorkflow({
      actor: inviteActor,
      actorPermissions: [...inviteGrantAuthority, "dashboard.read", "*"],
      email: "user@example.com",
      roleId: "role-1",
    })

    expect(result).toMatchObject({
      error: "You cannot grant the selected role",
      status: 403,
      data: null,
    })
    expect(tx.user.findFirst).not.toHaveBeenCalled()
    expect(tx.invite.create).not.toHaveBeenCalled()
  })

  it("rejects an invitation role belonging to another tenant", async () => {
    const tx = buildInviteTransaction({
      id: "role-2",
      nameEn: "Cashier",
      nameFr: null,
      code: "cashier",
      organizationId: "org-2",
      permissions: ["dashboard.read"],
    })
    runTransactionWith(tx)

    const result = await sendInviteWorkflow({
      actor: inviteActor,
      actorPermissions: [...inviteGrantAuthority, "dashboard.read"],
      email: "user@example.com",
      roleId: "role-2",
    })

    expect(result).toMatchObject({
      error: "Invalid role for this organization",
      status: 403,
      data: null,
    })
    expect(tx.role.findFirst).toHaveBeenCalledWith({
      where: { id: "role-2", organizationId: "org-1" },
      select: {
        id: true,
        nameEn: true,
        nameFr: true,
        code: true,
        organizationId: true,
        permissions: true,
      },
    })
    expect(tx.user.findFirst).not.toHaveBeenCalled()
  })

  it("creates an invitation for a same-tenant role within the actor's explicit ceiling", async () => {
    const tx = buildInviteTransaction({
      id: "role-1",
      nameEn: "Cashier",
      nameFr: null,
      code: "cashier",
      organizationId: "org-1",
      permissions: ["dashboard.read"],
    })
    runTransactionWith(tx)

    const result = await sendInviteWorkflow({
      actor: inviteActor,
      actorPermissions: [...inviteGrantAuthority, "dashboard.read"],
      email: "User@Example.com",
      roleId: "role-1",
    })

    expect(result).toMatchObject({
      error: null,
      status: 200,
      data: { issueId: "issue-1", delivery: "PENDING" },
    })
    expect(tx.invite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "user@example.com",
        organizationId: "org-1",
        roleId: "role-1",
      }),
    })
    expect(mockLogSecurityEvent).not.toHaveBeenCalled()
    expect(mockResend).not.toHaveBeenCalled()
  })

  it("persists v2 registration onboarding context and creates a verified workflow payload", async () => {
    mockDb.user.findFirst.mockResolvedValue(null)
    mockDb.user.findUnique.mockResolvedValue(null)

    const verificationExpiresAt = new Date(Date.now() + 60_000)
    const tx = {
      auditLog: { create: jest.fn() },
      organization: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "org-1",
          name: "AqStoq Retail Group",
        }),
      },
      role: {
        create: jest.fn().mockResolvedValue({
          id: "role-1",
          code: "administrator",
        }),
      },
      user: {
        create: jest.fn().mockResolvedValue({
          id: "user-1",
          email: "owner@example.com",
          verificationToken: "123456",
          verificationTokenExpires: verificationExpiresAt,
        }),
        update: jest.fn().mockResolvedValue({ id: "user-1" }),
      },
      location: {
        create: jest.fn().mockResolvedValue({ id: "location-1" }),
      },
      passwordHistory: {
        create: jest.fn().mockResolvedValue({ id: "history-1" }),
      },
    }
    runTransactionWith(tx)

    const result = await registerOrganizationAccount({
      firstName: "Ada",
      lastName: "Owner",
      email: "Owner@Example.com",
      phone: "+237600000001",
      companyName: "AqStoq Retail Group",
      companySize: "11-50",
      industry: "Retail",
      country: "Cameroon",
      countryCode: "CM",
      currency: "XAF",
      timezone: "Africa/Douala",
      defaultLocale: "fr",
      businessType: "Retail",
      branchCount: "2-3",
      primaryPain: "Full operating system",
      setupRole: "owner",
      tradeName: "AqStoq Market",
      taxIdentifier: "M012345678901A",
      firstBranchName: "Main branch",
      requestedModules: ["POS", "Inventory", "POS", "Accounting"],
      assistedSetupRequested: true,
      onboardingSource: "aqstoqflow-register-v2",
      referralCode: "referral_code_123",
      accountantInviteToken: "invite-token-" + "a".repeat(32),
      accountantInviteAccepted: true,
      password: "StrongPassword123!",
      confirmPassword: "StrongPassword123!",
      termsAccepted: true,
    })

    expect(result).toEqual({
      success: true,
      message: "Account created. Continue to email verification; you can request a code there if needed.",
      data: {
        userId: "user-1",
        organizationId: "org-1",
        email: "owner@example.com",
        verificationRequired: true,
        defaultLocationId: "location-1",
        onboarding: {
          source: "aqstoqflow-register-v2",
          countryCode: "CM",
          companySize: "11-50",
          businessType: "Retail",
          branchCount: "2-3",
          primaryPain: "Full operating system",
          setupRole: "owner",
          requestedModules: ["POS", "Sales", "Inventory", "Accounting"],
          assistedSetupRequested: true,
        },
      },
    })

    expect(tx.organization.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "AqStoq Retail Group",
        tradeName: "AqStoq Market",
        taxIdentifier: "M012345678901A",
        country: "Cameroon",
        countryCode: "CM",
        companySize: "11-50",
        businessType: "Retail",
        branchCount: "2-3",
        primaryPain: "Full operating system",
        setupRole: "owner",
        requestedModules: ["POS", "Sales", "Inventory", "Accounting"],
        assistedSetupRequested: true,
        onboardingSource: "aqstoqflow-register-v2",
      }),
    })
    expect(tx.role.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "administrator",
        permissions: ["*", ...adminPermissions],
        organizationId: "org-1",
      }),
    })
    const createdPermissions = tx.role.create.mock.calls[0][0].data.permissions
    expect(createdPermissions).toEqual(
      expect.arrayContaining(["users.invite", "users.roles.assign"]),
    )
    expect(tx.location.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Main branch",
        code: "MAIN",
        organizationId: "org-1",
        managerId: "user-1",
      }),
      select: { id: true },
    })
    expect(mockUpsertCredentialAccount).toHaveBeenCalledWith(tx, {
      userId: "user-1",
      passwordHash: "hash-1",
    })
    expect(mockRecordReferralConversionInTx).toHaveBeenCalledWith(tx, {
      referralCode: "referral_code_123",
      targetOrganizationId: "org-1",
      subject: "owner@example.com",
      targetUserId: "user-1",
      accountantInviteToken: "invite-token-" + "a".repeat(32),
      accountantInviteAccepted: true,
      now: expect.any(Date),
    })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data:
      expect.objectContaining({
        action: "AUTH_REGISTERED",
        userId: "user-1",
        organizationId: "org-1",
        changes: expect.objectContaining({
          termsAccepted: true,
          onboarding: expect.objectContaining({
            source: "aqstoqflow-register-v2",
            defaultLocationId: "location-1",
          }),
        }),
      }),
    })
  })
})

describe("user identity service password and auth edge cases", () => {
  const resetToken = "a".repeat(32)
  const resetTransaction = (count = 1) => ({
    $queryRaw: jest.fn().mockImplementation(async (sql: TemplateStringsArray) => sql.join("").includes("FROM organizations") ? [{ isActive: true, deletedAt: null }] : [{ userId: "user-1", accountId: "user-1" }]),
    user: { updateMany: jest.fn().mockResolvedValue({ count }), update: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "reset-audit" }) },
  })
  // Password-change cases moved to user-password-change.service.test.ts with
  // current authority, session, concurrency and mandatory-audit coverage.

  it("keeps reset-link requests generic when the account is unknown", async () => {
    mockDb.user.findFirst.mockResolvedValue(null)

    const result = await requestPasswordResetLinkWorkflow("missing@example.com")

    expect(result).toEqual({ status: 200, error: null, data: null })
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("rolls back reset completion when the required transaction audit cannot be written", async () => {
    const tx = resetTransaction()
    tx.auditLog.create.mockRejectedValue(new Error("reset audit unavailable"))
    mockDb.user.findFirst.mockResolvedValue({ id: "user-1", email: "user@example.com", organizationId: "org-1" })
    runTransactionWith(tx)
    await expect(completePasswordResetWorkflow("user@example.com", resetToken, "Password123!")).rejects.toThrow("reset audit unavailable")
    expect(mockLogSecurityEvent).not.toHaveBeenCalled()
  })

  it("keeps reset delivery rejection generic without claiming a successful send", async () => {
    mockDb.user.findFirst.mockResolvedValue({ id: "user-1", email: "user@example.com", organizationId: "org-1" })
    mockResend.mockImplementationOnce(() => ({ emails: { send: jest.fn().mockResolvedValue({ data: null, error: { message: "provider rejected" } }) } }))
    expect(await requestPasswordResetLinkWorkflow("user@example.com")).toEqual({ status: 200, error: null, data: null })
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "AUTH_PASSWORD_RESET_REQUESTED" }))
    expect(mockLogSecurityEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: "AUTH_EMAIL_VERIFICATION_SENT" }))
  })

  it("rejects invalid password reset tokens without mutating credentials", async () => {
    mockDb.user.findFirst.mockResolvedValue(null)

    const result = await completePasswordResetWorkflow(
      "user@example.com",
      "bad-token",
      "Password123!",
    )

    expect(result).toEqual({
      status: 404,
      error: "Please use a valid reset link",
      data: null,
    })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("consumes a reset token in the credential transaction before changing the password", async () => {
    const tx = resetTransaction()
    mockDb.user.findFirst.mockResolvedValue({ id: "user-1", email: "user@example.com", organizationId: "org-1" })
    runTransactionWith(tx)

    const result = await completePasswordResetWorkflow("USER@example.com", resetToken, "Password123!")

    expect(result).toEqual({ status: 200, error: null, data: null })
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", organizationId: "org-1", isActive: true, password: undefined, email: { equals: "user@example.com", mode: "insensitive" }, verificationToken: resetToken, verificationTokenExpires: { gt: expect.any(Date) } },
      data: { verificationToken: null, verificationTokenExpires: null },
    })
    expect(tx.user.updateMany.mock.invocationCallOrder[0]).toBeLessThan(mockSyncUserCredentialPassword.mock.invocationCallOrder[0])
    expect(mockSyncUserCredentialPassword).toHaveBeenCalledWith(tx, { userId: "user-1", passwordHash: "hash-1", revokeSessions: true })
    expect(tx.user.update).not.toHaveBeenCalled()
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: { organizationId: "org-1", userId: "user-1", entityType: "SecurityEvent", entityId: "user-1", action: "AUTH_PASSWORD_RESET_COMPLETED", changes: { sessionsRevoked: true, resetLinkConsumed: true } } })
    expect(mockLogSecurityEvent).not.toHaveBeenCalled()
  })

  it("rejects a reset token consumed or replaced while password policy was checked", async () => {
    const tx = resetTransaction(0)
    mockDb.user.findFirst.mockResolvedValue({ id: "user-1", email: "user@example.com", organizationId: "org-1" })
    runTransactionWith(tx)

    const result = await completePasswordResetWorkflow("user@example.com", resetToken, "Password123!")

    expect(result).toEqual({ status: 404, error: "Please use a valid reset link", data: null })
    expect(mockSyncUserCredentialPassword).not.toHaveBeenCalled()
    expect(mockLogSecurityEvent).not.toHaveBeenCalled()
  })

  it("permits only one credential change when two requests read the same reset token", async () => {
    const tx = resetTransaction()
    tx.user.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    mockDb.user.findFirst.mockResolvedValue({ id: "user-1", email: "user@example.com", organizationId: "org-1" })
    runTransactionWith(tx)

    const results = await Promise.all([
      completePasswordResetWorkflow("user@example.com", resetToken, "Password123!"),
      completePasswordResetWorkflow("user@example.com", resetToken, "Password456!"),
    ])

    expect(results.map(result => result.status).sort()).toEqual([200, 404])
    expect(mockSyncUserCredentialPassword).toHaveBeenCalledTimes(1)
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1)
    expect(mockLogSecurityEvent).not.toHaveBeenCalled()
  })

  it.each([[], [{ isActive: false, deletedAt: null }], [{ isActive: true, deletedAt: new Date() }]])("rejects unavailable organization at commit without consuming the link: %j", async (...rows) => {
    const tx = resetTransaction()
    tx.$queryRaw.mockResolvedValue(rows)
    mockDb.user.findFirst.mockResolvedValue({ id: "user-1", email: "user@example.com", organizationId: "org-1" })
    runTransactionWith(tx)
    expect((await completePasswordResetWorkflow("user@example.com", resetToken, "Password123!")).status).toBe(404)
    expect(tx.user.updateMany).not.toHaveBeenCalled()
  })
  it.each([
    [{ userId: "foreign", accountId: "user-1" }],
    [{ userId: "user-1", accountId: "foreign" }],
    [{ userId: "user-1", accountId: "user-1" }, { userId: "user-1", accountId: "legacy" }],
  ])("rolls back an ambiguous credential mapping: %j", async (...rows) => {
    const tx = resetTransaction()
    tx.$queryRaw.mockResolvedValueOnce([{ isActive: true, deletedAt: null }]).mockResolvedValueOnce(rows)
    mockDb.user.findFirst.mockResolvedValue({ id: "user-1", email: "user@example.com", organizationId: "org-1" })
    runTransactionWith(tx)
    expect((await completePasswordResetWorkflow("user@example.com", resetToken, "Password123!")).status).toBe(404)
    expect(mockSyncUserCredentialPassword).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })
  it.each(["WEAK", "BREACHED", "RECENTLY_USED", "CONTAINS_EMAIL"])("retains policy code %s for localized feedback", async code => {
    mockDb.user.findFirst.mockResolvedValue({ id: "user-1", email: "user@example.com", organizationId: "org-1" })
    mockHashPolicyCompliantPassword.mockResolvedValue({ ok: false, code, message: "policy rejected" })
    expect(await completePasswordResetWorkflow("user@example.com", resetToken, "Password123!")).toMatchObject({ status: 400, code })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })
  it("bounds public reset input before database lookup or password hashing", async () => {
    expect((await completePasswordResetWorkflow("x".repeat(255) + "@example.invalid", resetToken, "Password123!")).status).toBe(404)
    expect((await completePasswordResetWorkflow("user@example.com", resetToken, "x".repeat(129))).status).toBe(400)
    expect(await requestPasswordResetLinkWorkflow(null as unknown as string)).toEqual({ status: 200, error: null, data: null })
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
    expect(mockHashPolicyCompliantPassword).not.toHaveBeenCalled()
  })

  it("verifies email OTPs and clears the token on success", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      organizationId: "org-1",
      verificationToken: "123456",
      verificationTokenExpires: new Date(Date.now() + 60_000),
    })
    mockDb.user.updateMany.mockResolvedValue({ count: 1 })

    const result = await verifyEmailOtpWorkflow("user-1", "123456")

    expect(result).toEqual({ status: 200 })
    expect(mockDb.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", verificationToken: "123456", verificationTokenExpires: { gt: expect.any(Date) } },
      data: {
        isVerified: true,
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    })
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTH_EMAIL_VERIFIED",
        userId: "user-1",
        organizationId: "org-1",
        resource: "user@example.com",
      }),
    )
  })

  it("does not accept an email verification code as a password-reset token", async () => {
    const result = await completePasswordResetWorkflow("user@example.com", "123456", "Password123!")
    expect(result.status).toBe(404)
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
    expect(mockHashPolicyCompliantPassword).not.toHaveBeenCalled()
  })

  it("does not accept a reset token as an email verification code", async () => {
    expect(await verifyEmailOtpWorkflow("user-1", resetToken)).toEqual({ status: 403 })
    expect(mockDb.user.findUnique).not.toHaveBeenCalled()
    expect(mockDb.user.updateMany).not.toHaveBeenCalled()
  })

  it.each([null, new Date(0)])("rejects an OTP with missing or expired validity: %s", async expiry => {
    mockDb.user.findUnique.mockResolvedValue({ id: "user-1", verificationToken: "123456", verificationTokenExpires: expiry })
    expect(await verifyEmailOtpWorkflow("user-1", "123456")).toEqual({ status: 403 })
    expect(mockDb.user.updateMany).not.toHaveBeenCalled()
    expect(mockLogSecurityEvent).not.toHaveBeenCalled()
  })

  it("rejects an OTP replaced or consumed after the initial read", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "user-1", email: "user@example.com", organizationId: "org-1", verificationToken: "123456", verificationTokenExpires: new Date(Date.now() + 60_000) })
    mockDb.user.updateMany.mockResolvedValue({ count: 0 })
    expect(await verifyEmailOtpWorkflow("user-1", "123456")).toEqual({ status: 403 })
    expect(mockLogSecurityEvent).not.toHaveBeenCalled()
  })
  it("blocks registration before password hashing or tenant creation when throttled", async () => {
    mockEnforcePublicIdentityAbuseLimits.mockResolvedValue({
      allowed: false,
      operation: "registration",
      retryAfterSeconds: 3600,
    })

    const result = await createOrganizationOwner(
      {
        email: "owner@example.com",
        password: "Password123!",
        firstName: "Owner",
        lastName: "One",
        name: "Owner One",
        organizationName: "Demo Org",
        phone: "+237600000001",
      },
      { name: "Demo Org" },
      { ipAddress: "203.0.113.10" },
    )

    expect(result).toMatchObject({ status: 429, data: null })
    expect(mockHashPolicyCompliantPassword).not.toHaveBeenCalled()
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("blocks invitation redemption before token lookup when throttled", async () => {
    mockEnforcePublicIdentityAbuseLimits.mockResolvedValue({
      allowed: false,
      operation: "invitation_redemption",
      retryAfterSeconds: 1800,
    })

    const result = await acceptInvitationWorkflow(
      { token: "invite-token", password: "Password123!" },
      { ipAddress: "203.0.113.10" },
    )

    expect(result).toEqual({
      error: "Too many invitation attempts. Please try again later.",
      status: 429,
      data: null,
      code: "RATE_LIMITED",
    })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("keeps throttled reset-link requests generic and skips account lookup", async () => {
    mockEnforcePublicIdentityAbuseLimits.mockResolvedValue({
      allowed: false,
      operation: "password_reset_request",
      retryAfterSeconds: 1800,
    })

    const result = await requestPasswordResetLinkWorkflow(
      "user@example.com",
      { ipAddress: "203.0.113.10" },
    )

    expect(result).toEqual({ status: 200, error: null, data: null })
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
  })

  it("blocks reset completion before token lookup when throttled", async () => {
    mockEnforcePublicIdentityAbuseLimits.mockResolvedValue({
      allowed: false,
      operation: "password_reset_completion",
      retryAfterSeconds: 1800,
    })

    const result = await completePasswordResetWorkflow(
      "user@example.com",
      "reset-token",
      "Password123!",
      { ipAddress: "203.0.113.10" },
    )

    expect(result).toMatchObject({ status: 429, data: null })
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
  })

  it("blocks OTP verification before user lookup when throttled", async () => {
    mockEnforcePublicIdentityAbuseLimits.mockResolvedValue({
      allowed: false,
      operation: "email_otp_verification",
      retryAfterSeconds: 1800,
    })

    const result = await verifyEmailOtpWorkflow(
      "user-1",
      "123456",
      { ipAddress: "203.0.113.10" },
    )

    expect(result).toEqual({ status: 429 })
    expect(mockDb.user.findUnique).not.toHaveBeenCalled()
  })
})
