import { Prisma } from "@prisma/client"
import { ZodError } from "zod"

import {
  ErrorCategory,
  ErrorContext,
  ErrorSeverity,
  RecoveryStrategy,
  type ServerActionResult,
} from "./types"
import { sanitizeErrorMetadata } from "./error-handler"

export type CanonicalErrorStatus = 400 | 401 | 403 | 404 | 405 | 409 | 422 | 429 | 500 | 503

export type CanonicalErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "FRESH_AUTH_REQUIRED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS_RULE_VIOLATION"
  | "DUPLICATE_KEY_CONFLICT"
  | "DATABASE_CONFLICT"
  | "DATABASE_UNAVAILABLE"
  | "METHOD_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"

export type CanonicalNotificationIntent = {
  user: boolean
  admin: boolean
  level: "info" | "warning" | "error" | "critical"
}

export type CanonicalError = {
  id: string
  code: CanonicalErrorCode
  category: ErrorCategory
  severity: ErrorSeverity
  status: CanonicalErrorStatus
  retryable: boolean
  recoverable: boolean
  userMessage: string
  operatorMessage: string
  correlationId: string
  requestId: string
  context: ErrorContext
  fieldErrors?: Record<string, string[]>
  metadata?: Record<string, unknown>
  notification: CanonicalNotificationIntent
}

export type CanonicalErrorOptions = {
  code?: CanonicalErrorCode
  category?: ErrorCategory
  severity?: ErrorSeverity
  status?: CanonicalErrorStatus
  retryable?: boolean
  recoverable?: boolean
  userMessage?: string
  operatorMessage?: string
  correlationId?: string
  requestId?: string
  context?: ErrorContext
  action?: string
  component?: string
  endpoint?: string
  organizationId?: string
  userId?: string
  metadata?: Record<string, unknown>
  fieldErrors?: Record<string, string[]>
}

type ApplicationErrorLike = Error & {
  code?: string
  status?: number
  expose?: boolean
}

type RbacErrorLike = Error & {
  code?: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN" | string
  status?: number
}

const INTERNAL_MESSAGE = "The operation could not be completed. Please try again or contact support."
const SECRET_PATTERN = /(password|secret|token|authorization|cookie|api[-_]?key|database_url|postgres(?:ql)?:\/\/|mongodb(?:\+srv)?:\/\/|prisma|sql|stack|\\users\\|\/users\/)/i

export function createCorrelationId(prefix = "err") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function isNextControlFlowError(error: unknown): boolean {
  const digest = typeof error === "object" && error !== null && "digest" in error
    ? String((error as { digest?: unknown }).digest)
    : ""

  return digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isApplicationErrorLike(error: unknown): error is ApplicationErrorLike {
  return error instanceof Error && typeof (error as ApplicationErrorLike).code === "string"
}

function isRbacErrorLike(error: unknown): error is RbacErrorLike {
  return error instanceof Error &&
    typeof (error as RbacErrorLike).code === "string" &&
    ((error as RbacErrorLike).code === "UNAUTHENTICATED" ||
      (error as RbacErrorLike).code === "NO_ACTIVE_ORG" ||
      (error as RbacErrorLike).code === "FORBIDDEN")
}

function isPrismaKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError ||
    (isRecord(error) &&
      typeof error.code === "string" &&
      /^P\d{4}$/.test(error.code) &&
      typeof error.clientVersion === "string")
}

function toStatus(value: unknown, fallback: CanonicalErrorStatus): CanonicalErrorStatus {
  return typeof value === "number" && [400, 401, 403, 404, 405, 409, 422, 429, 500, 503].includes(value)
    ? value as CanonicalErrorStatus
    : fallback
}

function safeUserMessage(message: string | undefined, fallback = INTERNAL_MESSAGE) {
  if (!message) return fallback
  return SECRET_PATTERN.test(message) ? fallback : message
}

function severityForStatus(status: CanonicalErrorStatus) {
  if (status >= 500) return ErrorSeverity.HIGH
  if (status === 403 || status === 401) return ErrorSeverity.MEDIUM
  return ErrorSeverity.LOW
}

function categoryForCode(code: CanonicalErrorCode) {
  switch (code) {
    case "VALIDATION_ERROR":
      return ErrorCategory.VALIDATION
    case "AUTH_REQUIRED":
    case "FRESH_AUTH_REQUIRED":
      return ErrorCategory.AUTHENTICATION
    case "FORBIDDEN":
      return ErrorCategory.AUTHORIZATION
    case "BUSINESS_RULE_VIOLATION":
      return ErrorCategory.BUSINESS_RULE
    case "CONFLICT":
    case "DUPLICATE_KEY_CONFLICT":
    case "DATABASE_CONFLICT":
      return ErrorCategory.DATABASE
    case "NOT_FOUND":
      return ErrorCategory.BUSINESS_RULE
    case "RATE_LIMITED":
      return ErrorCategory.PERFORMANCE
    case "DATABASE_UNAVAILABLE":
      return ErrorCategory.DATABASE
    case "METHOD_NOT_ALLOWED":
      return ErrorCategory.VALIDATION
    case "INTERNAL_ERROR":
    default:
      return ErrorCategory.SYSTEM
  }
}

function notificationFor(severity: ErrorSeverity, retryable: boolean): CanonicalNotificationIntent {
  if (severity === ErrorSeverity.CRITICAL) {
    return { user: true, admin: true, level: "critical" }
  }

  if (severity === ErrorSeverity.HIGH) {
    return { user: true, admin: true, level: "error" }
  }

  if (retryable) {
    return { user: true, admin: false, level: "warning" }
  }

  return { user: true, admin: false, level: severity === ErrorSeverity.LOW ? "info" : "warning" }
}

function fieldErrorsFromZod(error: ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.length ? issue.path.join(".") : "_form"
    acc[key] = [...(acc[key] ?? []), issue.message]
    return acc
  }, {})
}

function createCanonicalError(params: {
  code: CanonicalErrorCode
  status: CanonicalErrorStatus
  userMessage: string
  operatorMessage: string
  retryable?: boolean
  recoverable?: boolean
  category?: ErrorCategory
  severity?: ErrorSeverity
  fieldErrors?: Record<string, string[]>
}, options: CanonicalErrorOptions = {}): CanonicalError {
  const correlationId = options.correlationId || options.requestId || createCorrelationId()
  const retryable = options.retryable ?? params.retryable ?? false
  const status = options.status ?? params.status
  const severity = options.severity ?? params.severity ?? severityForStatus(status)
  const code = options.code ?? params.code

  return {
    id: correlationId,
    code,
    category: options.category ?? params.category ?? categoryForCode(code),
    severity,
    status,
    retryable,
    recoverable: options.recoverable ?? params.recoverable ?? retryable,
    userMessage: safeUserMessage(options.userMessage ?? params.userMessage, params.userMessage),
    operatorMessage: String(sanitizeErrorMetadata(options.operatorMessage ?? params.operatorMessage)),
    correlationId,
    requestId: correlationId,
    context: options.context ?? ErrorContext.SERVER_ACTION,
    fieldErrors: options.fieldErrors ?? params.fieldErrors,
    metadata: sanitizeErrorMetadata({
      ...options.metadata,
      action: options.action,
      component: options.component,
      endpoint: options.endpoint,
      organizationId: options.organizationId,
      userId: options.userId,
    }) as Record<string, unknown>,
    notification: notificationFor(severity, retryable),
  }
}

export function normalizeToCanonicalError(error: unknown, options: CanonicalErrorOptions = {}): CanonicalError {
  if (isNextControlFlowError(error)) {
    throw error
  }

  if (error instanceof ZodError) {
    return createCanonicalError({
      code: "VALIDATION_ERROR",
      status: 400,
      userMessage: "Invalid input. Please review the form and try again.",
      operatorMessage: error.message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      fieldErrors: fieldErrorsFromZod(error),
    }, options)
  }

  if (isRbacErrorLike(error)) {
    const isAuth = error.code === "UNAUTHENTICATED" || error.code === "NO_ACTIVE_ORG" || error.status === 401
    return createCanonicalError({
      code: isAuth ? "AUTH_REQUIRED" : "FORBIDDEN",
      status: isAuth ? 401 : 403,
      userMessage: isAuth ? "Unauthenticated" : "Forbidden",
      operatorMessage: error.message,
      category: isAuth ? ErrorCategory.AUTHENTICATION : ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
    }, options)
  }

  if (isPrismaKnownRequestError(error)) {
    if (error.code === "P2002") {
      return createCanonicalError({
        code: "CONFLICT",
        status: 409,
        userMessage: "A record with the same unique value already exists.",
        operatorMessage: error.message,
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
      }, options)
    }

    if (error.code === "P2003") {
      return createCanonicalError({
        code: "DATABASE_CONFLICT",
        status: 409,
        userMessage: "The selected record cannot be used because a related record is missing.",
        operatorMessage: error.message,
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
      }, options)
    }

    if (error.code === "P2025") {
      return createCanonicalError({
        code: "NOT_FOUND",
        status: 404,
        userMessage: "The requested record was not found.",
        operatorMessage: error.message,
        category: ErrorCategory.BUSINESS_RULE,
        severity: ErrorSeverity.LOW,
      }, options)
    }

    return createCanonicalError({
      code: "DATABASE_UNAVAILABLE",
      status: 503,
      userMessage: "We are experiencing temporary technical difficulties. Please try again in a moment.",
      operatorMessage: error.message,
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
      retryable: true,
    }, options)
  }

  if (isApplicationErrorLike(error)) {
    const status = toStatus(error.status, 500)
    const code = canonicalCodeFromString(error.code, status)
    return createCanonicalError({
      code,
      status,
      userMessage: error.expose === false ? INTERNAL_MESSAGE : error.message,
      operatorMessage: error.message,
      category: categoryForCode(code),
      severity: severityForStatus(status),
    }, options)
  }

  if (typeof error === "string") {
    return createCanonicalError({
      code: options.code ?? "INTERNAL_ERROR",
      status: options.status ?? 500,
      userMessage: options.userMessage ?? safeUserMessage(error),
      operatorMessage: error,
    }, options)
  }

  const message = error instanceof Error ? error.message : "Unknown error"
  return createCanonicalError({
    code: options.code ?? "INTERNAL_ERROR",
    status: options.status ?? 500,
    userMessage: options.userMessage ?? INTERNAL_MESSAGE,
    operatorMessage: message,
  }, {
    ...options,
    metadata: {
      ...options.metadata,
      errorName: error instanceof Error ? error.name : typeof error,
    },
  })
}

function canonicalCodeFromString(code: string | undefined, status: CanonicalErrorStatus): CanonicalErrorCode {
  switch (code) {
    case "VALIDATION_ERROR":
    case "AUTH_REQUIRED":
    case "FORBIDDEN":
    case "FRESH_AUTH_REQUIRED":
    case "NOT_FOUND":
    case "CONFLICT":
    case "BUSINESS_RULE_VIOLATION":
    case "DUPLICATE_KEY_CONFLICT":
    case "DATABASE_CONFLICT":
    case "DATABASE_UNAVAILABLE":
    case "METHOD_NOT_ALLOWED":
    case "RATE_LIMITED":
    case "INTERNAL_ERROR":
      return code
    default:
      if (status === 401) return "AUTH_REQUIRED"
      if (status === 403) return "FORBIDDEN"
      if (status === 404) return "NOT_FOUND"
      if (status === 409) return "CONFLICT"
      if (status === 422) return "BUSINESS_RULE_VIOLATION"
      return "INTERNAL_ERROR"
  }
}

export function canonicalErrorToServerActionError(
  error: CanonicalError,
): NonNullable<ServerActionResult["error"]> {
  return {
    id: error.id,
    code: error.code,
    message: error.userMessage,
    userMessage: error.userMessage,
    category: error.category,
    severity: error.severity,
    status: error.status,
    correlationId: error.correlationId,
    requestId: error.requestId,
    recoverable: error.recoverable,
    retryable: error.retryable,
    fieldErrors: error.fieldErrors,
    metadata: error.metadata,
    context: {
      requestId: error.requestId,
      correlationId: error.correlationId,
      category: error.category,
      severity: error.severity,
    },
  }
}

export function canonicalRecoveryStrategy(error: CanonicalError): RecoveryStrategy {
  if (error.retryable) return RecoveryStrategy.RETRY
  if (error.status >= 500) return RecoveryStrategy.ADMIN_INTERVENTION
  if (error.status >= 400) return RecoveryStrategy.USER_ACTION
  return RecoveryStrategy.NONE
}
