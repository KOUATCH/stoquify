jest.mock("server-only", () => ({}))

import { hashPolicyCompliantPassword, syncUserCredentialPassword, upsertCredentialAccount, verifyUserCredentialPassword } from "@/lib/security/auth-credentials"
import { logSecurityEvent } from "@/lib/security/audit-log"
import { db } from "@/prisma/db"
import {
  acceptInvitationWorkflow,
  changeUserPasswordWorkflow,
  completePasswordResetWorkflow,
  createOrganizationOwner,
  requestPasswordResetLinkWorkflow,
  registerOrganizationAccount,
  sendInviteWorkflow,
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
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
  user: {
    findFirst: jest.Mock
    findUnique: jest.Mock
    update: jest.Mock
  }
}
const mockHashPolicyCompliantPassword = hashPolicyCompliantPassword as jest.Mock
const mockVerifyUserCredentialPassword = verifyUserCredentialPassword as jest.Mock
const mockSyncUserCredentialPassword = syncUserCredentialPassword as jest.Mock
const mockUpsertCredentialAccount = upsertCredentialAccount as jest.Mock
const mockLogSecurityEvent = logSecurityEvent as jest.Mock

beforeEach(() => {
  mockDb.$transaction.mockReset()
  mockDb.user.findFirst.mockReset()
  mockDb.user.findUnique.mockReset()
  mockDb.user.update.mockReset()
  mockHashPolicyCompliantPassword.mockReset()
  mockVerifyUserCredentialPassword.mockReset()
  mockSyncUserCredentialPassword.mockReset()
  mockUpsertCredentialAccount.mockReset()
  mockLogSecurityEvent.mockReset()
  mockHashPolicyCompliantPassword.mockResolvedValue({ ok: true, hash: "hash-1" })
  mockVerifyUserCredentialPassword.mockResolvedValue(true)
})

function runTransactionWith(tx: unknown) {
  mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
}

describe("user identity service creation and invite workflows", () => {
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
        update: jest.fn().mockResolvedValue({ id: "invite-1" }),
      },
      user: {
        create: jest.fn(),
      },
    }
    runTransactionWith(tx)

    const result = await acceptInvitationWorkflow({
      token: "invite-token",
      password: "Password123!",
    })

    expect(result).toEqual({
      error: "Invitation link has expired",
      status: 410,
      data: null,
    })
    expect(tx.invite.update).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { status: "EXPIRED" },
    })
    expect(tx.user.create).not.toHaveBeenCalled()
  })

  it("does not issue duplicate pending invitations", async () => {
    const tx = {
      role: {
        findFirst: jest.fn().mockResolvedValue({ id: "role-1", nameEn: "Cashier", nameFr: null }),
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
      actor: { id: "admin-1", organizationId: "org-1", organizationName: "Demo Org" },
      email: "User@Example.com",
      roleId: "role-1",
    })

    expect(result).toEqual({
      error: "This email user@example.com is already invited, Another invitation cannot be sent",
      status: 409,
      data: null,
    })
    expect(tx.invite.create).not.toHaveBeenCalled()
    expect(tx.invite.update).not.toHaveBeenCalled()
  })

  it("persists v2 registration onboarding context and creates a verified workflow payload", async () => {
    mockDb.user.findFirst.mockResolvedValue(null)
    mockDb.user.findUnique.mockResolvedValue(null)

    const verificationExpiresAt = new Date(Date.now() + 60_000)
    const tx = {
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
      password: "StrongPassword123!",
      confirmPassword: "StrongPassword123!",
      termsAccepted: true,
    })

    expect(result).toEqual({
      success: true,
      message: "Account created successfully! Please check your email to verify your account.",
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
          requestedModules: ["POS", "Inventory", "Accounting"],
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
        requestedModules: ["POS", "Inventory", "Accounting"],
        assistedSetupRequested: true,
        onboardingSource: "aqstoqflow-register-v2",
      }),
    })
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
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTH_REGISTERED",
        userId: "user-1",
        organizationId: "org-1",
        details: expect.objectContaining({
          onboarding: expect.objectContaining({
            source: "aqstoqflow-register-v2",
            defaultLocationId: "location-1",
          }),
        }),
      }),
    )
  })
})

describe("user identity service password and auth edge cases", () => {
  it("rejects self-service password updates when the old password is wrong", async () => {
    mockDb.user.findFirst.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    })
    mockVerifyUserCredentialPassword.mockResolvedValue(false)

    const result = await changeUserPasswordWorkflow({
      actor: { id: "user-1", organizationId: "org-1" },
      targetUserId: "user-1",
      oldPassword: "wrong-password",
      newPassword: "Password123!",
      isSelfChange: true,
    })

    expect(result).toEqual({ error: "Old Password Incorrect", status: 403 })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("revokes sessions when a password update succeeds", async () => {
    const tx = {}
    mockDb.user.findFirst.mockResolvedValue({
      id: "user-2",
      email: "user@example.com",
    })
    runTransactionWith(tx)

    const result = await changeUserPasswordWorkflow({
      actor: { id: "admin-1", organizationId: "org-1" },
      targetUserId: "user-2",
      oldPassword: "",
      newPassword: "Password123!",
      isSelfChange: false,
    })

    expect(result).toEqual({ error: null, status: 200 })
    expect(mockSyncUserCredentialPassword).toHaveBeenCalledWith(tx, {
      userId: "user-2",
      passwordHash: "hash-1",
      revokeSessions: true,
    })
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTH_PASSWORD_CHANGED",
        userId: "admin-1",
        organizationId: "org-1",
        resource: "user-2",
      }),
    )
  })

  it("keeps reset-link requests generic when the account is unknown", async () => {
    mockDb.user.findFirst.mockResolvedValue(null)

    const result = await requestPasswordResetLinkWorkflow("missing@example.com")

    expect(result).toEqual({ status: 200, error: null, data: null })
    expect(mockDb.user.update).not.toHaveBeenCalled()
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

  it("verifies email OTPs and clears the token on success", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      organizationId: "org-1",
      verificationToken: "123456",
      verificationTokenExpires: new Date(Date.now() + 60_000),
    })
    mockDb.user.update.mockResolvedValue({ id: "user-1" })

    const result = await verifyEmailOtpWorkflow("user-1", "123456")

    expect(result).toEqual({ status: 200 })
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
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
})
