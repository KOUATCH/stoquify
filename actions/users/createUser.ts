"use server"

import VerifyEmail from "@/components/email-templates/verify-email"
// import { adminPermissions } from "@/config/permissions"
import {
  AUTH_MESSAGES,
  hashPolicyCompliantPassword,
  upsertCredentialAccount,
} from "@/lib/security/auth-credentials"
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log"
import { generateOtp } from "@/lib/generateOtp"
import { generateSlug } from "@/lib/generateSlug"
import { db } from "@/prisma/db"
import type { OrgDataProps, UserProps } from "@/types/types"
import { Locale as PrismaLocale } from "@prisma/client"
import { Resend } from "resend"
import { randomUUID } from "crypto"

const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_USER_ROLE = {
  nameEn: "Admin",
  nameFr: "Administrateur",
  description: "Default Admin role with all permissions",
  permissions: ["*"],
}

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeSlug(value: string) {
  const slug = generateSlug(value).replace(/^-+|-+$/g, "")
  return slug || `organization-${randomUUID().slice(0, 8)}`
}

function toPrismaLocale(value?: string | null) {
  return value === "fr" ? PrismaLocale.FR : PrismaLocale.EN
}

async function resolveUniqueOrganizationSlug(tx: any, requestedSlug: string | undefined, organizationName: string) {
  const baseSlug = normalizeSlug(requestedSlug || organizationName)
  let candidate = baseSlug
  let suffix = 2

  while (await tx.organization.findUnique({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return candidate
}

/**
 * Creates a new user with organization and default admin role
 */
const createUser = async (data: UserProps, orgData: OrgDataProps) => {
  const { email, password, firstName, lastName, phone, image } = data
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPhone = phone.trim()
  const passwordPolicy = await hashPolicyCompliantPassword({ password, email: normalizedEmail })
  if (!passwordPolicy.ok) {
    return {
      error: passwordPolicy.message,
      status: 400,
      data: null,
    }
  }

  try {
    // Use a transaction for atomic operations
    const result = await db.$transaction(async (tx) => {
      const now = new Date()
      // Check for existing users
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

      // Create organization
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

      // Find or create default admin role
      let defaultRole = await tx.role.findFirst({
        where: {
          code: "admin",
          organizationId: org.id,
        },
      })

      // Create default role if it doesn't exist
      if (!defaultRole) {
        defaultRole = await tx.role.create({
          data: {
            id: randomUUID(),
            ...ADMIN_USER_ROLE,
            code: "admin",
            organizationId: org.id,
            permissions: ADMIN_USER_ROLE.permissions, // Ensure this is a string array
            updatedAt: now,
          },
        })
      }

      const hashedPassword = passwordPolicy.hash

      // Generate OTP for email verification
      const token = generateOtp()

      // Create user with role
      const newUser = await tx.user.create({
        data: {
          id: randomUUID(),
          email: normalizedEmail,
          password: hashedPassword,
          firstName,
          lastName,
          organizationId: org.id,
          verificationToken: token,
          verificationTokenExpires: new Date(Date.now() + 1000 * 60 * 30),
          phone: normalizedPhone,
          image: image || "",
          isVerified: false, // Set to false to require email verification
          preferredLocale: toPrismaLocale(orgData.defaultLocale),
          updatedAt: now,
          roles: {
            connect: {
              id: defaultRole.id,
            },
          },
        },
        include: {
          roles: true,
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

      // Send verification email
      const verificationCode = newUser?.verificationToken ?? ""

      try {
        const { error: emailError } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: normalizedEmail,
          subject: "Verify your StockFlow account",
          react: VerifyEmail({ verificationCode }),
        })

        if (emailError) {
          console.error("Email sending error:", emailError)
          // Don't fail the registration if email fails
        }
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError)
        // Continue with registration even if email fails
      }

      return {
        error: null,
        status: 200,
        data: {
          id: newUser?.id,
          email: newUser?.email,
          organizationId: org.id,
        },
      }
    })

    if (result.status === 200 && result.data) {
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

    return result
  } catch (error) {
    console.error("Error creating user:", error)
    return {
      error: `Something went wrong. Please try again.`,
      status: 500,
      data: null,
    }
  }
}

export default createUser
