import "server-only"
import { randomUUID } from "node:crypto"
import type { BetterAuthPlugin } from "better-auth"
import { APIError, createAuthEndpoint } from "better-auth/api"
import { deleteSessionCookie } from "better-auth/cookies"
import { revokePresentedSession } from "@/services/security/self-sign-out.service"

/** Override only sign-out, retaining the provider's origin checks, signed-cookie
 * verification and complete cookie cleanup. No session-creation/cache policy changes.
 */
export const selfSignOutPlugin = {
  id: "stoquify-self-sign-out",
  endpoints: {
    signOut: createAuthEndpoint("/sign-out", { method: "POST", requireHeaders: true }, async ctx => {
      ctx.setHeader("Cache-Control", "private, no-store")
      let result: { serverSession: "revoked" | "absent" | "not_presented"; receiptId?: string; completedAt?: string }
      try {
        // The application uses Prisma sessions. A future secondary session store
        // needs its own coordinated revocation implementation before enabling it.
        if (ctx.context.options.secondaryStorage) throw new Error("Unsupported secondary session store")
        const token = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret)
        result = typeof token === "string" && token ? await revokePresentedSession(token) : { serverSession: "not_presented" }
      } catch {
        const correlationId = randomUUID()
        ctx.context.logger.error("Current-session sign-out could not be confirmed", { correlationId })
        // Keep the credential/cookies so an interrupted or failed deletion can
        // be retried. Never turn a database/audit failure into confirmed logout.
        throw new APIError("SERVICE_UNAVAILABLE", { code: "SIGN_OUT_UNCONFIRMED", message: "Sign-out was not confirmed. Retry before leaving this device.", correlationId })
      }
      deleteSessionCookie(ctx)
      return ctx.json({ success: true, ...result })
    }),
  },
} satisfies BetterAuthPlugin
