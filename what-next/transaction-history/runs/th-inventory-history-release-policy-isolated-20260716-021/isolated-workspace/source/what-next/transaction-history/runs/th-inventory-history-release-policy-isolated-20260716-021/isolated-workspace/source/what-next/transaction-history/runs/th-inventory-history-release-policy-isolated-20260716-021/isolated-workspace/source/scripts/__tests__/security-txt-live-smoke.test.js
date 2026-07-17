const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  ROUTES,
  evaluateSecurityTxt,
  parseArgs,
  routeUrl,
  runSmoke,
  writeReport,
} = require("../security-txt-live-smoke")

function response(body, init = {}) {
  const headers = new Headers(init.headers || {})
  return {
    status: init.status ?? 200,
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    headers,
    text: async () => body,
  }
}

const securityTxt = `Contact: mailto:security@example.test
Expires: 2027-06-30T23:59:59.000Z
Canonical: https://example.test/.well-known/security.txt
`

describe("security-txt-live-smoke", () => {
  it("defaults to fail mode and both public security.txt routes", () => {
    const args = parseArgs(["node", "script"], {}, process.cwd())

    expect(args.mode).toBe("fail")
    expect(args.baseUrl).toBe("http://127.0.0.1:3000")
    expect(args.out.replace(/\\/g, "/")).toContain("what-next/security-txt-live-smoke.json")
    expect(ROUTES).toEqual(["/api/security-txt", "/.well-known/security.txt"])
  })

  it("builds stable route URLs from a configured base URL", () => {
    expect(routeUrl("http://127.0.0.1:3100", "/.well-known/security.txt")).toBe(
      "http://127.0.0.1:3100/.well-known/security.txt",
    )
    expect(routeUrl("http://127.0.0.1:3100/", "/api/security-txt")).toBe(
      "http://127.0.0.1:3100/api/security-txt",
    )
  })

  it("passes when API and well-known routes match with fresh mailto contact", async () => {
    const fetchImpl = jest.fn(async () => response(securityTxt, {
      headers: {
        "content-type": "text/plain",
        "cache-control": "public, max-age=86400",
      },
    }))
    const args = parseArgs(["node", "script", "--base-url", "http://127.0.0.1:3131"], {}, process.cwd())

    const report = await runSmoke(args, { fetchImpl, now: new Date("2026-07-11T00:00:00.000Z") })

    expect(report.status).toBe("ready")
    expect(report.issueCount).toBe(0)
    expect(report.parity).toEqual({ body: true, contentType: true, cacheControl: true })
    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:3131/api/security-txt", expect.any(Object))
    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:3131/.well-known/security.txt", expect.any(Object))
  })

  it("reports route parity and freshness failures", () => {
    const api = {
      status: 200,
      headers: { contentType: "text/plain", cacheControl: "public, max-age=86400" },
      body: securityTxt,
    }
    const canonical = {
      status: 404,
      headers: { contentType: "text/html", cacheControl: "no-store" },
      body: "Contact: security@example.test\nExpires: 2025-01-01T00:00:00.000Z\n",
    }

    expect(evaluateSecurityTxt(api, canonical, new Date("2026-07-11T00:00:00.000Z"))).toEqual(expect.arrayContaining([
      "well_known_security_txt_not_200",
      "security_txt_body_mismatch",
      "security_txt_content_type_mismatch",
      "security_txt_cache_control_mismatch",
      "security_txt_contact_not_mailto",
      "security_txt_stale_expires",
    ]))
  })

  it("writes a JSON evidence report", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "security-txt-smoke-"))
    const out = path.join(root, "what-next", "security-txt-live-smoke.json")
    const report = { status: "ready", issues: [] }

    writeReport(report, out)

    expect(JSON.parse(fs.readFileSync(out, "utf8"))).toEqual(report)
  })
})
