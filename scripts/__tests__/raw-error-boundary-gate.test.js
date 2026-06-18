const fs = require("fs")
const os = require("os")
const path = require("path")

const { compareWithBaseline, renderMarkdown, scanRoot } = require("../raw-error-boundary-gate")

function writeFile(root, relativePath, contents) {
  const filePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents, "utf8")
}

describe("raw-error-boundary-gate", () => {
  let root

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "raw-error-boundary-gate-"))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it("flags raw errors crossing action and route boundaries", () => {
    writeFile(
      root,
      "actions/users/createUser.ts",
      'export async function createUser() { try { return null } catch (error) { console.error(error); throw new Error("database password leaked") } }\n',
    )
    writeFile(
      root,
      "app/api/uploads/route.ts",
      'import { NextResponse } from "next/server"\nexport async function GET() { return NextResponse.json({ error: "Internal Server Error" }, { status: 500 }) }\n',
    )

    const result = scanRoot(root)
    const active = result.findings.filter((finding) => !finding.allowed)

    expect(active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classification: "CLIENT_BOUNDARY_UNSAFE",
          file: "actions/users/createUser.ts",
          pattern: "CONSOLE_ERROR",
        }),
        expect.objectContaining({
          classification: "CLIENT_BOUNDARY_UNSAFE",
          file: "actions/users/createUser.ts",
          pattern: "THROW_NEW_ERROR",
        }),
        expect.objectContaining({
          classification: "CLIENT_BOUNDARY_UNSAFE",
          file: "app/api/uploads/route.ts",
          pattern: "RAW_NEXT_ERROR_JSON",
        }),
      ]),
    )
    expect(result.summary.activeViolationCount).toBe(3)
  })

  it("classifies service raw domain errors separately", () => {
    writeFile(
      root,
      "services/pos/pos.service.ts",
      'export async function checkout() { throw new Error("Cash drawer is closed") }\n',
    )

    const result = scanRoot(root)

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classification: "SERVICE_RAW_DOMAIN_ERROR",
          file: "services/pos/pos.service.ts",
          pattern: "THROW_NEW_ERROR",
          allowed: false,
        }),
      ]),
    )
  })

  it("allows test-only raw errors and canonical error-handler internals", () => {
    writeFile(
      root,
      "services/payroll/__tests__/payroll.test.ts",
      'it("throws", () => { throw new Error("expected test failure") })\n',
    )
    writeFile(
      root,
      "lib/error-handling/route-response.ts",
      'export function log(error) { console.error("api route failed", { error }) }\n',
    )

    const result = scanRoot(root)

    expect(result.summary.activeViolationCount).toBe(0)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          allowed: true,
          classification: "TEST_ONLY",
        }),
        expect.objectContaining({
          allowed: true,
          classification: "INTERNAL_LOGGING_ONLY",
        }),
      ]),
    )
  })

  it("allows explicit Next.js control-flow rethrows", () => {
    writeFile(
      root,
      "actions/auth.ts",
      'import { isNextControlFlowError } from "@/lib/error-handling/canonical"\nexport async function login() { try { return null } catch (error) { if (isNextControlFlowError(error)) throw error; return null } }\n',
    )

    const result = scanRoot(root)

    expect(result.summary.activeViolationCount).toBe(0)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          allowed: true,
          classification: "ALLOWED_CONTROL_FLOW",
        }),
      ]),
    )
  })

  it("renders report-mode migration guidance and supports baseline ratchets", () => {
    writeFile(
      root,
      "services/purchase-order/purchase-order.service.ts",
      'export function approve() { throw new Error("invalid status") }\n',
    )

    const baseline = scanRoot(root)
    const current = scanRoot(root)
    const ratchet = compareWithBaseline(current, baseline)
    const markdown = renderMarkdown({ ...current, mode: "report", ratchet })

    expect(ratchet.failed).toBe(false)
    expect(markdown).toContain("AqStoqFlow Raw Error Boundary Gate Report")
    expect(markdown).toContain("SERVICE_RAW_DOMAIN_ERROR")
    expect(markdown).toContain("Baseline Ratchet")
  })

  it("fails the baseline ratchet when new active findings appear", () => {
    const baseline = scanRoot(root)

    writeFile(
      root,
      "app/api/receipts/route.ts",
      'import { NextResponse } from "next/server"\nexport async function POST() { return NextResponse.json({ error: "boom" }, { status: 500 }) }\n',
    )

    const current = scanRoot(root)
    const ratchet = compareWithBaseline(current, baseline)

    expect(ratchet.failed).toBe(true)
    expect(ratchet.newFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classification: "CLIENT_BOUNDARY_UNSAFE",
          file: "app/api/receipts/route.ts",
        }),
      ]),
    )
  })
})
