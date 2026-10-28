import {
  normalizeToCanonicalError,
  type CanonicalError,
  type CanonicalErrorOptions,
  type CanonicalErrorStatus,
} from "@/lib/error-handling/canonical"
import { ErrorCategory, ErrorSeverity } from "@/lib/error-handling/types"

export type SafeActionStatus = CanonicalErrorStatus

export type ApplicationErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS_RULE_VIOLATION"
  | "FRESH_AUTH_REQUIRED"
  | "DUPLICATE_KEY_CONFLICT"
  | "DATABASE_CONFLICT"
  | "DATABASE_UNAVAILABLE"
  | "METHOD_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message: string,
    public readonly status: SafeActionStatus,
    public readonly expose = true,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "ApplicationError"
  }
}

export class BusinessRuleError extends ApplicationError {
  constructor(message: string, code: ApplicationErrorCode = "BUSINESS_RULE_VIOLATION") {
    super(code, message, 422)
    this.name = "BusinessRuleError"
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = "Record not found") {
    super("NOT_FOUND", message, 404)
    this.name = "NotFoundError"
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super("CONFLICT", message, 409)
    this.name = "ConflictError"
  }
}

export class AuthRequiredError extends ApplicationError {
  constructor(message = "Unauthenticated") {
    super("AUTH_REQUIRED", message, 401)
    this.name = "AuthRequiredError"
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403)
    this.name = "ForbiddenError"
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError
}

export type PrismaKnownRequestLike = {
  code: string
  meta?: Record<string, unknown> | null
}

export function getPrismaKnownRequest(error: unknown): PrismaKnownRequestLike | null {
  if (!error || typeof error !== "object") return null

  const candidate = error as {
    code?: unknown
    meta?: unknown
    name?: unknown
    clientVersion?: unknown
  }

  if (typeof candidate.code !== "string") return null

  const looksLikePrisma =
    candidate.name === "PrismaClientKnownRequestError" ||
    typeof candidate.clientVersion === "string" ||
    candidate.code.startsWith("P")

  if (!looksLikePrisma) return null

  return {
    code: candidate.code,
    meta: candidate.meta && typeof candidate.meta === "object"
      ? candidate.meta as Record<string, unknown>
      : null,
  }
}

export function getPrismaKnownRequestField(error: unknown): string {
  const prismaError = getPrismaKnownRequest(error)
  return String(prismaError?.meta?.field_name ?? prismaError?.meta?.constraint ?? "")
}

function legacyCode(code: CanonicalError["code"]): ApplicationErrorCode {
  switch (code) {
    case "VALIDATION_ERROR":
    case "AUTH_REQUIRED":
    case "FORBIDDEN":
    case "NOT_FOUND":
    case "CONFLICT":
    case "BUSINESS_RULE_VIOLATION":
    case "FRESH_AUTH_REQUIRED":
    case "DUPLICATE_KEY_CONFLICT":
    case "DATABASE_CONFLICT":
    case "DATABASE_UNAVAILABLE":
    case "METHOD_NOT_ALLOWED":
    case "RATE_LIMITED":
    case "INTERNAL_ERROR":
      return code
    default:
      return "INTERNAL_ERROR"
  }
}

export function toCanonicalActionError(
  error: unknown,
  options: CanonicalErrorOptions = {},
): CanonicalError {
  if (isApplicationError(error)) {
    return normalizeToCanonicalError(error, {
      ...options,
      metadata: {
        ...error.metadata,
        ...options.metadata,
      },
    })
  }

  return normalizeToCanonicalError(error, options)
}

export function toSafeActionError(error: unknown, options: CanonicalErrorOptions = {}): {
  error: string
  status: SafeActionStatus
  code: ApplicationErrorCode
  correlationId: string
  category: ErrorCategory
  severity: ErrorSeverity
  retryable: boolean
  fieldErrors?: Record<string, string[]>
  metadata?: Record<string, unknown>
} {
  const canonical = toCanonicalActionError(error, options)
  return {
    error: canonical.userMessage,
    status: canonical.status,
    code: legacyCode(canonical.code),
    correlationId: canonical.correlationId,
    category: canonical.category,
    severity: canonical.severity,
    retryable: canonical.retryable,
    fieldErrors: canonical.fieldErrors,
    metadata: canonical.metadata,
  }
}
