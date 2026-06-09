"use server"

import VerifyEmail from "@/components/email-templates/verify-email"
import { Locale as PrismaLocale } from "@prisma/client"
import { randomUUID } from "crypto"
import type { AuthResponse, LoginProps, RegisterUserProps } from "@/types/types"
import { generateSlug } from "@/lib/generateSlug"
import { generateOtp } from "@/lib/generateOtp"
import {
  AUTH_MESSAGES,
  hashPolicyCompliantPassword,
  upsertCredentialAccount,
} from "@/lib/security/auth-credentials"
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

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

async function resolveUniqueOrganizationSlug(tx: any, organizationName: string) {
  const baseSlug = normalizeSlug(organizationName)
  let candidate = baseSlug
  let suffix = 2

  while (await tx.organization.findUnique({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return candidate
}

/**
 * Register a new user with organization
 */
export async function registerUser(data: RegisterUserProps): Promise<AuthResponse> {
  try {
    // Validate password confirmation
    if (data.password !== data.confirmPassword) {
      return {
        success: false,
        error: "Passwords do not match",
      }
    }

    // Validate terms acceptance
    if (!data.termsAccepted) {
      return {
        success: false,
        error: "You must accept the terms and conditions",
      }
    }

    const { db } = await import("../prisma/db")
    const email = data.email.trim().toLowerCase()
    const phone = data.phone.trim()

    // Check if user already exists
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

    // Generate unique slug for organization
    const defaultLocale = toPrismaLocale(data.defaultLocale)

    // Create organization and user in a transaction
    const result = await db.$transaction(async (tx) => {
      const now = new Date()
      const orgSlug = await resolveUniqueOrganizationSlug(tx, data.companyName)

      // Create organization
      const organization = await tx.organization.create({
        data: {
          id: randomUUID(),
          name: data.companyName,
          slug: orgSlug,
          industry: cleanText(data.industry),
          country: cleanText(data.country),
          state: cleanText(data.state),
          address: cleanText(data.address),
          currency: data.currency || "XAF",
          timezone: data.timezone || "Africa/Douala",
          defaultLocale,
          isActive: true,
          updatedAt: now,
        },
      })

      // Create default admin role for the organization
      const adminRole = await tx.role.create({
        data: {
          id: randomUUID(),
          nameEn: "Administrator",
          nameFr: "Administrateur",
          code: "administrator",
          description: "Organization administrator with full access",
          permissions: ["*"], // Full permissions
          organizationId: organization.id,
          updatedAt: now,
        },
      })

      // Create the user
      const verificationToken = generateOtp()
      const verificationTokenExpires = new Date(Date.now() + 1000 * 60 * 30)
      const user = await tx.user.create({
        data: {
          id: randomUUID(),
          firstName: data.firstName,
          lastName: data.lastName,
          email,
          phone,
          password: hashedPassword,
          image: "",
          organizationId: organization.id,
          isActive: true,
          isVerified: false, // User needs to verify email
          verificationToken,
          verificationTokenExpires,
          preferredLocale: defaultLocale,
          updatedAt: now,
        },
      })

      // Assign admin role to the user (many-to-many relationship)
      await tx.user.update({
        where: { id: user.id },
        data: {
          roles: {
            connect: { id: adminRole.id }
          }
        }
      })

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

      return { user, organization, role: adminRole }
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
      },
    })

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: result.user.email,
        subject: "Verify your StockFlow account",
        react: VerifyEmail({ verificationCode: result.user.verificationToken ?? "" }),
      })
      await logSecurityEvent({
        type: SecurityEventType.AUTH_EMAIL_VERIFICATION_SENT,
        userId: result.user.id,
        organizationId: result.organization.id,
        resource: result.user.email,
        details: { expiresAt: result.user.verificationTokenExpires?.toISOString() },
      })
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
    }

    return {
      success: true,
      message: "Account created successfully! Please check your email to verify your account.",
      data: {
        userId: result.user.id,
        organizationId: result.organization.id,
        email: result.user.email,
      },
    }
  } catch (error: any) {
    console.error("Registration error:", error)

    // Handle specific database errors
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('email')) {
        return {
          success: false,
          error: AUTH_MESSAGES.registrationUnavailable,
        }
      }
      if (error.meta?.target?.includes('slug')) {
        return {
          success: false,
          error: "Organization name already exists, please choose a different name",
        }
      }
      if (error.meta?.target?.includes('phone')) {
        return {
          success: false,
          error: AUTH_MESSAGES.registrationUnavailable,
        }
      }
    }

    return {
      success: false,
      error: "An unexpected error occurred during registration. Please try again.",
    }
  }
}

/**
 * Sign in with email and password using BetterAuth.
 *
 * Calls auth.api.signInEmail (server-side BetterAuth endpoint), then forwards
 * the Set-Cookie header into the Next.js cookie jar so the session is
 * immediately available to subsequent server-component renders in the same
 * navigation cycle.
 */
export async function signInWithCredentials(data: LoginProps): Promise<AuthResponse> {
  if (!data.email || !data.password) {
    return { success: false, error: "Email and password are required" }
  }

  try {
    const { auth } = await import("@/lib/auth")
    const { cookies } = await import("next/headers")

    const response = await auth.api.signInEmail({
      body: {
        email: data.email.trim().toLowerCase(),
        password: data.password,
      },
      asResponse: true,
    })

    if (!response.ok) {
      let message: string = AUTH_MESSAGES.invalidSignIn
      try {
        const body = await response.json()
        if (body?.code === "EMAIL_NOT_VERIFIED" || body?.message === "Email not verified") {
          message = AUTH_MESSAGES.emailNotVerified
        }
      } catch {
        // ignore parse errors
      }
      return { success: false, error: message }
    }

    // Forward BetterAuth's Set-Cookie header(s) to the browser
    const cookieStore = await cookies()
    const allSetCookie = (response.headers as any).getSetCookie?.() as string[] | undefined
    const setCookieHeaders: string[] =
      allSetCookie ?? [response.headers.get("set-cookie")].filter(Boolean) as string[]

    for (const raw of setCookieHeaders) {
      // Parse "name=value; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800"
      const segments = raw.split(/;\s*/)
      const [nameVal, ...attrParts] = segments
      const eqIdx = nameVal.indexOf("=")
      if (eqIdx === -1) continue
      const name = nameVal.slice(0, eqIdx).trim()
      const value = nameVal.slice(eqIdx + 1).trim()

      const attrs: Record<string, string | boolean | number> = {}
      for (const part of attrParts) {
        const [k, v] = part.split("=")
        const key = k.trim().toLowerCase()
        attrs[key] = v !== undefined ? v.trim() : true
      }

      cookieStore.set(name, value, {
        path: (attrs["path"] as string) || "/",
        httpOnly: !!attrs["httponly"],
        secure: !!attrs["secure"],
        sameSite: (attrs["samesite"] as "lax" | "strict" | "none") || "lax",
        maxAge: attrs["max-age"] ? Number(attrs["max-age"]) : undefined,
      })
    }

    return { success: true, message: "Login successful! Redirecting to dashboard..." }
  } catch (error: any) {
    console.error("Login error:", error)
    return { success: false, error: "Unable to sign in. Please try again later." }
  }
}
