const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  evaluatePublicReceiptTokenConfigGate,
  isReleaseEnvironment,
  parseArgs,
  renderMarkdown,
} = require("../public-receipt-token-config-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "public-receipt-token-config-gate-"))
}

function writeFile(root, relativePath, content) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content, "utf8")
}

function writeReceiptTokenSurface(root) {
  writeFile(
    root,
    "services/pos/public-receipt-token.ts",
    `
      import { createHmac, timingSafeEqual } from "node:crypto"
      export function createPublicReceiptAccessToken() {
        return createHmac("sha256", "secret").update("payload").digest("base64url")
      }
      export function verifyPublicReceiptAccessToken() {
        const exp = 1
        return timingSafeEqual(Buffer.from("a"), Buffer.from("a")) && exp
      }
    `,
  )
  writeFile(
    root,
    "services/pos/public-receipt-token-registry.service.ts",
    `
      export async function assertPublicReceiptAccessToken(input) {
        const verification = verifyPublicReceiptAccessToken({ token: input.receiptAccessToken })
        if (!verification.ok) throw new Error("Receipt not found")
        const row = await db.publicReceiptAccessToken.findFirst({ where: { tokenHash: "hash" } })
        if (!row || row.status !== ACTIVE_STATUS) throw new Error("Receipt not found")
        return { organizationId: row.organizationId }
      }
    `,
  )
  writeFile(
    root,
    "services/pos/receipt.service.ts",
    `
      export async function getPublicSalesReceipt(input) {
        const access = await assertPublicReceiptAccessToken({ token: input.receiptAccessToken })
        return findSalesReceipt(input.salesOrderId, access.organizationId, {
          includeCustomerContact: false,
          receiptAccessToken: input.receiptAccessToken,
          issuePublicReceiptToken: false,
        })
      }
    `,
  )
  writeFile(
    root,
    "app/api/receipts/[receiptId]/route.ts",
    `
      export async function GET(request) {
        const receiptAccessToken = new URL(request.url).searchParams.get("token")?.trim() || undefined
        if (!receiptAccessToken) throw new Error("Receipt not found")
        return getPublicSalesReceipt({ receiptAccessToken })
      }
    `,
  )
}

describe("public receipt token config gate", () => {
  it("keeps local development reportable when no token secret is configured", () => {
    const root = makeTempRepo()
    writeReceiptTokenSurface(root)

    const report = evaluatePublicReceiptTokenConfigGate(root, {
      release: "auto",
      env: { NODE_ENV: "development" },
    })

    expect(report.releaseRequired).toBe(false)
    expect(report.summary.status).toBe("ready")
    expect(report.summary.blockerCount).toBe(0)
    expect(report.summary.warningCount).toBe(1)
    expect(report.warnings[0].blocker).toContain("not configured")
  })

  it("blocks forced release when the public receipt token secret is missing", () => {
    const root = makeTempRepo()
    writeReceiptTokenSurface(root)

    const report = evaluatePublicReceiptTokenConfigGate(root, {
      release: "true",
      env: {},
    })

    expect(report.releaseRequired).toBe(true)
    expect(report.summary.status).toBe("blocked")
    expect(report.blockers).toContainEqual(
      expect.objectContaining({
        area: "receipt_token_secret",
        blocker: "Production public receipt token secret is not configured.",
      }),
    )
  })

  it("passes forced release with a strong secret without printing the value", () => {
    const root = makeTempRepo()
    writeReceiptTokenSurface(root)
    const strongSecret = "0123456789abcdef0123456789abcdef"

    const report = evaluatePublicReceiptTokenConfigGate(root, {
      release: "true",
      env: { AQSTOQFLOW_RECEIPT_TOKEN_SECRET: strongSecret },
    })
    const markdown = renderMarkdown(report, "fail")

    expect(report.summary.status).toBe("ready")
    expect(report.summary.secretConfigured).toBe(true)
    expect(report.summary.secretVariable).toBe("AQSTOQFLOW_RECEIPT_TOKEN_SECRET")
    expect(markdown).not.toContain(strongSecret)
    expect(markdown).toContain("Secret value printed: no")
  })

  it("blocks production-like auto release when the configured secret is weak", () => {
    const root = makeTempRepo()
    writeReceiptTokenSurface(root)

    const report = evaluatePublicReceiptTokenConfigGate(root, {
      release: "auto",
      env: {
        NODE_ENV: "production",
        RECEIPT_TOKEN_SECRET: "short-secret",
      },
    })

    expect(report.releaseRequired).toBe(true)
    expect(report.summary.status).toBe("blocked")
    expect(report.blockers).toContainEqual(
      expect.objectContaining({
        area: "receipt_token_secret",
        variable: "RECEIPT_TOKEN_SECRET",
      }),
    )
  })

  it("detects production and explicit release environment signals", () => {
    expect(isReleaseEnvironment({ NODE_ENV: "production" })).toBe(true)
    expect(isReleaseEnvironment({ VERCEL_ENV: "production" })).toBe(true)
    expect(isReleaseEnvironment({ AQSTOQFLOW_RELEASE_MODE: "release" })).toBe(true)
    expect(isReleaseEnvironment({ NODE_ENV: "development" })).toBe(false)
  })

  it("parses gate arguments including release aliases", () => {
    expect(parseArgs(["node", "script", "--mode", "fail", "--release", "true"])).toMatchObject({
      mode: "fail",
      release: "true",
    })
    expect(parseArgs(["node", "script", "--mode", "fail", "--release", "on"])).toMatchObject({
      mode: "fail",
      release: "on",
    })
    expect(parseArgs(["node", "script", "--mode", "report", "--release", "off"])).toMatchObject({
      mode: "report",
      release: "off",
    })
  })

  it("treats release on/off aliases as explicit enforcement controls", () => {
    const root = makeTempRepo()
    writeReceiptTokenSurface(root)

    expect(evaluatePublicReceiptTokenConfigGate(root, {
      release: "on",
      env: { NODE_ENV: "development" },
    }).releaseRequired).toBe(true)

    expect(evaluatePublicReceiptTokenConfigGate(root, {
      release: "off",
      env: { NODE_ENV: "production" },
    }).releaseRequired).toBe(false)
  })

  it("wires the release-only package command without hard-blocking local policy gates", () => {
    const packageJson = require("../../package.json")

    expect(packageJson.scripts["receipt:token:config-gate"]).toBe(
      "node scripts/public-receipt-token-config-gate.js --mode fail --release auto",
    )
    expect(packageJson.scripts["receipt:token:config-gate:release"]).toBe(
      "node scripts/public-receipt-token-config-gate.js --mode fail --release on",
    )
    expect(packageJson.scripts["verify:release"]).toContain("npm run verify:repo")
    expect(packageJson.scripts["verify:release"]).toContain("npm run receipt:token:config-gate:release")
    expect(packageJson.scripts["policy:gates"]).toContain("npm run receipt:token:config-gate")
    expect(packageJson.scripts["policy:gates"]).not.toContain("receipt:token:config-gate:release")
  })
})
