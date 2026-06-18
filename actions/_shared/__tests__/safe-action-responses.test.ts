import {
  safeServerActionErrorResult,
  safeStatusActionErrorResult,
  safeSuccessActionErrorResult,
} from "@/actions/_shared/safe-action-responses"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"

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
