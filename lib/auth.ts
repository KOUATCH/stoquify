import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { db } from "@/prisma/db"
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log"

const baseURL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const socialProviders =
  googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        },
      }
    : {}

function readHeader(ctx: any, name: string) {
  return (
    ctx.headers?.get?.(name) ??
    ctx.request?.headers?.get?.(name) ??
    ctx.context?.headers?.get?.(name) ??
    null
  )
}

function getRequestAuditContext(ctx: any) {
  return {
    ip:
      readHeader(ctx, "x-forwarded-for")?.split(",")[0]?.trim() ??
      readHeader(ctx, "x-real-ip"),
    userAgent: readHeader(ctx, "user-agent"),
  }
}

export const auth = betterAuth({
  baseURL,

  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  // ── Session ──────────────────────────────────────────────────────────────
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute cookie cache — avoids per-request DB hit
    },
  },

  // ── Email + password credentials ────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    password: {
      async hash(password) {
        const { hashPassword } = await import("./password")
        return hashPassword(password)
      },
      async verify({ password, hash }) {
        const { verifyPassword } = await import("./password")
        return verifyPassword(password, hash)
      },
    },
  },

  // ── Google OAuth ─────────────────────────────────────────────────────────
  socialProviders,

  // ── Additional fields stored on the User row ──────────────────────────
  user: {
    additionalFields: {
      organizationId: {
        type: "string",
        required: false,
        input: false, // not user-supplied at sign-up
      },
      firstName: {
        type: "string",
        required: false,
        input: true,
      },
      lastName: {
        type: "string",
        required: false,
        input: true,
      },
      isVerified: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  // ── Database hooks ────────────────────────────────────────────────────
  databaseHooks: {
    user: {
      create: {
        // Block OAuth from auto-creating accounts for unknown users.
        // StockFlow users must register manually (tied to an org).
        before: async (user) => {
          const existing = await db.user.findFirst({
            where: { email: { equals: user.email, mode: "insensitive" } },
          })
          if (!existing) {
            // Returning false signals BetterAuth to abort the create
            return false
          }
          return { data: user }
        },
      },
    },
  },

  // ── Request hooks — account locking ──────────────────────────────────
  hooks: {
    before: async (ctx: any) => {
      if (ctx.path !== "/sign-in/email") return
      const email = (ctx.body as any)?.email as string | undefined
      if (!email) return

      const user = await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, organizationId: true, isLocked: true, lockedUntil: true },
      })
      if (!user) return

      const now = new Date()
      if (user.isLocked && user.lockedUntil && user.lockedUntil > now) {
        const retryAfterSec = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000)
        const audit = getRequestAuditContext(ctx)
        await logSecurityEvent({
          type: SecurityEventType.ACCOUNT_LOCKED,
          userId: user.id,
          organizationId: user.organizationId,
          ip: audit.ip,
          userAgent: audit.userAgent,
          resource: email,
          details: { retryAfterSec },
        })
        return new Response(
          JSON.stringify({
            error: "Account locked",
            message: "Too many failed attempts. Try again later.",
            retryAfter: retryAfterSec,
          }),
          { status: 403, headers: { "content-type": "application/json" } }
        )
      }
      if (user.isLocked && (!user.lockedUntil || user.lockedUntil <= now)) {
        await db.user.update({
          where: { id: user.id },
          data: { isLocked: false, lockedUntil: null, failedLoginAttempts: 0 },
        })
      }
    },
    after: async (ctx: any) => {
      // BetterAuth 1.6.x runAfterHooks crashes if a hook returns undefined,
      // so every exit path must return a value (empty object = no-op).
      if (ctx.path !== "/sign-in/email") return {}
      const email = (ctx.body as any)?.email as string | undefined
      if (!email) return {}

      const isSuccess = ctx.response?.status >= 200 && ctx.response?.status < 300

      const user = await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, organizationId: true, failedLoginAttempts: true },
      })
      if (!user) return {}

      const audit = getRequestAuditContext(ctx)
      if (isSuccess) {
        await db.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, isLocked: false, lockedUntil: null, lastLogin: new Date() },
        })
        await logSecurityEvent({
          type: SecurityEventType.LOGIN_SUCCESS,
          userId: user.id,
          organizationId: user.organizationId,
          ip: audit.ip,
          userAgent: audit.userAgent,
          resource: email,
          details: { provider: "credential" },
        })
      } else {
        const failures = (user.failedLoginAttempts ?? 0) + 1
        const shouldLock = failures >= 5
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: failures,
            lastFailedLogin: new Date(),
            ...(shouldLock ? { isLocked: true, lockedUntil: new Date(Date.now() + 30 * 60 * 1000) } : {}),
          },
        })
        await logSecurityEvent({
          type: shouldLock ? SecurityEventType.ACCOUNT_LOCKED : SecurityEventType.LOGIN_FAILED,
          userId: user.id,
          organizationId: user.organizationId,
          ip: audit.ip,
          userAgent: audit.userAgent,
          resource: email,
          details: { provider: "credential", failures },
        })
      }
      return {}
    },
  },

  trustedOrigins: [baseURL],

  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
})

export type Session = typeof auth.$Infer.Session
