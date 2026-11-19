import middleware from "../../../middleware"
import type { NextRequest } from "next/server"
import { DASHBOARD_REQUEST_PATH_HEADER } from "../dashboard-session-recovery"
import { LOCALE_COOKIE } from "@/i18n/routing"

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

describe("configured public redirect origin", () => {
  const originKeys = ["NEXTAUTH_URL", "NEXT_PUBLIC_BASE_URL", "NEXT_PUBLIC_APP_URL"] as const
  const originalOrigins = Object.fromEntries(originKeys.map(key => [key, process.env[key]]))
  const publicOrigin = "https://127.0.0.1:3443"

  beforeEach(() => {
    for (const key of originKeys) delete process.env[key]
  })

  afterEach(() => {
    for (const key of originKeys) {
      if (originalOrigins[key] === undefined) delete process.env[key]
      else process.env[key] = originalOrigins[key]
    }
  })

  function proxiedRequest(path: string, cookieName?: string, locale = "en") {
    return {
      ...request(cookieName),
      url: "https://localhost:3296" + path,
      nextUrl: new URL("https://localhost:3296" + path),
      headers: new Headers({
        host: "attacker.invalid",
        "x-forwarded-host": "attacker.invalid:8443",
        "x-forwarded-proto": "http",
        "x-forwarded-port": "8443",
        "x-real-ip": "203.0.113.51",
      }),
      cookies: { get: (name: string) => name === LOCALE_COOKIE ? { value: locale } : name === cookieName ? { value: "opaque-session" } : undefined },
    } as unknown as NextRequest
  }

  it.each(["en", "fr"])("keeps anonymous %s close recovery on the configured HTTPS origin", locale => {
    process.env.NEXTAUTH_URL = publicOrigin
    const path = `/${locale}/dashboard/accounting/close/period-1?tab=proof&source=close`
    const response = middleware(proxiedRequest(path, undefined, locale))
    const location = new URL(response.headers.get("location")!)
    expect(location.origin).toBe(publicOrigin)
    expect(location.pathname).toBe(`/${locale}/login`)
    expect(location.searchParams.get("callbackUrl")).toBe(path)
    expect(response.cookies.set).toHaveBeenCalledWith(LOCALE_COOKIE, locale, expect.objectContaining({ path: "/" }))
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'")
  })

  it.each(["/login?returnUrl=%2Ffr%2Fdashboard", "/dashboard/accounting/close/period-1?tab=proof"])("localizes %s without exposing the internal server address", path => {
    process.env.NEXTAUTH_URL = publicOrigin
    const location = new URL(middleware(proxiedRequest(path, undefined, "fr")).headers.get("location")!)
    expect(location.origin).toBe(publicOrigin)
    expect(location.pathname).toBe("/fr" + path.split("?")[0])
    expect(location.search).toBe(new URL("https://example.invalid" + path).search)
  })

  it.each(originKeys)("uses the valid configured %s origin and ignores forwarded hosts", key => {
    process.env[key] = publicOrigin
    const location = new URL(middleware(proxiedRequest("/en/dashboard/accounting/close/period-1")).headers.get("location")!)
    expect(location.origin).toBe(publicOrigin)
    expect(location.hostname).not.toBe("attacker.invalid")
  })

  it("retains auth origin precedence and normalizes away configuration paths", () => {
    process.env.NEXTAUTH_URL = publicOrigin + "/configured/path?ignored=true"
    process.env.NEXT_PUBLIC_BASE_URL = "https://base.example.invalid"
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.invalid"
    const location = new URL(middleware(proxiedRequest("/en/dashboard/accounting/close/period-1")).headers.get("location")!)
    expect(location.origin).toBe(publicOrigin)
    expect(location.pathname).toBe("/en/login")
  })

  it("skips invalid configured origins before a valid public base origin", () => {
    process.env.NEXTAUTH_URL = "javascript:alert(1)"
    process.env.NEXT_PUBLIC_BASE_URL = publicOrigin
    expect(new URL(middleware(proxiedRequest("/en/dashboard/accounting/close/period-1")).headers.get("location")!).origin).toBe(publicOrigin)
  })

  it.each([undefined, "not a URL", "javascript:alert(1)", "ftp://configuration.invalid"])("keeps the existing request fallback when no HTTP(S) origin is configured: %s", value => {
    for (const key of originKeys) {
      if (value !== undefined) process.env[key] = value
    }
    const location = new URL(middleware(proxiedRequest("/en/dashboard/accounting/close/period-1")).headers.get("location")!)
    expect(location.origin).toBe("https://localhost:3296")
    expect(location.pathname).toBe("/en/login")
    expect(location.hostname).not.toBe("attacker.invalid")
  })

  it("still sends authenticated requests through server authorization without a redirect", () => {
    process.env.NEXTAUTH_URL = publicOrigin
    const path = "/en/dashboard/accounting/close/period-1?tab=proof"
    const response = middleware(proxiedRequest(path, "__Secure-better-auth.session_token")) as unknown as { headers: Headers; requestHeaders: Headers }
    expect(response.headers.get("location")).toBeNull()
    expect(response.requestHeaders.get(DASHBOARD_REQUEST_PATH_HEADER)).toBe(path)
  })
})

describe("private receipt transport policy", () => {
  it.each(["/en/pos-receipt", "/fr/pos-receipt"])("keeps authenticated print preview %s private and unindexed", path => {
    const req = { ...request(), nextUrl: new URL("https://stoquify.example" + path + "?saleId=fixture"), headers: new Headers({ "x-real-ip": "192.0.2.183" }) } as unknown as NextRequest
    const response = middleware(req)
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer")
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0")
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive")
  })

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
