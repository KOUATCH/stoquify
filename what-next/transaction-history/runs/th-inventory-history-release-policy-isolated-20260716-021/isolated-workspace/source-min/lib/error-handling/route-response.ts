import { NextResponse } from "next/server"

import { logger } from "@/lib/logger"
import {
  normalizeToCanonicalError,
  type CanonicalErrorCode,
  type CanonicalErrorOptions,
  type CanonicalErrorStatus,
} from "./canonical"

export type SafeRouteErrorBody = {
  error: string
  code: CanonicalErrorCode
  correlationId: string
  category: string
  severity: string
  retryable: boolean
}

function routeErrorBody(error: ReturnType<typeof normalizeToCanonicalError>): SafeRouteErrorBody {
  return {
    error: error.userMessage,
    code: error.code,
    correlationId: error.correlationId,
    category: error.category,
    severity: error.severity,
    retryable: error.retryable,
  }
}

export function safeRouteErrorBody(error: unknown, options: CanonicalErrorOptions = {}): SafeRouteErrorBody {
  return routeErrorBody(normalizeToCanonicalError(error, options))
}

export function jsonErrorResponse(error: unknown, options: CanonicalErrorOptions = {}) {
  const canonical = normalizeToCanonicalError(error, options)

  logger.error("api route failed", {
    code: canonical.code,
    status: canonical.status,
    category: canonical.category,
    severity: canonical.severity,
    correlationId: canonical.correlationId,
    endpoint: options.endpoint,
    metadata: canonical.metadata,
    operatorMessage: canonical.operatorMessage,
  })

  return NextResponse.json(routeErrorBody(canonical), { status: canonical.status })
}

export function jsonErrorEnvelopeResponse(
  error: unknown,
  options: CanonicalErrorOptions = {},
  envelope: Record<string, unknown> = {},
) {
  const canonical = normalizeToCanonicalError(error, options)

  logger.error("api route failed", {
    code: canonical.code,
    status: canonical.status,
    category: canonical.category,
    severity: canonical.severity,
    correlationId: canonical.correlationId,
    endpoint: options.endpoint,
    metadata: canonical.metadata,
    operatorMessage: canonical.operatorMessage,
  })

  return NextResponse.json({ ...envelope, ...routeErrorBody(canonical) }, { status: canonical.status })
}

export function jsonMethodNotAllowed(method = "Method") {
  return jsonErrorResponse(`${method} not allowed`, {
    code: "METHOD_NOT_ALLOWED",
    status: 405,
    userMessage: "Method not allowed",
  })
}

export function jsonAuthzError(error: string, status: number, endpoint?: string) {
  const safeStatus = status === 401 ? 401 : 403
  return jsonErrorResponse(error, {
    code: safeStatus === 401 ? "AUTH_REQUIRED" : "FORBIDDEN",
    status: safeStatus as CanonicalErrorStatus,
    userMessage: safeStatus === 401 ? "Unauthenticated" : "Forbidden",
    endpoint,
  })
}
