"use server"

import type { AuthResponse, LoginProps, RegisterUserProps } from "@/types/types"
import { AUTH_MESSAGES } from "@/lib/security/auth-credentials"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { registerOrganizationAccount } from "@/services/users/user-identity.service"

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

    return await registerOrganizationAccount(data)
  } catch (error) {
    return safeSuccessActionErrorResult(error, {
      action: "auth.register",
      component: "Auth",
    }, "An unexpected error occurred during registration. Please try again.")
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
  } catch (error) {
    return safeSuccessActionErrorResult(error, {
      action: "auth.login",
      component: "Auth",
    }, "Unable to sign in. Please try again later.")
  }
}
