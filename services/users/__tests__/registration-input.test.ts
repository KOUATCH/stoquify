jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { user: { findFirst: jest.fn(), findUnique: jest.fn() }, $transaction: jest.fn() } }))
jest.mock("@/lib/security/auth-credentials", () => ({ AUTH_MESSAGES: { registrationUnavailable: "unavailable" }, hashPolicyCompliantPassword: jest.fn(), upsertCredentialAccount: jest.fn() }))
jest.mock("@/services/security/public-identity-abuse.service", () => ({ enforcePublicIdentityAbuseLimits: jest.fn().mockResolvedValue({ allowed: true }) }))
jest.mock("@/lib/security/audit-log", () => ({ logSecurityEvent: jest.fn(), SecurityEventType: { AUTH_REGISTERED: "AUTH_REGISTERED" } }))
jest.mock("@/lib/security/server-authz", () => ({ safeUserSelect: {} }))
jest.mock("@/services/referrals/referral-attribution.service", () => ({ recordReferralConversionInTx: jest.fn() }))
jest.mock("../user-invitation-redemption-authority.service", () => ({ readInvitationRedemptionAuthority: jest.fn() }))
jest.mock("resend", () => ({ Resend: jest.fn() }))
jest.mock("@/components/email-templates/reset-password", () => ({ ResetPasswordEmail: jest.fn() }))
jest.mock("@/components/email-templates/verify-email", () => ({ __esModule: true, default: jest.fn() }))
import { db } from "@/prisma/db"
import { hashPolicyCompliantPassword } from "@/lib/security/auth-credentials"
import { createOrganizationOwner, registerOrganizationAccount } from "../user-identity.service"
import type { RegisterUserProps, UserProps } from "@/types/types"
const guided = (): RegisterUserProps => ({ firstName: "Synthetic", lastName: "Owner", email: "synthetic@example.invalid", phone: "+237600000019", companyName: "Synthetic Retail", companySize: "1-10", password: "Local!Credential-87", confirmPassword: "Local!Credential-87", termsAccepted: true })
beforeEach(() => { jest.clearAllMocks(); (db.user.findFirst as jest.Mock).mockResolvedValue({ id: "duplicate" }); (hashPolicyCompliantPassword as jest.Mock).mockResolvedValue({ ok: true, hash: "synthetic" }); (db.$transaction as jest.Mock).mockResolvedValue({ status: 409, data: null, error: "unavailable" }) })
it.each([
  { termsAccepted: false }, { termsAccepted: "true" }, { confirmPassword: "different" }, { phone: "x".repeat(33) }, { email: "x".repeat(255) + "@example.invalid" }, { requestedModules: Array(13).fill("POS") }, { countryCode: "arbitrary" }, { setupRole: "superuser" }, { accountantInviteAccepted: "true" },
])("rejects invalid guided input before account lookup: %j", async patch => {
  const result = await registerOrganizationAccount({ ...guided(), ...patch } as RegisterUserProps)
  expect(db.user.findFirst).not.toHaveBeenCalled(); expect(hashPolicyCompliantPassword).not.toHaveBeenCalled(); expect(db.$transaction).not.toHaveBeenCalled()
  expect(result).toMatchObject({ success: false, code: "VALIDATION_ERROR" })
})
it("bounds the legacy owner input before hashing or creating records", async () => {
  const data: UserProps = { ...guided(), name: "Synthetic Owner", organizationName: "Synthetic Retail", phone: "x".repeat(33) }
  const result = await createOrganizationOwner(data, { name: "Synthetic Retail" })
  expect(hashPolicyCompliantPassword).not.toHaveBeenCalled(); expect(db.$transaction).not.toHaveBeenCalled()
  expect(result).toMatchObject({ status: 400, code: "VALIDATION_ERROR" })
})
it.each(["guided", "legacy"])("requires an atomic creation audit for %s registration", async kind => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(null); (db.user.findUnique as jest.Mock).mockResolvedValue(null)
  const tx = {
    organization: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "org-owned", name: "Synthetic Retail" }) },
    role: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "role-owned", code: "administrator" }) },
    user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "user-owned", email: "synthetic@example.invalid", verificationToken: "123456", verificationTokenExpires: new Date(Date.now() + 60000) }), update: jest.fn() },
    passwordHistory: { create: jest.fn() },
    auditLog: { create: jest.fn().mockRejectedValue(new Error("registration audit unavailable")) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(tx))
  const promise = kind === "guided" ? registerOrganizationAccount({ ...guided(), requestedModules: [] }) : createOrganizationOwner({ ...guided(), name: "Synthetic Owner", organizationName: "Synthetic Retail" }, { name: "Synthetic Retail" })
  await expect(promise).rejects.toThrow("registration audit unavailable")
  if (kind === "guided") expect(tx.organization.create).toHaveBeenCalledWith({ data: expect.objectContaining({ requestedModules: [] }) })
  if (kind === "guided") expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ changes: expect.objectContaining({ onboarding: expect.objectContaining({ requestedModules: [] }) }) }) })
})
