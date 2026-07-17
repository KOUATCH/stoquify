import { err } from "@/services/_shared/action-response"
import { NotFoundError } from "@/services/_shared/action-errors"

describe("action-response helpers", () => {
  it("redacts unexpected internal errors in legacy action responses", () => {
    const result = err(new Error("postgres://user:password@localhost/prisma query failed"))

    expect(result).toMatchObject({
      success: false,
      data: null,
      error: "The operation could not be completed. Please try again or contact support.",
    })
    expect(result.error).not.toContain("postgres")
  })

  it("preserves typed domain messages in legacy action responses", () => {
    const result = err(new NotFoundError("Location not found"))

    expect(result).toMatchObject({
      success: false,
      data: null,
      error: "Location not found",
    })
  })
})
