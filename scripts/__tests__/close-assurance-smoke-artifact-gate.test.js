const fs = require("fs")
const os = require("os")
const path = require("path")
const { buildReport, parseArgs, renderMarkdown } = require("../close-assurance-smoke-artifact-gate")

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "close-assurance-artifact-gate-"))
}

function write(root, relativePath, value) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, value)
  return target
}

describe("close assurance smoke artifact gate", () => {
  it("accepts bounded redacted accounting evidence and screenshots", () => {
    const root = makeRoot()
    write(root, "what-next/accounting/evidence.json", JSON.stringify({
      contentHash: "sha256:abc123",
      redaction: "Secrets and provider payloads redacted.",
    }))
    write(root, "what-next/accounting/screenshot.png", Buffer.from([137, 80, 78, 71]))

    const report = buildReport({
      root,
      candidates: ["what-next/accounting"],
      allowDiagnosticBinaries: false,
    })

    expect(report).toMatchObject({
      status: "ready",
      fileCount: 2,
      blockerCount: 0,
    })
    expect(renderMarkdown(report, "fail")).toContain("Status: `ready`")
  })

  it("blocks dotenv files and Playwright auth state paths", () => {
    const root = makeRoot()
    write(root, ".env", "DATABASE_URL=postgresql://user:secret@localhost:5432/db")
    write(root, "playwright/.auth/payroll.json", "{}")

    const report = buildReport({
      root,
      candidates: [".env", "playwright/.auth"],
    })

    expect(report.status).toBe("blocked")
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "dotenv-file" }),
        expect.objectContaining({ id: "playwright-auth-state" }),
      ]),
    )
  })

  it("blocks raw database URLs and bearer tokens in text artifacts", () => {
    const root = makeRoot()
    write(
      root,
      "what-next/accounting/evidence.md",
      "DATABASE_URL=postgresql://user:secret@localhost:5432/db\nAuthorization: Bearer abcdefghijklmnop",
    )

    const report = buildReport({
      root,
      candidates: ["what-next/accounting"],
    })

    expect(report.status).toBe("blocked")
    expect(report.findings.map((finding) => finding.id)).toEqual(
      expect.arrayContaining(["raw-postgres-url", "bearer-token"]),
    )
  })

  it("allows redacted database URLs in preflight evidence", () => {
    const root = makeRoot()
    write(
      root,
      "what-next/accounting/preflight.md",
      "- DATABASE_URL: postgresql://user:***@localhost:5432/<database>",
    )

    const report = buildReport({
      root,
      candidates: ["what-next/accounting"],
    })

    expect(report.status).toBe("ready")
  })

  it("requires explicit approval for Playwright trace and video binaries", () => {
    const root = makeRoot()
    write(root, "test-results/trace.zip", Buffer.from("zip"))
    write(root, "test-results/video.webm", Buffer.from("webm"))

    const blocked = buildReport({
      root,
      candidates: ["test-results"],
    })
    const allowed = buildReport({
      root,
      candidates: ["test-results"],
      allowDiagnosticBinaries: true,
    })

    expect(blocked.status).toBe("blocked")
    expect(blocked.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "diagnostic-binary-requires-approval" }),
      ]),
    )
    expect(allowed.status).toBe("ready")
  })

  it("parses custom candidates and fail mode", () => {
    const root = makeRoot()
    const args = parseArgs(
      ["--mode", "fail", "--only-candidate", "what-next/accounting"],
      root,
    )

    expect(args.mode).toBe("fail")
    expect(args.candidates).toEqual(["what-next/accounting"])
  })

  it("treats positional arguments as candidate path overrides", () => {
    const root = makeRoot()
    const args = parseArgs(["--mode", "fail", "what-next/accounting"], root)

    expect(args.mode).toBe("fail")
    expect(args.candidates).toEqual(["what-next/accounting"])
  })
})
