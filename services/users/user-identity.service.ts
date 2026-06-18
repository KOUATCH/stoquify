import "server-only"

import VerifyEmail from "@/components/email-templates/verify-email"
import { ResetPasswordEmail } from "@/components/email-templates/reset-password"
import UserInvitation from "@/components/email-templates/user-invite"
import { generateOtp } from "@/lib/generateOtp"
import { generateSlug } from "@/lib/generateSlug"
import { logger } from "@/lib/logger"
import {
  AUTH_MESSAGES,
  hashPolicyCompliantPassword,
  syncUserCredentialPassword,
  upsertCredentialAccount,
  verifyUserCredentialPassword,
} from "@/lib/security/auth-credentials"
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log"
import { safeUserSelect } from "@/lib/security/server-authz"
import { generateToken } from "@/lib/token"
import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import type { OrgDataProps, RegisterUserProps, RegisterWorkflowData, UserProps } from "@/types/types"
import { InviteStatus, Locale as PrismaLocale, LocationType, type Prisma } from "@prisma/client"
import { randomBytes, randomUUID } from "crypto"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_USER_ROLE = {
  nameEn: "Admin",
  nameFr: "Administrateur",
  description: "Default Admin role with all permissions",
  permissions: ["*"],
}

type StatusResult<T = null> = {
  error: string | null
  status: number
  data: T | null
}

type PasswordChangeInput = {
  actor: {
    id: string
    organizationId: string
  }
  targetUserId: string
  oldPassword: string
  newPassword: string
  isSelfChange: boolean
}

type InviteActor = {
  id: string
  organizationId: string
  organizationName?: string | null
}

type InviteWorkflowInput = {
  actor: InviteActor
  email: string
  roleId: string
  roleName?: string | null
}

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

const REGISTER_MODULE_DEFAULTS = ["POS", "Inventory", "Accounting", "Payment reconciliation"]

function normalizeRequestedModules(value?: string[] | null) {
  const modules = (value?.length ? value : REGISTER_MODULE_DEFAULTS)
    .map((module) => cleanText(module))
    .filter((module): module is string => Boolean(module))
    .map((module) => module.slice(0, 80))

  return [...new Set(modules)].slice(0, 12)
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
  addDetail(details, "requestedModules", onboarding.requestedModules)
  addDetail(details, "assistedSetupRequested", onboarding.assistedSetupRequested)
  addDetail(details, "defaultLocationId", defaultLocationId)

  return details
}

function validateRegistrationInput(data: RegisterUserProps) {
  const requiredFields: Array<[keyof RegisterUserProps, string]> = [
    ["firstName", "First name is required"],
    ["lastName", "Last name is required"],
    ["email", "Email is required"],
    ["phone", "Phone number is required"],
    ["companyName", "Company name is required"],
    ["companySize", "Company size is required"],
    ["password", "Password is required"],
  ]

  for (const [field, message] of requiredFields) {
    const value = data[field]
    if (typeof value !== "string" || !value.trim()) {
      return message
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    return "Please enter a valid email address"
  }

  return null
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
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: input.email,
      subject: "Verify your StockFlow account",
      react: VerifyEmail({ verificationCode: input.verificationCode }),
    })

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
): Promise<StatusResult<{ id: string; email: string; organizationId: string }>> {
  const { email, password, firstName, lastName, phone, image } = data
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPhone = phone.trim()
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

    await logSecurityEvent({
      type: SecurityEventType.AUTH_REGISTERED,
      userId: result.data.id,
      organizationId: result.data.organizationId,
      resource: result.data.email,
      details: {
        source: "legacy_create_user_action",
      },
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

export async function registerOrganizationAccount(data: RegisterUserProps) {
  const validationError = validateRegistrationInput(data)
  if (validationError) {
    return {
      success: false,
      error: validationError,
    }
  }

  const email = data.email.trim().toLowerCase()
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
        permissions: ["*"],
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

    return { user, organization, role: adminRole, defaultLocation }
  })

  await logSecurityEvent({
    type: SecurityEventType.AUTH_REGISTERED,
    userId: result.user.id,
    organizationId: result.organization.id,
    resource: result.user.email,
    details: {
      organizationId: result.organization.id,
      roleId: result.role.id,
      roleCode: result.role.code,
      onboarding: buildRegistrationOnboardingDetails(data, result.defaultLocation?.id, onboarding),
    },
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
    message: "Account created successfully! Please check your email to verify your account.",
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

export async function sendInviteWorkflow(input: InviteWorkflowInput): Promise<StatusResult<unknown>> {
  const email = input.email.trim().toLowerCase()
  const roleName = input.roleName ?? "assigned"
  const organizationId = input.actor.organizationId

  return db.$transaction(async (tx) => {
    const role = await tx.role.findFirst({
      where: { id: input.roleId, organizationId },
      select: { id: true, nameEn: true, nameFr: true, code: true },
    })

    if (!role) {
      return {
        error: "Invalid role for this organization",
        status: 403,
        data: null,
      }
    }

    const existingUserByEmail = await tx.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    })

    if (existingUserByEmail) {
      return {
        error: `This email ${email} is already in use, another invitation cannot be sent`,
        status: 409,
        data: null,
      }
    }

    const existingInvite = await tx.invite.findUnique({
      where: { email_organizationId: { email, organizationId } },
    })

    if (
      existingInvite &&
      existingInvite.status === InviteStatus.PENDING &&
      existingInvite.expiresAt > new Date()
    ) {
      return {
        error: `This email ${email} is already invited, Another invitation cannot be sent`,
        status: 409,
        data: null,
      }
    }

    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    if (existingInvite) {
      await tx.invite.update({
        where: { id: existingInvite.id },
        data: {
          roleId: role.id,
          token,
          expiresAt,
          status: InviteStatus.PENDING,
        },
      })
    } else {
      await tx.invite.create({
        data: {
          email,
          organizationId,
          roleId: role.id,
          token,
          expiresAt,
        },
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000"
    const linkUrl = `${baseUrl}/user-invite/invitation?token=${encodeURIComponent(token)}`
    const companyName = input.actor.organizationName ?? "StockFlow"
    const { data: emailData, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: `Welcome to ${companyName} - ${(role.nameEn || role.nameFr || roleName)} role`,
      react: UserInvitation({
        companyName,
        linkUrl,
        name: role.nameEn || role.nameFr || roleName,
      }),
    })

    if (error) {
      throw new BusinessRuleError("Invitation email could not be sent")
    }

    await logSecurityEvent({
      type: SecurityEventType.INVITE_CREATED,
      userId: input.actor.id,
      organizationId,
      resource: email,
      details: { roleId: role.id },
    })

    return {
      error: null,
      status: 200,
      data: emailData,
    }
  })
}

export async function acceptInvitationWorkflow(
  data: InvitedUserInput,
): Promise<StatusResult<{ id: string; email: string; organizationId: string; inviteId: string; roleId: string }>> {
  return db.$transaction(async (tx) => {
    const invite = await tx.invite.findUnique({
      where: { token: data.token },
      include: {
        role: { select: { id: true, organizationId: true } },
      },
    })

    if (!invite || invite.status !== InviteStatus.PENDING) {
      return {
        error: "Invalid or already used invitation link",
        status: 400,
        data: null,
      }
    }

    if (invite.expiresAt <= new Date()) {
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      })

      return {
        error: "Invitation link has expired",
        status: 410,
        data: null,
      }
    }

    if (invite.role.organizationId !== invite.organizationId) {
      return {
        error: "Invitation role is invalid",
        status: 403,
        data: null,
      }
    }

    const existingUser = await tx.user.findFirst({
      where: { email: { equals: invite.email, mode: "insensitive" } },
      select: { id: true },
    })

    if (existingUser) {
      return {
        error: "This email is already registered",
        status: 409,
        data: null,
      }
    }

    const passwordPolicy = await hashPolicyCompliantPassword({
      password: data.password,
      email: invite.email,
    })

    if (!passwordPolicy.ok) {
      return {
        error: passwordPolicy.message,
        status: 400,
        data: null,
      }
    }

    const hashedPassword = passwordPolicy.hash
    const newUser = await tx.user.create({
      data: {
        email: invite.email,
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

    await tx.invite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.ACCEPTED },
    })

    await logSecurityEvent({
      type: SecurityEventType.INVITE_REDEEMED,
      userId: newUser.id,
      organizationId: invite.organizationId,
      resource: newUser.email,
      details: { inviteId: invite.id, roleId: invite.roleId },
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

export async function listOrganizationInvites(organizationId: string) {
  return db.invite.findMany({
    where: { organizationId },
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

export async function changeUserPasswordWorkflow(input: PasswordChangeInput) {
  const existingUser = await db.user.findFirst({
    where: {
      id: input.targetUserId,
      organizationId: input.actor.organizationId,
    },
  })

  if (!existingUser) {
    return { error: "User not found", status: 404 }
  }

  if (
    input.isSelfChange &&
    !(await verifyUserCredentialPassword(existingUser.id, input.oldPassword))
  ) {
    return { error: "Old Password Incorrect", status: 403 }
  }

  const passwordPolicy = await hashPolicyCompliantPassword({
    password: input.newPassword,
    userId: existingUser.id,
    email: existingUser.email,
  })

  if (!passwordPolicy.ok) {
    return { error: passwordPolicy.message, status: 400 }
  }

  await db.$transaction(async (tx) => {
    await syncUserCredentialPassword(tx, {
      userId: input.targetUserId,
      passwordHash: passwordPolicy.hash,
      revokeSessions: true,
    })
  })

  await logSecurityEvent({
    type: SecurityEventType.AUTH_PASSWORD_CHANGED,
    userId: input.actor.id,
    organizationId: input.actor.organizationId,
    resource: input.targetUserId,
    details: {
      targetUserId: input.targetUserId,
      selfService: input.isSelfChange,
      sessionsRevoked: true,
    },
  })

  return { error: null, status: 200 }
}

export async function requestPasswordResetLinkWorkflow(email: string): Promise<StatusResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const genericResponse = {
    status: 200,
    error: null,
    data: null,
  }
  const user = await db.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
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
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: normalizedEmail,
      subject: "Reset Password Request",
      react: ResetPasswordEmail({
        userFirstname: user.firstName ?? "there",
        resetPasswordLink,
      }),
    })
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
): Promise<StatusResult> {
  const user = await db.user.findFirst({
    where: {
      email: { equals: email.trim().toLowerCase(), mode: "insensitive" },
      verificationToken: token,
      verificationTokenExpires: { gt: new Date() },
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
      error: passwordPolicy.message,
      data: null,
    }
  }

  await db.$transaction(async (tx) => {
    await syncUserCredentialPassword(tx, {
      userId: user.id,
      passwordHash: passwordPolicy.hash,
      revokeSessions: true,
    })

    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        verificationToken: null,
        verificationTokenExpires: null,
      },
    })
  })

  await logSecurityEvent({
    type: SecurityEventType.AUTH_PASSWORD_RESET_COMPLETED,
    userId: user.id,
    organizationId: user.organizationId,
    resource: user.id,
    details: { sessionsRevoked: true },
  })

  return {
    status: 200,
    error: null,
    data: null,
  }
}

export async function verifyEmailOtpWorkflow(userId: string, otp: string) {
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
  })

  if (
    !user?.verificationToken ||
    user.verificationToken !== otp ||
    (user.verificationTokenExpires && user.verificationTokenExpires < new Date())
  ) {
    return { status: 403 }
  }

  await db.user.update({
    where: {
      id: userId,
    },
    data: {
      isVerified: true,
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
    },
  })

  await logSecurityEvent({
    type: SecurityEventType.AUTH_EMAIL_VERIFIED,
    userId: user.id,
    organizationId: user.organizationId,
    resource: user.email,
  })

  return { status: 200 }
}
