"use server"

import { logger } from "@/lib/logger"
import { requireSession } from "@/lib/security/auth-session"
import {
  stepUpSessionWithPassword,
  type PasswordStepUpResult,
} from "@/services/security/step-up-auth.service"

export type StepUpAuthActionCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "AUTH_REQUIRED"
  | "INTERNAL_ERROR"

export type StepUpAuthActionResult =
  | {
      success: true
      data: {
        verifiedAt: string
        method: "password"
        assuranceLevel: number
      }
      error: null
      code: null
      retryAfterSeconds: null
    }
  | {
      success: false
      data: null
      error: string
      code: StepUpAuthActionCode
      retryAfterSeconds: number | null
    }

function failure(
  code: StepUpAuthActionCode,
  error: string,
  retryAfterSeconds: number | null = null,
): StepUpAuthActionResult {
  return { success: false, data: null, error, code, retryAfterSeconds }
}

function toActionResult(result: PasswordStepUpResult): StepUpAuthActionResult {
  switch (result.status) {
    case "verified":
      return {
        success: true,
        data: {
          verifiedAt: result.verifiedAt.toISOString(),
          method: result.method,
          assuranceLevel: result.assuranceLevel,
        },
        error: null,
        code: null,
        retryAfterSeconds: null,
      }
    case "invalid_password":
      return failure(
        "INVALID_CREDENTIALS",
        "Authentication could not be verified",
      )
    case "locked":
      return failure(
        "RATE_LIMITED",
        "Too many attempts. Try again later.",
        Math.max(1, Math.ceil((result.lockedUntil.getTime() - Date.now()) / 1000)),
      )
    case "session_invalid":
      return failure("AUTH_REQUIRED", "Authentication is required")
  }
}

function isAuthenticationBoundaryError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const code = (error as { code?: unknown }).code
  return code === "UNAUTHENTICATED" || code === "NO_ACTIVE_ORG" || code === "FORBIDDEN"
}

export async function stepUpWithPasswordAction(input: {
  password?: unknown
}): Promise<StepUpAuthActionResult> {
  try {
    const session = await requireSession()
    if (typeof input?.password !== "string" || input.password.length === 0 || input.password.length > 1024) {
      return failure("VALIDATION_ERROR", "Password is required")
    }

    const result = await stepUpSessionWithPassword({
      sessionId: session.claims.sessionId,
      sessionToken: session.claims.sessionToken,
      userId: session.claims.userId,
      organizationId: session.claims.tenantId,
      password: input.password,
    })

    return toActionResult(result)
  } catch (error) {
    if (isAuthenticationBoundaryError(error)) {
      return failure("AUTH_REQUIRED", "Authentication is required")
    }

    logger.error("Password step-up action failed", {
      err: error,
      action: "stepUpWithPasswordAction",
    })
    return failure("INTERNAL_ERROR", "Unable to verify authentication")
  }
}
