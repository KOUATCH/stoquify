import { Prisma } from "@prisma/client"
import { z } from "zod"

import { normalizeToCanonicalError } from "@/lib/error-handling/canonical"
import { ErrorCategory, ErrorSeverity } from "@/lib/error-handling/types"

describe("canonical error normalizer", () => {
  it("normalizes Zod validation errors with field errors and correlation metadata", () => {
    const parsed = z.object({ name: z.string().min(3) }).safeParse({ name: "x" })

    expect(parsed.success).toBe(false)

    if (!parsed.success) {
      const error = normalizeToCanonicalError(parsed.error, { correlationId: "corr_validation" })

      expect(error).toMatchObject({
        code: "VALIDATION_ERROR",
        status: 400,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        correlationId: "corr_validation",
      })
      expect(error.fieldErrors?.name?.[0]).toContain("at least 3")
    }
  })

  it("classifies Prisma unique conflicts without leaking Prisma internals", () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`email`)",
      {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["email"] },
      },
    )

    const error = normalizeToCanonicalError(prismaError, { correlationId: "corr_prisma" })

    expect(error.code).toBe("CONFLICT")
    expect(error.status).toBe(409)
    expect(error.userMessage).toBe("A record with the same unique value already exists.")
    expect(error.userMessage).not.toContain("P2002")
    expect(error.correlationId).toBe("corr_prisma")
  })

  it("redacts unknown internal errors from client-safe messages", () => {
    const error = normalizeToCanonicalError(
      new Error("postgresql://admin:secret@localhost:5432/db failed with SQL stack"),
      { correlationId: "corr_secret" },
    )

    expect(error.code).toBe("INTERNAL_ERROR")
    expect(error.status).toBe(500)
    expect(error.userMessage).toBe("The operation could not be completed. Please try again or contact support.")
    expect(error.userMessage).not.toContain("secret")
    expect(error.correlationId).toBe("corr_secret")
    expect(error.operatorMessage).not.toContain("postgresql://admin:secret")
  })
})
