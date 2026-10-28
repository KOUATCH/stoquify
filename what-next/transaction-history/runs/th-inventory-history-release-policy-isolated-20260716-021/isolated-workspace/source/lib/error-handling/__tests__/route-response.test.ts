jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

import {
  jsonAuthzError,
  jsonErrorEnvelopeResponse,
  jsonErrorResponse,
  jsonMethodNotAllowed,
  safeRouteErrorBody,
} from "@/lib/error-handling/route-response"

describe("safe route error responses", () => {
  it("creates safe route bodies with correlation IDs", () => {
    const body = safeRouteErrorBody(new Error("C:\\Users\\Admin\\secret token failed"), {
      correlationId: "route_corr",
    })

    expect(body).toMatchObject({
      error: "The operation could not be completed. Please try again or contact support.",
      code: "INTERNAL_ERROR",
      correlationId: "route_corr",
      retryable: false,
    })
    expect(body.error).not.toContain("secret")
  })

  it("maps unknown route failures to safe JSON", async () => {
    const response = jsonErrorResponse(new Error("sql select * from users failed"), {
      correlationId: "route_unknown",
      endpoint: "GET /api/test",
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: "The operation could not be completed. Please try again or contact support.",
      code: "INTERNAL_ERROR",
      correlationId: "route_unknown",
    })
  })

  it("preserves legacy route envelopes while adding safe metadata", async () => {
    const response = jsonErrorEnvelopeResponse(new Error("prisma sql failed"), {
      correlationId: "route_envelope",
      endpoint: "GET /api/receipts/[receiptId]",
    }, { success: false })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "The operation could not be completed. Please try again or contact support.",
      code: "INTERNAL_ERROR",
      correlationId: "route_envelope",
    })
  })

  it("maps auth and method responses explicitly", async () => {
    const auth = jsonAuthzError("Unauthorized", 401, "GET /api/test")
    expect(auth.status).toBe(401)
    await expect(auth.json()).resolves.toMatchObject({
      error: "Unauthenticated",
      code: "AUTH_REQUIRED",
    })

    const method = jsonMethodNotAllowed("POST")
    expect(method.status).toBe(405)
    await expect(method.json()).resolves.toMatchObject({
      error: "Method not allowed",
      code: "METHOD_NOT_ALLOWED",
    })
  })
})
