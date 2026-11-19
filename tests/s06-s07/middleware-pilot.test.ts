import middleware from "../../middleware"
import { NextRequest } from "next/server"
import { CSP_NONCE_HEADER } from "../../lib/security/csp-pilot"
import { LOCALE_COOKIE } from "../../i18n/routing"

// Only the ESM configuration factory is replaced; routing helpers and
// NextRequest/NextResponse are real. No persistence or application providers.
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
afterEach(() => { delete process.env.STOQUIFY_CSP_MODE })
it.each(["report-only", "enforce"])("wires %s response and renderer nonce without accepting a forged policy", mode => {
  process.env.STOQUIFY_CSP_MODE = mode
  const response = middleware(new NextRequest("http://localhost/en/login", { headers: {
    [CSP_NONCE_HEADER]: "forged", "content-security-policy": "script-src 'nonce-forged'", "content-security-policy-report-only": "forged",
  } }))
  const policy = response.headers.get(mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only")!
  const nonce = response.headers.get(`x-middleware-request-${CSP_NONCE_HEADER}`)!
  expect(nonce).not.toBe("forged")
  expect(policy).toContain(`'nonce-${nonce}'`)
  expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(policy)
  expect(response.headers.get("x-middleware-request-content-security-policy-report-only")).toBeNull()
  expect(response.headers.get("cache-control")).toContain("no-store")
  if (mode === "report-only") {
    const baseline = response.headers.get("Content-Security-Policy")!
    expect(baseline).toContain(`'nonce-${nonce}'`)
    expect(baseline).toContain("script-src-elem 'self' 'unsafe-inline'")
    expect(baseline).toContain("script-src-attr 'unsafe-inline'")
    expect(baseline).toContain("object-src 'none'")
  }
})
it("removes forged renderer headers outside the pilot", () => {
  const response = middleware(new NextRequest("http://localhost/en/login", { headers: { [CSP_NONCE_HEADER]: "forged", "content-security-policy": "forged" } }))
  expect(response.headers.get(`x-middleware-request-${CSP_NONCE_HEADER}`)).toBeNull()
  expect(response.headers.get("x-middleware-request-content-security-policy")).toBeNull()
  expect(response.headers.get("content-security-policy-report-only")).toBeNull()
})
it("returns retry guidance and no-store on a real middleware denial", () => {
  const request = new NextRequest("http://localhost/api/receipts/fixture", { headers: { "x-real-ip": "192.0.2.222" } })
  let response = middleware(request)
  for (let n = 0; n < 200; n++) response = middleware(request)
  expect(response.status).toBe(429)
  expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0)
  expect(response.headers.get("cache-control")).toContain("no-store")
  expect(response.headers.get("referrer-policy")).toBe("no-referrer")
})
it.each(["/en/login", "/api/auth/sign-in"])("does not substitute the general quota for specialized auth controls on %s", path => {
  const request = new NextRequest(`http://localhost${path}`, { headers: { "x-real-ip": "192.0.2.223" } })
  for (let n = 0; n < 250; n++) expect(middleware(request).status).toBe(200)
})

it.each([['en', 'GET'], ['en', 'POST'], ['fr', 'GET'], ['fr', 'POST']])(
  "does not rewrite a matching language cookie for %s %s requests", (locale, method) => {
    const response = middleware(new NextRequest(`http://localhost/${locale}/dashboard/manager-action-center`, {
      method,
      headers: { cookie: `better-auth.session_token=opaque; ${LOCALE_COOKIE}=${locale}`, "x-real-ip": "192.0.2.224" },
    }))
    expect(response.status).toBe(200)
    expect(response.cookies.get(LOCALE_COOKIE)).toBeUndefined()
    expect(response.headers.get("x-middleware-set-cookie")).toBeNull()
    expect(response.headers.get("x-middleware-request-x-next-intl-locale")).toBe(locale)
    expect(response.headers.get("X-Frame-Options")).toBe("DENY")
  },
)

it.each([undefined, 'en'])("persists the requested language when its cookie is %s", previous => {
  const response = middleware(new NextRequest("http://localhost/fr/dashboard/manager-action-center", {
    headers: { cookie: `better-auth.session_token=opaque${previous ? `; ${LOCALE_COOKIE}=${previous}` : ''}`, "x-real-ip": "192.0.2.225" },
  }))
  expect(response.cookies.get(LOCALE_COOKIE)).toMatchObject({ value: "fr", path: "/", maxAge: 60 * 60 * 24 * 365 })
  expect(response.headers.get("x-middleware-request-x-next-intl-locale")).toBe("fr")
})
