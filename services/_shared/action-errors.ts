import { Prisma } from "@prisma/client"
import { ZodError } from "zod"

export type SafeActionStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500

export type ApplicationErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS_RULE_VIOLATION"
  | "FRESH_AUTH_REQUIRED"
  | "INTERNAL_ERROR"

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message: string,
    public readonly status: SafeActionStatus,
    public readonly expose = true,
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

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError
}

export function toSafeActionError(error: unknown): {
  error: string
  status: SafeActionStatus
  code: ApplicationErrorCode
} {
  if (isApplicationError(error)) {
    return {
      error: error.expose ? error.message : "The operation could not be completed.",
      status: error.status,
      code: error.code,
    }
  }

  if (error instanceof ZodError) {
    return {
      error: "Invalid input. Please review the form and try again.",
      status: 400,
      code: "VALIDATION_ERROR",
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return {
        error: "A record with the same unique value already exists.",
        status: 409,
        code: "CONFLICT",
      }
    }

    if (error.code === "P2003") {
      return {
        error: "The selected record cannot be used because a related record is missing.",
        status: 409,
        code: "CONFLICT",
      }
    }

    if (error.code === "P2025") {
      return {
        error: "The requested record was not found.",
        status: 404,
        code: "NOT_FOUND",
      }
    }
  }

  return {
    error: "The operation could not be completed. Please try again or contact support.",
    status: 500,
    code: "INTERNAL_ERROR",
  }
}
