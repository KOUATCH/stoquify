import { TrafficLimiter, trafficIdentity } from "../../lib/security/traffic-limiter"
import { cspPilot } from "../../lib/security/csp-pilot"

describe("bounded fallback traffic policy", () => {
  it("denies at the boundary, supplies a retry delay and expires at the exact reset", () => {
    const limiter = new TrafficLimiter(10, 2, 60000)
    expect(limiter.check("a", 0).allowed).toBe(true)
    expect(limiter.check("a", 1).allowed).toBe(true)
    expect(limiter.check("a", 30000)).toEqual({ allowed: false, retryAfter: 30 })
    expect(limiter.check("a", 60000).allowed).toBe(true)
  })
  it("reclaims idle identities when another identity arrives", () => {
    const limiter = new TrafficLimiter(100)
    for (let n = 0; n < 100; n++) limiter.check(String(n), 0)
    limiter.check("new", 60000)
    expect(limiter.size).toBe(1)
  })
  it("bounds churn and overflow without evicting active blocked identities", () => {
    const limiter = new TrafficLimiter(2, 2)
    limiter.check("a", 0); limiter.check("a", 0); limiter.check("b", 0)
    expect(limiter.check("c", 0).allowed).toBe(true)
    expect(limiter.check("d", 0).allowed).toBe(true)
    for (let n = 0; n < 10000; n++) expect(limiter.check(`new-${n}`, 0).allowed).toBe(false)
    expect(limiter.size).toBe(2)
    expect(limiter.check("a", 0).allowed).toBe(false)
  })
  it("makes the per-instance limitation explicit", () => {
    const a = new TrafficLimiter(2, 1), b = new TrafficLimiter(2, 1)
    expect(a.check("same", 0).allowed).toBe(true)
    expect(a.check("same", 0).allowed).toBe(false)
    expect(b.check("same", 0).allowed).toBe(true)
  })
  it("measures shared-NAT allowance: ten tills with twenty requests fit; the next request is denied", () => {
    const limiter = new TrafficLimiter()
    for (let n = 0; n < 200; n++) expect(limiter.check("nat", 0).allowed).toBe(true)
    expect(limiter.check("nat", 0).allowed).toBe(false)
  })
  it("ignores forwarded headers when an ingress-owned header is selected", () => {
    const headers = new Headers({ "x-real-ip": "192.0.2.1", "x-forwarded-for": "203.0.113.1", "cf-connecting-ip": "203.0.113.2" })
    expect(trafficIdentity(headers, "x-real-ip")).toBe("192.0.2.1")
    headers.delete("x-real-ip")
    expect(trafficIdentity(headers, "x-real-ip")).toBe("unknown")
    expect(trafficIdentity(headers, "arbitrary-header")).toBe("unknown")
  })
  it("bounds untrusted compatibility keys", () => {
    expect(trafficIdentity(new Headers({ "x-forwarded-for": "a".repeat(1000) }))).toBe("unknown")
    expect(trafficIdentity(new Headers({ "x-forwarded-for": "192.0.2.1, 10.0.0.1" }))).toBe("192.0.2.1")
  })
  it("rejects malformed addresses and canonicalizes IPv6 partitions", () => {
    for (const value of ["abc", "999.0.0.1", "1.2.3.4:80", "::1, ::2", "01.2.3.4"]) expect(trafficIdentity(new Headers({ "x-real-ip": value }), "x-real-ip")).toBe("unknown")
    expect(trafficIdentity(new Headers({ "x-real-ip": "2001:0DB8:0:0:0:0:0:1" }), "x-real-ip")).toBe("[2001:db8::1]")
  })
})

describe("CSP pilot", () => {
  it.each(["/en/login", "/fr/login"])("uses unique production nonces on %s", path => {
    const a = cspPilot(path, "enforce", true)!, b = cspPilot(path, "enforce", true)!
    expect(a.nonce).not.toBe(b.nonce)
    expect(a.policy).toContain(`'nonce-${a.nonce}'`)
    expect(a.policy.split("script-src")[1].split(";")[0]).not.toMatch(/unsafe-inline|unsafe-eval/)
    expect(a.header).toBe("Content-Security-Policy")
  })
  it("supports report-only and explicit rollback", () => {
    expect(cspPilot("/en/login", "report-only", true)?.header).toBe("Content-Security-Policy-Report-Only")
    expect(cspPilot("/en/login", undefined, true)).toBeNull()
    expect(cspPilot("/en/login", "off", true)).toBeNull()
  })
  it.each(["/en", "/en/login-v2", "/en/dashboard/pos", "/digital-receipt/a", "/api/auth/sign-in", "/_next/static/a.js"])("does not activate outside the cohort: %s", path => {
    expect(cspPilot(path, "enforce", true)).toBeNull()
  })
})
