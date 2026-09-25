import middleware from "../../../middleware"
import type { NextRequest } from "next/server"
import { DASHBOARD_REQUEST_PATH_HEADER } from "../dashboard-session-recovery"

jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))

jest.mock("next/server", () => ({
  NextResponse: class {
    headers = new Headers()
    requestHeaders = new Headers()
    status: number
    constructor(_body?: unknown, init?: { status?: number; headers?: HeadersInit }) {
      this.status = init?.status ?? 200
      this.headers = new Headers(init?.headers)
    }
    cookies = { set: jest.fn() }
    static next(init?: { request?: { headers?: Headers } }) {
      const response = new this()
      response.requestHeaders = new Headers(init?.request?.headers)
      return response
    }
    static redirect(url: URL) {
      const response = new this()
      response.headers.set("location", url.toString())
      return response
    }
  },
}))

function request(cookieName?: string) {
  return {
    url: "https://stoquify.example/en/dashboard/finance",
    nextUrl: new URL("https://stoquify.example/en/dashboard/finance"),
    headers: new Headers(),
    method: "GET",
    cookies: { get: (name: string) => name === cookieName ? { value: "opaque-session" } : undefined },
  } as unknown as NextRequest
}

describe("dashboard session cookie routing", () => {
  it("overwrites forged recovery headers with the actual dashboard URL", () => {
    const req = request("better-auth.session_token")
    req.headers.set(DASHBOARD_REQUEST_PATH_HEADER, "//attacker.invalid")
    req.nextUrl.search = "?digest=finance-cash&mode=command"
    const response = middleware(req) as unknown as { requestHeaders: Headers }
    expect(response.requestHeaders.get(DASHBOARD_REQUEST_PATH_HEADER)).toBe("/en/dashboard/finance?digest=finance-cash&mode=command")
  })

  it("removes client recovery headers on non-dashboard requests", () => {
    const req = request("better-auth.session_token")
    req.nextUrl.pathname = "/en/login"
    req.headers.set(DASHBOARD_REQUEST_PATH_HEADER, "/en/dashboard/forged")
    const response = middleware(req) as unknown as { requestHeaders: Headers }
    expect(response.requestHeaders.get(DASHBOARD_REQUEST_PATH_HEADER)).toBeNull()
  })
  it.each(["__Secure-better-auth.session_token", "better-auth.session_token"])(
    "lets %s reach server authorization", (cookieName) => {
      expect(middleware(request(cookieName)).headers.get("location")).toBeNull()
    },
  )

  it("redirects missing or unrelated cookies to the localized login", () => {
    for (const cookieName of [undefined, "unrelated"]) {
      const location = middleware(request(cookieName)).headers.get("location")
      expect(location).toContain("/en/login?")
      expect(new URL(location!).searchParams.get("callbackUrl")).toBe("/en/dashboard/finance")
    }
  })
})

describe("private receipt transport policy", () => {
  it.each(["/digital-receipt/sale", "/api/receipts/sale"])("keeps %s private and unindexed without requiring a session", path => {
    const req = { ...request(), nextUrl: new URL("https://stoquify.example" + path + "?token=opaque"), headers: new Headers({ "x-real-ip": "192.0.2.181" }) } as unknown as NextRequest
    const response = middleware(req)
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer")
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0")
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive")
  })

  it("does not broaden the receipt policy to similar prefixes", () => {
    const req = { ...request(), nextUrl: new URL("https://stoquify.example/digital-receipt-other") } as unknown as NextRequest
    expect(middleware(req).headers.get("X-Robots-Tag")).toBeNull()
  })

  it("keeps denied receipt responses private and unindexed", () => {
    const req = { ...request(), nextUrl: new URL("https://stoquify.example/digital-receipt/sale"), headers: new Headers({ "x-real-ip": "192.0.2.182" }) } as unknown as NextRequest
    let response
    for (let i = 0; i < 201; i++) response = middleware(req)
    expect(response?.status).toBe(429)
    expect(response?.headers.get("Referrer-Policy")).toBe("no-referrer")
    expect(response?.headers.get("Cache-Control")).toBe("private, no-store, max-age=0")
    expect(response?.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive")
  })
})

describe("signed customer statement transport policy", () => {
  function statementRequest(path: string) {
    return { ...request(), nextUrl: new URL("https://stoquify.example" + path), headers: new Headers({ "x-real-ip": "192.0.2.180" }) } as unknown as NextRequest
  }
  it.each(["/customer-statement/snapshot", "/api/customer-statements/snapshot", "/api/customer-statements/snapshot/actions", "/en/supplier-purchase-order/envelope", "/fr/supplier-purchase-order/envelope", "/api/supplier-po-envelopes/envelope", "/api/supplier-po-envelopes/envelope/proposals"])("preserves private headers through middleware for %s", path => {
    const response = middleware(statementRequest(path))
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer")
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0")
  })
  it("keeps the existing referrer policy on other routes and similar prefixes", () => {
    for (const path of ["/api/customer-statements-other", "/customer-statement-other", "/api/customers", "/api/supplier-po-envelopes-other", "/en/supplier-purchase-order-other"]) {
      expect(middleware(statementRequest(path)).headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin")
    }
  })
  it("keeps rate-limit denials private without allowing requests through", () => {
    let response
    for (let i = 0; i < 201; i++) response = middleware(statementRequest("/api/customer-statements/snapshot/actions"))
    expect(response?.status).toBe(429)
    expect(response?.headers.get("Referrer-Policy")).toBe("no-referrer")
    expect(response?.headers.get("Cache-Control")).toBe("private, no-store, max-age=0")
  })
})
