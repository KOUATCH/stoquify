import type { CanonicalErrorOptions } from "@/lib/error-handling/canonical"
import { canonicalErrorToServerActionError } from "@/lib/error-handling/canonical"
import type { ServerActionResult } from "@/lib/error-handling/types"
import { logger } from "@/lib/logger"
import { toCanonicalActionError, toSafeActionError } from "@/services/_shared/action-errors"

function normalizeOptions(options: CanonicalErrorOptions, userMessage?: string): CanonicalErrorOptions {
  return userMessage && !options.userMessage ? { ...options, userMessage } : options
}

function logSafeActionError(message: string, safeError: ReturnType<typeof toSafeActionError>) {
  logger.error(message, {
    code: safeError.code,
    status: safeError.status,
    correlationId: safeError.correlationId,
    category: safeError.category,
    severity: safeError.severity,
    retryable: safeError.retryable,
  })
}

export function safeSuccessActionErrorResult(
  error: unknown,
  options: CanonicalErrorOptions = {},
  userMessage?: string,
) {
  const safeError = toSafeActionError(error, normalizeOptions(options, userMessage))
  logSafeActionError("server action failed", safeError)

  return {
    success: false as const,
    data: null,
    error: safeError.error,
    status: safeError.status,
    code: safeError.code,
    correlationId: safeError.correlationId,
    category: safeError.category,
    severity: safeError.severity,
    retryable: safeError.retryable,
    fieldErrors: safeError.fieldErrors,
  }
}

export function safeStatusActionErrorResult(
  error: unknown,
  options: CanonicalErrorOptions = {},
  userMessage?: string,
) {
  const safeError = toSafeActionError(error, normalizeOptions(options, userMessage))
  logSafeActionError("server action failed", safeError)

  return {
    error: safeError.error,
    status: safeError.status,
    data: null,
    code: safeError.code,
    correlationId: safeError.correlationId,
    category: safeError.category,
    severity: safeError.severity,
    retryable: safeError.retryable,
    fieldErrors: safeError.fieldErrors,
  }
}

export function safeActionErrorMessage(
  error: unknown,
  options: CanonicalErrorOptions = {},
  userMessage?: string,
) {
  return toSafeActionError(error, normalizeOptions(options, userMessage)).error
}

export function safeLoggedActionErrorMessage(
  message: string,
  error: unknown,
  options: CanonicalErrorOptions = {},
  userMessage?: string,
) {
  const safeError = toSafeActionError(error, normalizeOptions(options, userMessage))
  logSafeActionError(message, safeError)
  return safeError.error
}

export function safeServerActionErrorResult<T = unknown>(
  error: unknown,
  options: CanonicalErrorOptions = {},
  userMessage?: string,
): ServerActionResult<T> {
  const normalizedOptions = normalizeOptions(options, userMessage)
  const canonical = toCanonicalActionError(error, normalizedOptions)
  const safeError = toSafeActionError(error, normalizedOptions)
  logSafeActionError("server action failed", safeError)

  return {
    success: false,
    error: canonicalErrorToServerActionError(canonical),
  }
}

export function logSafeActionWarning(
  message: string,
  error: unknown,
  options: CanonicalErrorOptions = {},
) {
  const safeError = toSafeActionError(error, normalizeOptions(options, message))

  logger.warn(message, {
    code: safeError.code,
    status: safeError.status,
    correlationId: safeError.correlationId,
    category: safeError.category,
    severity: safeError.severity,
    retryable: safeError.retryable,
  })
}
