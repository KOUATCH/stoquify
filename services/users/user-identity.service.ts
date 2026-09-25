import "server-only"
import { invitationRedemptionInput } from "./invitation-input"
import { invitationRevision } from "./invitation-revision"
import { passwordRecoveryEmail, passwordResetRequest } from "./password-recovery-input"
import { guidedRegistrationInput, legacyOwnerInput } from "./registration-input"

import VerifyEmail from "@/components/email-templates/verify-email"
import { ResetPasswordEmail } from "@/components/email-templates/reset-password"
import { adminPermissions } from "@/config/permissions"
import { generateOtp } from "@/lib/generateOtp"
import { generateSlug } from "@/lib/generateSlug"
import { logger } from "@/lib/logger"
import {
  AUTH_MESSAGES,
  hashPolicyCompliantPassword,
  syncUserCredentialPassword,
  upsertCredentialAccount,
} from "@/lib/security/auth-credentials"
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log"
import type { PublicIdentityRequestContext } from "@/lib/security/public-request-context"
import { safeUserSelect } from "@/lib/security/server-authz"
import { generateToken } from "@/lib/token"
import { db } from "@/prisma/db"
import { readInvitationRedemptionAuthority } from "./user-invitation-redemption-authority.service"
import { recordReferralConversionInTx } from "@/services/referrals/referral-attribution.service"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { enforcePublicIdentityAbuseLimits } from "@/services/security/public-identity-abuse.service"
import type { OrgDataProps, RegisterUserProps, RegisterWorkflowData, UserProps } from "@/types/types"
import { InviteStatus, Locale as PrismaLocale, LocationType, type Prisma } from "@prisma/client"
import { randomUUID } from "crypto"
import { Resend } from "resend"

function identityEmailClient() {
  return new Resend(process.env.RESEND_API_KEY)
}

const ADMIN_USER_ROLE = {
  nameEn: "Admin",
  nameFr: "Administrateur",
  description: "Default Admin role with all permissions",
  permissions: ["*", ...adminPermissions],
}

type StatusResult<T = null> = {
  error: string | null
  status: number
  data: T | null
  code?: string
}

class PasswordResetUnavailableError extends Error {}

type InvitedUserInput = {
  token: string
  password: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  image?: string | null
}

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function addDetail(target: Record<string, unknown>, key: string, value: unknown) {
  if (value === undefined || value === null) return
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return
    target[key] = trimmed
    return
  }
  if (Array.isArray(value)) {
    const cleanValues = value
      .map((item) => (typeof item === "string" ? item.trim() : item))
      .filter(Boolean)
    if (cleanValues.length > 0) target[key] = cleanValues
    return
  }
  target[key] = value
}

const REGISTER_MODULE_DEFAULTS = ["POS", "Sales", "Inventory", "Accounting", "Payment reconciliation", "Payroll"]

function normalizeRequestedModules(value?: string[] | null) {
  const modules = (value ?? REGISTER_MODULE_DEFAULTS)
    .map((module) => cleanText(module))
    .filter((module): module is string => Boolean(module))
    .map((module) => module.slice(0, 80))

  const uniqueModules = [...new Set(modules)]
  const posIndex = uniqueModules.findIndex((module) => module.toLowerCase() === "pos")
  const hasSales = uniqueModules.some((module) => module.toLowerCase() === "sales")
  if (posIndex >= 0 && !hasSales) {
    uniqueModules.splice(posIndex + 1, 0, "Sales")
  }

  return uniqueModules.slice(0, 12)
}

function normalizeRegistrationOnboarding(data: RegisterUserProps): RegisterWorkflowData["onboarding"] {
  return {
    source: cleanText(data.onboardingSource) || "legacy_register",
    countryCode: cleanText(data.countryCode),
    companySize: cleanText(data.companySize),
    businessType: cleanText(data.businessType),
    branchCount: cleanText(data.branchCount),
    primaryPain: cleanText(data.primaryPain),
    setupRole: cleanText(data.setupRole),
    requestedModules: normalizeRequestedModules(data.requestedModules),
    assistedSetupRequested: data.assistedSetupRequested === true,
  }
}

function buildRegistrationOnboardingDetails(
  data: RegisterUserProps,
  defaultLocationId?: string | null,
  onboarding = normalizeRegistrationOnboarding(data),
) {
  const details: Record<string, unknown> = {
    source: onboarding.source,
  }

  addDetail(details, "countryCode", onboarding.countryCode)
  addDetail(details, "companySize", onboarding.companySize)
  addDetail(details, "businessType", onboarding.businessType)
  addDetail(details, "branchCount", onboarding.branchCount)
  addDetail(details, "primaryPain", onboarding.primaryPain)
  addDetail(details, "setupRole", onboarding.setupRole)
  addDetail(details, "tradeName", data.tradeName)
  addDetail(details, "taxIdentifier", data.taxIdentifier)
  addDetail(details, "firstBranchName", data.firstBranchName)
  details.requestedModules = onboarding.requestedModules
  addDetail(details, "assistedSetupRequested", onboarding.assistedSetupRequested)
  addDetail(details, "defaultLocationId", defaultLocationId)

  return details
}

function normalizeSlug(value: string) {
  const slug = generateSlug(value).replace(/^-+|-+$/g, "")
  return slug || `organization-${randomUUID().slice(0, 8)}`
}

function toPrismaLocale(value?: string | null) {
  return value === "fr" ? PrismaLocale.FR : PrismaLocale.EN
}

async function resolveUniqueOrganizationSlug(
  tx: Pick<Prisma.TransactionClient, "organization">,
  requestedSlug: string | undefined,
  organizationName: string,
) {
  const baseSlug = normalizeSlug(requestedSlug || organizationName)
  let candidate = baseSlug
  let suffix = 2

  while (await tx.organization.findUnique({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return candidate
}

async function sendVerificationEmail(input: {
  email: string
  verificationCode: string
  action: string
  userId?: string
  organizationId?: string
  expiresAt?: Date | null
}) {
  try {
    const result = await identityEmailClient().emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: input.email,
      subject: "Verify your StockFlow account",
      react: VerifyEmail({ verificationCode: input.verificationCode }),
    })

    if (result.error || !result.data?.id) {
      throw new BusinessRuleError("Verification email could not be sent")
    }

    if (input.userId && input.organizationId) {
      await logSecurityEvent({
        type: SecurityEventType.AUTH_EMAIL_VERIFICATION_SENT,
        userId: input.userId,
        organizationId: input.organizationId,
        resource: input.email,
        details: { expiresAt: input.expiresAt?.toISOString() },
      })
    }
  } catch (error) {
    logger.warn("verification email sending failed", {
      action: input.action,
      userId: input.userId,
      organizationId: input.organizationId,
    })
  }
}

export async function createOrganizationOwner(
  data: UserProps,
  orgData: OrgDataProps,
  requestContext?: PublicIdentityRequestContext | null,
): Promise<StatusResult<{ id: string; email: string; organizationId: string }>> {
  const parsed = legacyOwnerInput.safeParse({ user: data, organization: orgData })
  if (!parsed.success) return { status: 400, code: "VALIDATION_ERROR", error: "Check the account and organization details.", data: null }
  const { email, password, firstName, lastName, phone, image } = parsed.data.user
  orgData = parsed.data.organization
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPhone = phone.trim()
  const abuseDecision = await enforcePublicIdentityAbuseLimits({
    operation: "registration",
    subject: normalizedEmail,
    requestContext,
  })
  if (!abuseDecision.allowed) {
    return {
      error: AUTH_MESSAGES.registrationUnavailable,
      status: 429,
      data: null,
    }
  }
  const passwordPolicy = await hashPolicyCompliantPassword({
    password,
    email: normalizedEmail,
  })

  if (!passwordPolicy.ok) {
    return {
      error: passwordPolicy.message,
      status: 400,
      data: null,
    }
  }

  const result = await db.$transaction(async (tx) => {
    const now = new Date()
    const existingUserByEmail = await tx.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUserByEmail) {
      return {
        error: AUTH_MESSAGES.registrationUnavailable,
        status: 409,
        data: null,
      }
    }

    const existingUserByPhone = await tx.user.findUnique({
      where: { phone: normalizedPhone },
    })

    if (existingUserByPhone) {
      return {
        error: AUTH_MESSAGES.registrationUnavailable,
        status: 409,
        data: null,
      }
    }

    const organizationSlug = await resolveUniqueOrganizationSlug(tx, orgData.slug, orgData.name)
    const org = await tx.organization.create({
      data: {
        id: randomUUID(),
        name: orgData.name,
        slug: organizationSlug,
        industry: cleanText(orgData.industry),
        country: cleanText(orgData.country),
        state: cleanText(orgData.state),
        address: cleanText(orgData.address),
        currency: orgData.currency || "XAF",
        timezone: orgData.timezone || "Africa/Douala",
        defaultLocale: toPrismaLocale(orgData.defaultLocale),
        isActive: true,
        updatedAt: now,
      },
    })

    let defaultRole = await tx.role.findFirst({
      where: {
        code: "admin",
        organizationId: org.id,
      },
    })

    if (!defaultRole) {
      defaultRole = await tx.role.create({
        data: {
          id: randomUUID(),
          ...ADMIN_USER_ROLE,
          code: "admin",
          organizationId: org.id,
          permissions: ADMIN_USER_ROLE.permissions,
          updatedAt: now,
        },
      })
    }

    const hashedPassword = passwordPolicy.hash
    const token = generateOtp()
    const verificationTokenExpires = new Date(Date.now() + 1000 * 60 * 30)
    const newUser = await tx.user.create({
      data: {
        id: randomUUID(),
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        organizationId: org.id,
        verificationToken: token,
        verificationTokenExpires,
        phone: normalizedPhone,
        image: image || "",
        isVerified: false,
        preferredLocale: toPrismaLocale(orgData.defaultLocale),
        updatedAt: now,
        roles: {
          connect: {
            id: defaultRole.id,
          },
        },
      },
      select: {
        id: true,
        email: true,
        verificationToken: true,
        verificationTokenExpires: true,
      },
    })

    await tx.passwordHistory.create({
      data: {
        userId: newUser.id,
        passwordHash: hashedPassword,
      },
    })

    await upsertCredentialAccount(tx, {
      userId: newUser.id,
      passwordHash: hashedPassword,
    })
    await tx.auditLog.create({ data: {
      organizationId: org.id, userId: newUser.id, entityType: "SecurityEvent", entityId: newUser.id,
      action: SecurityEventType.AUTH_REGISTERED, changes: { source: "legacy_create_user_action" },
    } })

    return {
      error: null,
      status: 200,
      data: {
        id: newUser.id,
        email: newUser.email,
        organizationId: org.id,
        verificationToken: newUser.verificationToken ?? "",
        verificationTokenExpires: newUser.verificationTokenExpires,
      },
    }
  })

  if (result.status === 200 && result.data) {
    await sendVerificationEmail({
      email: result.data.email,
      verificationCode: result.data.verificationToken,
      action: "users.create.email",
      userId: result.data.id,
      organizationId: result.data.organizationId,
      expiresAt: result.data.verificationTokenExpires,
    })

  }

  return {
    error: result.error,
    status: result.status,
    data: result.data
      ? {
          id: result.data.id,
          email: result.data.email,
          organizationId: result.data.organizationId,
        }
      : null,
  }
}

export async function registerOrganizationAccount(
  data: RegisterUserProps,
  requestContext?: PublicIdentityRequestContext | null,
) {
  const parsed = guidedRegistrationInput.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Check the registration details, password confirmation and required acceptance.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  data = parsed.data

  const email = data.email.trim().toLowerCase()
  const abuseDecision = await enforcePublicIdentityAbuseLimits({
    operation: "registration",
    subject: email,
    requestContext,
  })
  if (!abuseDecision.allowed) {
    return {
      success: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: abuseDecision.retryAfterSeconds,
      error: AUTH_MESSAGES.registrationUnavailable,
    }
  }
  const phone = data.phone.trim()
  const companyName = data.companyName.trim()
  const firstName = data.firstName.trim()
  const lastName = data.lastName.trim()
  const onboarding = normalizeRegistrationOnboarding(data)
  const tradeName = cleanText(data.tradeName)
  const taxIdentifier = cleanText(data.taxIdentifier)
  const firstBranchName = cleanText(data.firstBranchName) || "Main branch"
  const existingUser = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  })

  if (existingUser) {
    return {
      success: false,
      error: AUTH_MESSAGES.registrationUnavailable,
    }
  }

  const existingPhone = await db.user.findUnique({
    where: { phone },
  })

  if (existingPhone) {
    return {
      success: false,
      error: AUTH_MESSAGES.registrationUnavailable,
    }
  }

  const passwordPolicy = await hashPolicyCompliantPassword({
    password: data.password,
    email,
  })

  if (!passwordPolicy.ok) {
    return {
      success: false,
      code: passwordPolicy.code,
      error: passwordPolicy.message,
    }
  }

  const hashedPassword = passwordPolicy.hash
  const defaultLocale = toPrismaLocale(data.defaultLocale)
  const result = await db.$transaction(async (tx) => {
    const now = new Date()
    const orgSlug = await resolveUniqueOrganizationSlug(tx, undefined, companyName)
    const isV2Onboarding = data.onboardingSource === "aqstoqflow-register-v2"

    const organization = await tx.organization.create({
      data: {
        id: randomUUID(),
        name: companyName,
        slug: orgSlug,
        industry: cleanText(data.industry),
        tradeName,
        taxIdentifier,
        country: cleanText(data.country),
        countryCode: onboarding.countryCode,
        state: cleanText(data.state),
        address: cleanText(data.address),
        currency: data.currency || "XAF",
        timezone: data.timezone || "Africa/Douala",
        defaultLocale,
        companySize: onboarding.companySize,
        businessType: onboarding.businessType,
        branchCount: onboarding.branchCount,
        primaryPain: onboarding.primaryPain,
        setupRole: onboarding.setupRole,
        requestedModules: onboarding.requestedModules,
        assistedSetupRequested: onboarding.assistedSetupRequested,
        onboardingSource: onboarding.source,
        onboardingCompletedAt: now,
        isActive: true,
        updatedAt: now,
      },
    })

    const adminRole = await tx.role.create({
      data: {
        id: randomUUID(),
        nameEn: "Administrator",
        nameFr: "Administrateur",
        code: "administrator",
        description: "Organization administrator with full access",
        permissions: ADMIN_USER_ROLE.permissions,
        organizationId: organization.id,
        updatedAt: now,
      },
    })

    const verificationToken = generateOtp()
    const verificationTokenExpires = new Date(Date.now() + 1000 * 60 * 30)
    const user = await tx.user.create({
      data: {
        id: randomUUID(),
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        image: "",
        organizationId: organization.id,
        isActive: true,
        isVerified: false,
        verificationToken,
        verificationTokenExpires,
        preferredLocale: defaultLocale,
        updatedAt: now,
      },
    })

    await tx.user.update({
      where: { id: user.id },
      data: {
        roles: {
          connect: { id: adminRole.id },
        },
      },
    })

    let defaultLocation: { id: string } | null = null

    if (isV2Onboarding || cleanText(data.firstBranchName)) {
      defaultLocation = await tx.location.create({
        data: {
          id: randomUUID(),
          name: firstBranchName,
          code: "MAIN",
          type: LocationType.STORE,
          address: cleanText(data.address),
          phone,
          email,
          isActive: true,
          isDefault: true,
          organizationId: organization.id,
          managerId: user.id,
          updatedAt: now,
        },
        select: {
          id: true,
        },
      })
    }

    await tx.passwordHistory.create({
      data: {
        userId: user.id,
        passwordHash: hashedPassword,
      },
    })

    await upsertCredentialAccount(tx, {
      userId: user.id,
      passwordHash: hashedPassword,
    })

    await recordReferralConversionInTx(tx, {
      referralCode: data.referralCode,
      targetOrganizationId: organization.id,
      subject: user.email,
      targetUserId: user.id,
      accountantInviteToken: data.accountantInviteToken,
      accountantInviteAccepted: data.accountantInviteAccepted === true,
      now,
    })
    await tx.auditLog.create({ data: {
      organizationId: organization.id, userId: user.id, entityType: "SecurityEvent", entityId: user.id,
      action: SecurityEventType.AUTH_REGISTERED,
      changes: {
        organizationId: organization.id, roleId: adminRole.id, roleCode: adminRole.code,
        onboarding: buildRegistrationOnboardingDetails(data, defaultLocation?.id, onboarding),
        termsAccepted: true,
      } as Prisma.InputJsonValue,
    } })

    return { user, organization, role: adminRole, defaultLocation }
  })

  await sendVerificationEmail({
    email: result.user.email,
    verificationCode: result.user.verificationToken ?? "",
    action: "auth.register.email",
    userId: result.user.id,
    organizationId: result.organization.id,
    expiresAt: result.user.verificationTokenExpires,
  })

  return {
    success: true,
    message: "Account created. Continue to email verification; you can request a code there if needed.",
    data: {
      userId: result.user.id,
      organizationId: result.organization.id,
      email: result.user.email,
      verificationRequired: true,
      defaultLocationId: result.defaultLocation?.id ?? null,
      onboarding,
    },
  }
}

export { issueUserInvitation as sendInviteWorkflow } from "./user-invitation-issuance.service"

export async function acceptInvitationWorkflow(
  data: InvitedUserInput,
  requestContext?: PublicIdentityRequestContext | null,
): Promise<StatusResult<{ id: string; email: string; organizationId: string; inviteId: string; roleId: string }>> {
  const abuseDecision = await enforcePublicIdentityAbuseLimits({
    operation: "invitation_redemption",
    subject: typeof data?.token === "string" ? data.token : "invalid-invitation-input",
    requestContext,
  })
  if (!abuseDecision.allowed) {
    return {
      error: "Too many invitation attempts. Please try again later.",
      status: 429,
      data: null,
      code: "RATE_LIMITED",
    }
  }

  const parsed = invitationRedemptionInput.safeParse(data)
  if (!parsed.success) {
    return { error: "Invalid invitation details", status: 400, data: null, code: "INVITATION_INVALID" }
  }
  data = parsed.data

  return db.$transaction(async (tx) => {
    const invite = await tx.invite.findUnique({
      where: { token: data.token },
      include: {
        role: { select: { id: true, organizationId: true, permissions: true } },
        organization: { select: { isActive: true, deletedAt: true } },
      },
    })

    if (!invite || invite.status !== InviteStatus.PENDING) {
      return {
        error: "Invalid or already used invitation link",
        status: 400,
        data: null,
        code: "INVITATION_INVALID",
      }
    }

    if (invite.expiresAt <= new Date()) {
      await tx.invite.updateMany({
        where: { id: invite.id, token: data.token, status: InviteStatus.PENDING, expiresAt: { lte: new Date() } },
        data: { status: InviteStatus.EXPIRED },
      })

      return {
        error: "Invitation link has expired",
        status: 410,
        data: null,
        code: "INVITATION_EXPIRED",
      }
    }

    if (invite.role.organizationId !== invite.organizationId || invite.role.permissions.includes("*") || !invite.organization.isActive || invite.organization.deletedAt) {
      return {
        error: "Invitation organization or role is unavailable",
        status: 403,
        data: null,
        code: "INVITATION_UNAVAILABLE",
      }
    }

    const approval = await readInvitationRedemptionAuthority(tx, invite)
    if (!approval) return { error: "Ask your organization administrator to review and replace this invitation.", status: 403, data: null, code: "INVITATION_REISSUE_REQUIRED" }

    const email = invite.email.trim().toLowerCase()
    const existingUser = await tx.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    })

    if (existingUser) {
      return {
        error: "This email is already registered",
        status: 409,
        data: null,
        code: "INVITATION_ACCOUNT_EXISTS",
      }
    }

    const passwordPolicy = await hashPolicyCompliantPassword({
      password: data.password,
      email,
    })

    if (!passwordPolicy.ok) {
      return {
        error: passwordPolicy.message,
        status: 400,
        data: null,
        code: passwordPolicy.code,
      }
    }

    // Hashing can outlast an invitation or overlap revocation/reissue. Claim the
    // same current record before credentials, with all effects in this transaction.
    const currentApproval = await readInvitationRedemptionAuthority(tx, invite, tx)
    if (!currentApproval || currentApproval.issueId !== approval.issueId || currentApproval.payloadHash !== approval.payloadHash) return { error: "Invitation authority changed. Ask your administrator to review and replace the invitation.", status: 403, data: null, code: "INVITATION_REISSUE_REQUIRED" }
    const claimedAt = new Date()
    if (invite.expiresAt <= claimedAt) {
      await tx.invite.updateMany({ where: { id: invite.id, token: data.token, status: InviteStatus.PENDING, expiresAt: { lte: claimedAt } }, data: { status: InviteStatus.EXPIRED } })
      return { error: "Invitation link has expired", status: 410, data: null, code: "INVITATION_EXPIRED" }
    }
    const claimed = await tx.invite.updateMany({
      where: {
        id: invite.id, token: data.token, email: invite.email, roleId: invite.roleId, organizationId: invite.organizationId,
        status: InviteStatus.PENDING, expiresAt: { gt: claimedAt },
        organization: { isActive: true, deletedAt: null },
        role: { organizationId: invite.organizationId, NOT: { permissions: { has: "*" } } },
      },
      data: { status: InviteStatus.ACCEPTED },
    })
    if (claimed.count !== 1) return { error: "Invitation changed or is no longer available. Reload the link or ask for a new invitation.", status: 409, data: null, code: "INVITATION_CHANGED" }

    const hashedPassword = passwordPolicy.hash
    const newUser = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        organizationId: invite.organizationId,
        phone: data.phone || null,
        isVerified: true,
        emailVerified: true,
        image: data.image || null,
        roles: {
          connect: {
            id: invite.roleId,
          },
        },
      },
      select: {
        id: true,
        email: true,
      },
    })

    await tx.passwordHistory.create({
      data: {
        userId: newUser.id,
        passwordHash: hashedPassword,
      },
    })

    await upsertCredentialAccount(tx, {
      userId: newUser.id,
      passwordHash: hashedPassword,
    })

    await tx.auditLog.create({
      data: {
        entityType: "SecurityEvent", entityId: newUser.id, action: SecurityEventType.INVITE_REDEEMED,
        userId: newUser.id, organizationId: invite.organizationId,
        changes: { inviteId: invite.id, roleId: invite.roleId, issueId: currentApproval.issueId, issuerId: currentApproval.issuerId, approvalPayloadHash: currentApproval.payloadHash, rolePermissions: currentApproval.rolePermissions },
      },
    })

    return {
      error: null,
      status: 200,
      data: {
        ...newUser,
        organizationId: invite.organizationId,
        inviteId: invite.id,
        roleId: invite.roleId,
      },
    }
  })
}

export async function listOrganizationUsers(organizationId: string) {
  return db.user.findMany({
    where: { organizationId },
    select: safeUserSelect,
  })
}

export async function getInviteRegistrationContext(token?: string | null, locale: "en" | "fr" = "en") {
  const inviteToken = token?.trim()

  if (!inviteToken || !/^[a-f0-9]{64}$/i.test(inviteToken)) {
    return {
      email: "",
      roleName: "",
      organizationName: "StockFlow",
      isValidInvite: false,
    }
  }

  const invite = await db.invite.findUnique({
    where: { token: inviteToken },
    select: {
      id: true,
      roleId: true,
      email: true,
      organizationId: true,
      status: true,
      expiresAt: true,
      organization: { select: { name: true, isActive: true, deletedAt: true } },
      role: { select: { nameEn: true, nameFr: true, code: true, organizationId: true, permissions: true } },
    },
  })
  const isValidInvite = invite?.status === InviteStatus.PENDING && invite.expiresAt > new Date()
    && invite.organization.isActive && !invite.organization.deletedAt
    && invite.role.organizationId === invite.organizationId && !invite.role.permissions.includes("*")
    && Boolean(await readInvitationRedemptionAuthority(db, { ...invite, token: inviteToken }))

  return {
    email: isValidInvite ? invite.email : "",
    roleName: isValidInvite ? (locale === "fr" ? invite.role.nameFr || invite.role.nameEn : invite.role.nameEn || invite.role.nameFr) || invite.role.code : "",
    organizationName: isValidInvite ? invite.organization.name : "StockFlow",
    isValidInvite: Boolean(isValidInvite),
  }
}

export async function listOrganizationInvites(organizationId: string) {
  if (!organizationId?.trim()) throw new BusinessRuleError("Organization scope is required")
  const rows = await db.invite.findMany({
    where: { organizationId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      email: true,
      organizationId: true,
      roleId: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: {
          id: true,
          code: true,
          nameEn: true,
          nameFr: true,
        },
      },
    },
  })
  const asOf = new Date()
  return {
    asOf: asOf.toISOString(),
    rows: rows.map(row => ({
      ...row,
      revision: invitationRevision(row),
      storedStatus: row.status,
      status: row.status === InviteStatus.PENDING && row.expiresAt <= asOf ? InviteStatus.EXPIRED : row.status,
    })),
  }
}

export async function getOrganizationUserById(input: {
  userId: string
  organizationId: string
}) {
  return db.user.findFirst({
    where: {
      id: input.userId,
      organizationId: input.organizationId,
    },
    select: safeUserSelect,
  })
}

export { changeUserPasswordWorkflow } from "./user-password-change.service"

export async function requestEmailVerificationCodeWorkflow(
  userId: string,
  email: string,
  requestContext?: PublicIdentityRequestContext | null,
): Promise<StatusResult> {
  const genericResponse = { status: 200, error: null, data: null }
  if (typeof userId !== "string" || typeof email !== "string") return genericResponse
  const id = userId.trim()
  const normalizedEmail = email.trim().toLowerCase()
  if (!id || id.length > 200 || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return genericResponse

  const abuseDecision = await enforcePublicIdentityAbuseLimits({
    operation: "email_otp_resend",
    subject: id,
    requestContext,
  })
  if (!abuseDecision.allowed) return genericResponse

  const pendingIdentity = {
    id,
    email: { equals: normalizedEmail, mode: "insensitive" as const },
    isVerified: false,
    emailVerified: false,
    isActive: true,
    organization: { isActive: true, deletedAt: null },
  }
  const user = await db.user.findFirst({
    where: pendingIdentity,
    select: { id: true, email: true, organizationId: true, verificationToken: true, verificationTokenExpires: true },
  })
  if (!user) return genericResponse

  const now = new Date()
  const liveToken = user.verificationTokenExpires && user.verificationTokenExpires > now
  // The legacy column is also used by password reset. Never replace a live reset link.
  if (liveToken && user.verificationToken && /^[a-z0-9]{32}$/.test(user.verificationToken)) return genericResponse

  let code = user.verificationToken
  let expiresAt = user.verificationTokenExpires
  if (!liveToken || !code || !/^\d{6}$/.test(code)) {
    code = generateOtp()
    expiresAt = new Date(now.getTime() + 30 * 60 * 1000)
    const rotation = await db.user.updateMany({
      where: { ...pendingIdentity, verificationToken: user.verificationToken, verificationTokenExpires: user.verificationTokenExpires },
      data: { verificationToken: code, verificationTokenExpires: expiresAt },
    })
    if (rotation.count !== 1) return genericResponse
  }

  await sendVerificationEmail({
    email: user.email,
    verificationCode: code,
    action: "users.email.resend",
    userId: user.id,
    organizationId: user.organizationId,
    expiresAt,
  })
  return genericResponse
}

export async function requestPasswordResetLinkWorkflow(
  email: string,
  requestContext?: PublicIdentityRequestContext | null,
): Promise<StatusResult> {
  const parsedEmail = passwordRecoveryEmail.safeParse(email)
  const normalizedEmail = parsedEmail.success ? parsedEmail.data : ""
  const genericResponse = {
    status: 200,
    error: null,
    data: null,
  }
  if (!parsedEmail.success) return genericResponse
  const abuseDecision = await enforcePublicIdentityAbuseLimits({
    operation: "password_reset_request",
    subject: normalizedEmail,
    requestContext,
  })
  if (!abuseDecision.allowed) return genericResponse

  const user = await db.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" }, isActive: true, organization: { isActive: true, deletedAt: null } },
  })

  if (!user) return genericResponse

  const token = generateToken()
  const verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000)
  await db.user.update({
    where: { id: user.id },
    data: {
      verificationToken: token,
      verificationTokenExpires,
    },
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000"
  const resetPasswordLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalizedEmail)}`

  try {
    const result = await identityEmailClient().emails.send({
      from: "onboarding@resend.dev",
      to: normalizedEmail,
      subject: "Reset Password Request",
      react: ResetPasswordEmail({
        userFirstname: user.firstName ?? "there",
        resetPasswordLink,
      }),
    })
    if (result.error || !result.data?.id) {
      throw new BusinessRuleError("Reset email could not be sent")
    }
  } catch (emailError) {
    logger.warn("reset email sending failed", {
      action: "users.password.reset.email",
      userId: user.id,
      organizationId: user.organizationId,
    })
  }

  await logSecurityEvent({
    type: SecurityEventType.AUTH_PASSWORD_RESET_REQUESTED,
    userId: user.id,
    organizationId: user.organizationId,
    resource: user.id,
    details: { expiresAt: verificationTokenExpires.toISOString() },
  })

  return genericResponse
}

export async function completePasswordResetWorkflow(
  email: string,
  token: string,
  newPassword: string,
  requestContext?: PublicIdentityRequestContext | null,
): Promise<StatusResult> {
  const parsedEmail = passwordRecoveryEmail.safeParse(email)
  if (!parsedEmail.success) return { status: 404, error: "Please use a valid reset link", data: null }
  const normalizedEmail = parsedEmail.data
  const abuseDecision = await enforcePublicIdentityAbuseLimits({
    operation: "password_reset_completion",
    subject: normalizedEmail,
    requestContext,
  })
  if (!abuseDecision.allowed) {
    return {
      status: 429,
      error: "Too many password reset attempts. Please try again later.",
      data: null,
    }
  }

  if (typeof token !== "string" || !/^[a-z0-9]{32}$/.test(token)) {
    return { status: 404, error: "Please use a valid reset link", data: null }
  }
  if (!passwordResetRequest.safeParse({ email, token, newPassword }).success) return { status: 400, code: "VALIDATION_ERROR", error: "Check the new password.", data: null }

  const user = await db.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
      verificationToken: token,
      verificationTokenExpires: { gt: new Date() },
      isActive: true,
      organization: { isActive: true, deletedAt: null },
    },
  })

  if (!user) {
    return {
      status: 404,
      error: "Please use a valid reset link",
      data: null,
    }
  }

  const passwordPolicy = await hashPolicyCompliantPassword({
    password: newPassword,
    userId: user.id,
    email: user.email,
  })

  if (!passwordPolicy.ok) {
    return {
      status: 400,
      code: passwordPolicy.code,
      error: passwordPolicy.message,
      data: null,
    }
  }

  const completed = await db.$transaction(async (tx) => {
    const organizations = await tx.$queryRaw<{ isActive: boolean; deletedAt: Date | null }[]>`
      SELECT "isActive", "deletedAt" FROM organizations WHERE id = ${user.organizationId} FOR SHARE`
    if (!organizations[0]?.isActive || organizations[0].deletedAt) return false
    const consumed = await tx.user.updateMany({
      where: {
        id: user.id,
        organizationId: user.organizationId,
        isActive: true,
        password: user.password,
        email: { equals: normalizedEmail, mode: "insensitive" },
        verificationToken: token,
        verificationTokenExpires: { gt: new Date() },
      },
      data: {
        verificationToken: null,
        verificationTokenExpires: null,
      },
    })
    if (consumed.count !== 1) return false

    const credentials = await tx.$queryRaw<{ userId: string; accountId: string }[]>`
      SELECT "userId", "accountId" FROM accounts
      WHERE "providerId" = 'credential' AND ("userId" = ${user.id} OR "accountId" = ${user.id})
      ORDER BY id LIMIT 2 FOR UPDATE`
    if (credentials.length > 1 || credentials.some(row => row.userId !== user.id || row.accountId !== user.id)) throw new PasswordResetUnavailableError()

    await syncUserCredentialPassword(tx, {
      userId: user.id,
      passwordHash: passwordPolicy.hash,
      revokeSessions: true,
    })
    await tx.auditLog.create({ data: {
      organizationId: user.organizationId, userId: user.id, entityType: "SecurityEvent", entityId: user.id,
      action: SecurityEventType.AUTH_PASSWORD_RESET_COMPLETED,
      changes: { sessionsRevoked: true, resetLinkConsumed: true },
    } })
    return true
  }, { isolationLevel: "ReadCommitted", timeout: 10000 }).catch(error => {
    if (error instanceof PasswordResetUnavailableError) return false
    throw error
  })

  if (!completed) {
    return { status: 404, error: "Please use a valid reset link", data: null }
  }

  return {
    status: 200,
    error: null,
    data: null,
  }
}

export async function verifyEmailOtpWorkflow(
  userId: string,
  otp: string,
  requestContext?: PublicIdentityRequestContext | null,
) {
  const abuseDecision = await enforcePublicIdentityAbuseLimits({
    operation: "email_otp_verification",
    subject: userId,
    requestContext,
  })
  if (!abuseDecision.allowed) return { status: 429 }

  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) return { status: 403 }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
  })

  if (
    !user?.verificationToken ||
    user.verificationToken !== otp ||
    !user.verificationTokenExpires ||
    user.verificationTokenExpires <= new Date()
  ) {
    return { status: 403 }
  }

  const consumed = await db.user.updateMany({
    where: {
      id: userId,
      verificationToken: otp,
      verificationTokenExpires: { gt: new Date() },
    },
    data: {
      isVerified: true,
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
    },
  })

  if (consumed.count !== 1) return { status: 403 }

  await logSecurityEvent({
    type: SecurityEventType.AUTH_EMAIL_VERIFIED,
    userId: user.id,
    organizationId: user.organizationId,
    resource: user.email,
  })

  return { status: 200 }
}
