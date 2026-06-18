import { Prisma } from "@prisma/client"

import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  toSafeActionError,
} from "@/services/_shared/action-errors"
import { ErrorCategory, ErrorSeverity } from "@/lib/error-handling/types"

describe("action error compatibility facade", () => {
  it("keeps domain error ergonomics while adding canonical metadata", () => {
    const result = toSafeActionError(
      new BusinessRuleError("Accounting period is closed"),
      { correlationId: "corr_business" },
    )

    expect(result).toMatchObject({
      error: "Accounting period is closed",
      status: 422,
      code: "BUSINESS_RULE_VIOLATION",
      correlationId: "corr_business",
      category: ErrorCategory.BUSINESS_RULE,
      severity: ErrorSeverity.LOW,
      retryable: false,
    })
  })

  it("preserves not-found and conflict classes for service tests", () => {
    expect(new NotFoundError("Missing")).toBeInstanceOf(Error)
    expect(new ConflictError("Duplicate")).toBeInstanceOf(Error)

    expect(toSafeActionError(new NotFoundError("Missing"), { correlationId: "corr_nf" })).toMatchObject({
      error: "Missing",
      status: 404,
      code: "NOT_FOUND",
      correlationId: "corr_nf",
    })
    expect(toSafeActionError(new ConflictError("Duplicate"), { correlationId: "corr_conflict" })).toMatchObject({
      error: "Duplicate",
      status: 409,
      code: "CONFLICT",
      correlationId: "corr_conflict",
    })
  })

  it("maps Prisma known errors through the canonical classifier", () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "test",
    })

    const result = toSafeActionError(prismaError, { correlationId: "corr_p2025" })

    expect(result).toMatchObject({
      error: "The requested record was not found.",
      status: 404,
      code: "NOT_FOUND",
      correlationId: "corr_p2025",
    })
  })

  it("does not leak unknown system errors", () => {
    const result = toSafeActionError(
      new Error("token=abc123 database_url=postgresql://secret"),
      { correlationId: "corr_unknown" },
    )

    expect(result.error).toBe("The operation could not be completed. Please try again or contact support.")
    expect(result.error).not.toContain("abc123")
    expect(result.error).not.toContain("postgresql")
    expect(result.code).toBe("INTERNAL_ERROR")
    expect(result.correlationId).toBe("corr_unknown")
  })
})
