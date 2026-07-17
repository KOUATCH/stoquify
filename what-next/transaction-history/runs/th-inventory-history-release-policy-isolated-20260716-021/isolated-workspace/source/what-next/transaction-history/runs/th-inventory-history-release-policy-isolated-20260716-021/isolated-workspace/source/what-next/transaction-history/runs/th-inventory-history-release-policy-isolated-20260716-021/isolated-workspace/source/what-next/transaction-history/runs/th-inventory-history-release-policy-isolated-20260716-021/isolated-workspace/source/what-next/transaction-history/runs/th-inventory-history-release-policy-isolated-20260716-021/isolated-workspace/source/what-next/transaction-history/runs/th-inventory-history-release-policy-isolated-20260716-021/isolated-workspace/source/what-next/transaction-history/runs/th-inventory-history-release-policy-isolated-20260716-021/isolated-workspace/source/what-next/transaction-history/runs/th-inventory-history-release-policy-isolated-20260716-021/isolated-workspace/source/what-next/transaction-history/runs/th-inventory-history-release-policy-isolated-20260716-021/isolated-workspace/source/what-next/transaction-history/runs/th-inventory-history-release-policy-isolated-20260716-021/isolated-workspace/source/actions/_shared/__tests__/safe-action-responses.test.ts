import {
  safeServerActionErrorResult,
  safeStatusActionErrorResult,
  safeSuccessActionErrorResult,
} from "@/actions/_shared/safe-action-responses"
import { ApplicationError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"

describe("safe action response compatibility helpers", () => {
  it("preserves success-style action envelopes with canonical metadata", () => {
    const result = safeSuccessActionErrorResult(new ForbiddenError("Forbidden"), {
      correlationId: "act_forbidden",
      action: "roles.create",
    })

    expect(result).toMatchObject({
      success: false,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
      correlationId: "act_forbidden",
      retryable: false,
    })
  })

  it("preserves status-style action envelopes without leaking internal messages", () => {
    const result = safeStatusActionErrorResult(
      new Error("postgres://user:password@localhost/prisma query failed"),
      {
        correlationId: "act_internal",
        action: "users.create",
      },
      "Unable to create user.",
    )

    expect(result).toMatchObject({
      data: null,
      error: "Unable to create user.",
      status: 500,
      code: "INTERNAL_ERROR",
      correlationId: "act_internal",
    })
    expect(result.error).not.toContain("postgres")
  })

  it("redacts non-exposing typed database failures", () => {
    const result = safeStatusActionErrorResult(
      new ApplicationError(
        "DATABASE_CONFLICT",
        "Sensitive Prisma transaction detail",
        503,
        false,
      ),
      {
        correlationId: "act_database_conflict",
        action: "users.create",
      },
    )

    expect(result).toMatchObject({
      data: null,
      error: "The operation could not be completed. Please try again or contact support.",
      status: 503,
      code: "DATABASE_CONFLICT",
      correlationId: "act_database_conflict",
    })
    expect(result.error).not.toContain("Prisma")
  })

  it("maps typed not-found errors safely", () => {
    const result = safeStatusActionErrorResult(new NotFoundError("Role not found"), {
      correlationId: "act_not_found",
      action: "roles.read",
    })

    expect(result).toMatchObject({
      data: null,
      error: "Role not found",
      status: 404,
      code: "NOT_FOUND",
      correlationId: "act_not_found",
    })
  })

  it("maps stale fresh-auth errors to step-up action responses", () => {
    const error = new Error("Fresh authentication required")
    error.name = "FreshAuthRequiredError"

    const result = safeStatusActionErrorResult(error, {
      correlationId: "act_fresh_auth",
      action: "users.delete",
    }, "Something went wrong")

    expect(result).toMatchObject({
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
      correlationId: "act_fresh_auth",
      retryable: false,
    })
  })

  it("returns canonical ServerActionResult errors for legacy action wrappers", () => {
    const result = safeServerActionErrorResult(new ForbiddenError("Forbidden"), {
      correlationId: "srv_forbidden",
      action: "customers.update",
    })

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Forbidden",
        userMessage: "Forbidden",
        status: 403,
        correlationId: "srv_forbidden",
        retryable: false,
      },
    })
  })
})
