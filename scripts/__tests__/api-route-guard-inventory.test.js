const fs = require("fs")
const { spawnSync } = require("child_process")
const os = require("os")
const path = require("path")

const {
  buildApiRouteGuardInventory,
  gateResultForReport,
  modeDescription,
  parseArgs,
  renderMarkdown,
} = require("../api-route-guard-inventory")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "api-route-guard-inventory-"))
}

function writeFile(root, relativePath, content) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content, "utf8")
}

function scriptPath() {
  return path.join(__dirname, "..", "api-route-guard-inventory.js")
}

describe("api route guard inventory", () => {
  it("classifies tenant, public, upload, and receipt evidence in report mode", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "app/api/v1/organisations/[id]/items/route.ts",
      `
      import { requireApiSessionForOrg, requireAppPermission } from "@/lib/security/server-authz"
      export const GET = async (_request, { params }) => {
        const authz = await requireApiSessionForOrg((await params).id)
        requireAppPermission(authz.session.user, "inventory.items.read")
        return NextResponse.json({ data: [] })
      }
      `,
    )
    writeFile(
      root,
      "app/api/receipts/[receiptId]/route.ts",
      `export async function GET() { return NextResponse.json({ success: true }) }`,
    )
    writeFile(
      root,
      "app/api/security-txt/route.ts",
      "export function GET() { return new Response(`Contact: mailto:security@example.test\nExpires: 2025-12-31`) }",
    )
    writeFile(
      root,
      "app/api/uploadthing/core.ts",
      `export async function requireUploadAuth() { return true }`,
    )
    writeFile(
      root,
      "services/pos/receipt.service.ts",
      `return { receipt: { customerEmail: sale.customer.email, customerPhone: "" } }`,
    )

    const report = buildApiRouteGuardInventory(root, { mode: "report", now: "2026-07-02T00:00:00.000Z" })
    const items = report.records.find((record) => record.file.endsWith("items/route.ts"))
    const receipt = report.records.find((record) => record.file.includes("api/receipts"))
    const securityTxt = report.records.find((record) => record.file.includes("security-txt"))
    const markdown = renderMarkdown(report)

    expect(items).toMatchObject({
      classification: "tenant-scoped",
      guard: "requireApiSessionForOrg",
      permission: "inventory.items.read",
      moduleAccess: "none",
      expectedModuleSlug: "inventory",
      moduleApplicability: "required",
    })
    expect(items.issues).not.toContain("missing_permission_inventory_items_read")
    expect(items.issues).toContain("missing_module_entitlement_inventory")
    expect(report.summary.byModuleApplicability.required).toBe(2)
    expect(receipt.issues).toContain("receipt_lookup_id_based_no_signed_expiry_token")
    expect(securityTxt.issues).toContain("stale_security_txt_expires")
    expect(markdown).toContain("Report mode")
    expect(markdown).toContain("Module Access")
    expect(markdown).toContain("Status: blocked")
  })

  it("describes report, warn, and fail inventory modes accurately", () => {
    expect(modeDescription("report")).toContain("read-only")
    expect(modeDescription("warn")).toContain("without blocking")
    expect(modeDescription("fail")).toContain("exits non-zero")
  })

  it("returns a failing gate result in fail mode when active issues exist", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "app/api/v1/organisations/[id]/items/route.ts",
      `export async function GET(_request, { params }) {
        return NextResponse.json({ data: [] })
      }`,
    )

    const report = buildApiRouteGuardInventory(root, { mode: "fail", now: "2026-07-02T00:00:00.000Z" })

    expect(report.summary.status).toBe("blocked")
    expect(gateResultForReport(report, "fail")).toMatchObject({
      mode: "fail",
      status: "blocked",
      exitCode: 1,
      issueCount: 2,
    })
    expect(gateResultForReport(report, "warn")).toMatchObject({
      mode: "warn",
      status: "blocked",
      exitCode: 0,
      issueCount: 2,
    })
  })

  it("fails the CLI in fail mode when inventory issues exist", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "services/pos/receipt.service.ts",
      `export async function getPublicSalesReceipt(rawInput) {
        return { receipt: { customerEmail: sale.customer.email } }
      }`,
    )

    const result = spawnSync(process.execPath, [
      scriptPath(),
      "--root",
      root,
      "--mode",
      "fail",
      "--out",
      "guard.md",
      "--json-out",
      "guard.json",
    ], { encoding: "utf8" })

    const written = JSON.parse(fs.readFileSync(path.join(root, "guard.json"), "utf8"))

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("API route guard inventory found 3 active issue")
    expect(result.stderr).toContain("receipt_service_missing_public_token_gate")
    expect(written.summary.status).toBe("blocked")
    expect(written.summary.issueCount).toBe(3)
  })

  it("passes the CLI in fail mode when inventory is clean", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "app/api/receipts/[receiptId]/route.ts",
      `export async function GET(request) {
        const receiptAccessToken = new URL(request.url).searchParams.get("token") || undefined
        return NextResponse.json({ success: true, receiptAccessToken })
      }`,
    )
    writeFile(
      root,
      "services/pos/receipt.service.ts",
      `import { assertPublicReceiptAccessToken } from "@/services/pos/public-receipt-token-registry.service"
      export async function getPublicSalesReceipt(rawInput) {
        await assertPublicReceiptAccessToken({ token: "token", salesOrderId: "sale-1" })
        return findSalesReceipt("sale-1", "org-1", { includeCustomerContact: false })
      }`,
    )

    const result = spawnSync(process.execPath, [
      scriptPath(),
      "--root",
      root,
      "--mode",
      "fail",
      "--out",
      "guard.md",
      "--json-out",
      "guard.json",
    ], { encoding: "utf8" })

    const written = JSON.parse(fs.readFileSync(path.join(root, "guard.json"), "utf8"))

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("API route guard inventory found no active issues")
    expect(result.stderr).toBe("")
    expect(written.summary.status).toBe("ready")
    expect(written.summary.issueCount).toBe(0)
  })

  it("does not flag inventory item APIs once module entitlement is enforced", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "app/api/v1/organisations/[id]/items/route.ts",
      `
      import { requireApiModuleAccess, requireApiSessionForOrg, requireAppPermission } from "@/lib/security/server-authz"
      export const GET = async (_request, { params }) => {
        const orgId = (await params).id
        const authz = await requireApiSessionForOrg(orgId)
        await requireApiModuleAccess({
          organizationId: orgId,
          user: authz.session.user,
          moduleSlug: "inventory",
          surfaceType: "api",
          accessIntent: "read",
          audit: true,
        })
        requireAppPermission(authz.session.user, "inventory.items.read")
        return NextResponse.json({ data: [] })
      }
      `,
    )

    const report = buildApiRouteGuardInventory(root, { mode: "report", now: "2026-07-02T00:00:00.000Z" })
    const items = report.records.find((record) => record.file.endsWith("items/route.ts"))

    expect(items).toMatchObject({
      moduleAccess: "enforced",
      moduleSlug: "inventory",
      moduleAccessIntent: "read",
      moduleAccessMode: "enforce",
      moduleAccessAudit: true,
      expectedModuleSlug: "inventory",
      moduleApplicability: "required",
    })
    expect(items.issues).not.toContain("missing_module_entitlement_inventory")
    expect(report.summary.issueCount).toBe(0)
    expect(report.summary.byModuleAccess.enforced).toBe(1)
  })

  it("does not flag receipt routes once signed token access is wired", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "app/api/receipts/[receiptId]/route.ts",
      `export async function GET(request, { params }) {
        const receiptAccessToken = new URL(request.url).searchParams.get("token") || undefined
        return NextResponse.json({ success: true, receiptAccessToken })
      }`,
    )

    const report = buildApiRouteGuardInventory(root, { mode: "report", now: "2026-07-02T00:00:00.000Z" })
    const receipt = report.records.find((record) => record.file.includes("api/receipts"))

    expect(receipt.issues).not.toContain("receipt_lookup_id_based_no_signed_expiry_token")
  })


  it("represents the public receipt service as guard evidence for the receipt route", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "app/api/receipts/[receiptId]/route.ts",
      `export async function GET(request, { params }) {
        const receiptAccessToken = new URL(request.url).searchParams.get("token") || undefined
        return NextResponse.json({ success: true, receiptAccessToken })
      }`,
    )
    writeFile(
      root,
      "services/pos/receipt.service.ts",
      `import { assertPublicReceiptAccessToken } from "@/services/pos/public-receipt-token-registry.service"
      export async function getPublicSalesReceipt(rawInput) {
        const input = { salesOrderId: "sale-1", receiptAccessToken: "token" }
        await assertPublicReceiptAccessToken({
          token: input.receiptAccessToken,
          salesOrderId: input.salesOrderId,
        })
        return findSalesReceipt(input.salesOrderId, "org-1", {
          includeCustomerContact: false,
        })
      }`,
    )

    const report = buildApiRouteGuardInventory(root, { mode: "report", now: "2026-07-02T00:00:00.000Z" })
    const route = report.records.find((record) => record.file.includes("app/api/receipts"))
    const service = report.records.find((record) => record.file.endsWith("services/pos/receipt.service.ts"))
    const markdown = renderMarkdown(report)

    expect(report.summary.routeCount).toBe(1)
    expect(report.summary.supportEvidenceCount).toBe(1)
    expect(report.summary.evidenceFileCount).toBe(2)
    expect(report.summary.bySurfaceKind).toEqual({ api_route: 1, guard_evidence: 1 })
    expect(route).toMatchObject({
      surfaceKind: "api_route",
      evidenceFor: null,
      methods: ["GET"],
      classification: "public-receipt-lookup",
      moduleApplicability: "not_applicable_public",
    })
    expect(service).toMatchObject({
      surfaceKind: "guard_evidence",
      evidenceFor: "app/api/receipts/[receiptId]/route.ts",
      methods: [],
      classification: "public-receipt-service-evidence",
      guard: "assertPublicReceiptAccessToken",
      orgSource: "token-bound receipt access",
      moduleApplicability: "not_applicable_public_service",
      responseEnvelope: "not_api_response",
    })
    expect(markdown).toContain("Supporting guard evidence files inventoried: 1")
    expect(markdown).toContain("| services/pos/receipt.service.ts | guard_evidence | app/api/receipts/[receiptId]/route.ts | n/a | public-receipt-service-evidence | assertPublicReceiptAccessToken | token-bound receipt access |")
    expect(markdown).not.toContain("| services/pos/receipt.service.ts | handler |")
  })

  it("classifies the public receipt service when token gate and contact redaction are present", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "services/pos/receipt.service.ts",
      `import { assertPublicReceiptAccessToken } from "@/services/pos/public-receipt-token-registry.service"
      export async function getPublicSalesReceipt(rawInput) {
        const input = { salesOrderId: "sale-1", receiptAccessToken: "token" }
        await assertPublicReceiptAccessToken({
          token: input.receiptAccessToken,
          salesOrderId: input.salesOrderId,
        })
        return findSalesReceipt(input.salesOrderId, "org-1", {
          includeCustomerContact: false,
        })
      }`,
    )

    const report = buildApiRouteGuardInventory(root, { mode: "report", now: "2026-07-02T00:00:00.000Z" })
    const service = report.records.find((record) => record.file.endsWith("services/pos/receipt.service.ts"))

    expect(service).toMatchObject({
      classification: "public-receipt-service-evidence",
      guard: "assertPublicReceiptAccessToken",
      moduleAccess: "none",
      expectedModuleSlug: null,
      moduleApplicability: "not_applicable_public_service",
      returnedDataClass: "public receipt service payload",
      surfaceKind: "guard_evidence",
      evidenceFor: "app/api/receipts/[receiptId]/route.ts",
      methods: [],
      responseEnvelope: "not_api_response",
    })
    expect(service.negativeCases).toEqual(expect.arrayContaining([
      "raw receipt-id lookup",
      "expired/tampered token",
      "revoked registry row",
      "public contact redaction",
    ]))
    expect(service.issues).toEqual([])
  })

  it("flags a public receipt service missing token gate and public contact redaction", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "services/pos/receipt.service.ts",
      `export async function getPublicSalesReceipt(rawInput) {
        return { receipt: { customerEmail: sale.customer.email, customerPhone: sale.customer.phone } }
      }`,
    )

    const report = buildApiRouteGuardInventory(root, { mode: "report", now: "2026-07-02T00:00:00.000Z" })
    const service = report.records.find((record) => record.file.endsWith("services/pos/receipt.service.ts"))

    expect(service).toMatchObject({
      classification: "public-receipt-service-evidence",
      guard: "none",
      moduleApplicability: "not_applicable_public_service",
    })
    expect(service.issues).toEqual(expect.arrayContaining([
      "receipt_service_missing_public_token_gate",
      "receipt_service_missing_public_contact_redaction",
      "receipt_service_contains_customer_contact_before_public_redaction",
    ]))
  })
  it("requires settings module entitlement for the organization self-service API", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "app/api/v1/organisations/route.ts",
      `
      import { requireApiModuleAccess, requireApiSessionForCurrentOrg, requireAppPermission } from "@/lib/security/server-authz"
      export async function GET() {
        const authz = await requireApiSessionForCurrentOrg()
        await requireApiModuleAccess({
          organizationId: authz.organizationId,
          user: authz.session.user,
          moduleSlug: "settings",
          surfaceType: "api",
          accessIntent: "read",
          audit: true,
        })
        requireAppPermission(authz.session.user, "MANAGE_SYSTEM_SETTINGS")
        return NextResponse.json([])
      }
      `,
    )

    const report = buildApiRouteGuardInventory(root, { mode: "report", now: "2026-07-02T00:00:00.000Z" })
    const organization = report.records.find((record) => record.file.endsWith("organisations/route.ts"))

    expect(organization).toMatchObject({
      classification: "tenant-scoped",
      guard: "requireApiSessionForCurrentOrg",
      permission: "MANAGE_SYSTEM_SETTINGS",
      moduleAccess: "enforced",
      moduleSlug: "settings",
      moduleAccessIntent: "read",
      moduleAccessMode: "enforce",
      moduleAccessAudit: true,
      expectedModuleSlug: "settings",
      moduleApplicability: "required",
    })
    expect(organization.issues).not.toContain("missing_module_entitlement_settings")
    expect(report.summary.issueCount).toBe(0)
    expect(report.summary.byModuleApplicability.required).toBe(1)
  })

  it("classifies tenant uploaded assets as dashboard-owned API surfaces", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "app/api/uploads/[...path]/route.ts",
      `
      import { requireApiModuleAccess, requireApiSessionForCurrentOrg, requireAppPermission } from "@/lib/security/server-authz"
      function getSupportedUploadContentType(fileName) { return "image/png" }
      export async function GET(_request, { params }) {
        const fileName = (await params).path[1]
        if (fileName.includes("..")) return new Response("safe invalid path")
        const authz = await requireApiSessionForCurrentOrg()
        await requireApiModuleAccess({
          organizationId: authz.organizationId,
          user: authz.session.user,
          moduleSlug: "dashboard",
          surfaceType: "api",
          accessIntent: "read",
          audit: true,
        })
        requireAppPermission(authz.session.user, "dashboard.read")
        return new Response("ok")
      }
      `,
    )
    writeFile(
      root,
      "app/api/uploadthing/core.ts",
      `
      import { requireApiModuleAccess, requireApiSessionForCurrentOrg, requireAppPermission } from "@/lib/security/server-authz"
      export async function requireUploadAuth() {
        const authz = await requireApiSessionForCurrentOrg()
        await requireApiModuleAccess({
          organizationId: authz.organizationId,
          user: authz.session.user,
          moduleSlug: "dashboard",
          surfaceType: "api",
          accessIntent: "write",
          audit: true,
        })
        requireAppPermission(authz.session.user, "dashboard.read")
      }
      `,
    )
    writeFile(
      root,
      "app/api/uploadthing/route.ts",
      `import { createRouteHandler } from "uploadthing/next"
      import { ourFileRouter } from "./core"
      export const { GET, POST } = createRouteHandler({ router: ourFileRouter })`,
    )

    const report = buildApiRouteGuardInventory(root, { mode: "report", now: "2026-07-02T00:00:00.000Z" })
    const uploads = report.records.find((record) => record.file.includes("api/uploads"))
    const uploadCore = report.records.find((record) => record.file.endsWith("api/uploadthing/core.ts"))
    const uploadRoute = report.records.find((record) => record.file.endsWith("api/uploadthing/route.ts"))

    expect(uploads).toMatchObject({
      classification: "tenant-scoped",
      guard: "requireApiSessionForCurrentOrg",
      orgSource: "rbac ctx",
      permission: "dashboard.read",
      moduleAccess: "enforced",
      moduleSlug: "dashboard",
      moduleAccessIntent: "read",
      expectedModuleSlug: "dashboard",
      moduleApplicability: "required",
    })
    expect(uploadCore).toMatchObject({
      classification: "tenant-scoped",
      guard: "requireApiSessionForCurrentOrg",
      permission: "dashboard.read",
      moduleAccess: "enforced",
      moduleSlug: "dashboard",
      moduleAccessIntent: "write",
      expectedModuleSlug: "dashboard",
      moduleApplicability: "required",
    })
    expect(uploadRoute).toMatchObject({
      classification: "delegated-upload-handler",
      guard: "none",
      expectedModuleSlug: null,
      moduleApplicability: "delegated_uploadthing_core",
    })
    expect(report.summary.issues).toEqual([])
  })

  it("does not flag fresh security.txt or contact-safe public receipt shaping", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "app/api/security-txt/route.ts",
      "export function GET() { return new Response(`Contact: mailto:security@example.test\nExpires: 2027-06-30T23:59:59.000Z`) }",
    )
    writeFile(
      root,
      "app/api/receipts/[receiptId]/route.ts",
      `export async function GET(request) {
        const receiptAccessToken = new URL(request.url).searchParams.get("token") || undefined
        return NextResponse.json({ success: true, receiptAccessToken })
      }`,
    )
    writeFile(
      root,
      "services/pos/receipt.service.ts",
      `return { receipt: { customerEmail: includeCustomerContact ? optionalStringField(sale.customer, "email") || "" : "" } }`,
    )

    const report = buildApiRouteGuardInventory(root, { mode: "report", now: "2026-07-02T00:00:00.000Z" })

    expect(report.summary.issues).toEqual([])
  })
  it("parses report arguments", () => {
    expect(parseArgs(["node", "script", "--root", "tmp", "--mode", "fail", "--out", "api.md", "--json-out", "api.json"])).toEqual({
      mode: "fail",
      root: "tmp",
      out: "api.md",
      jsonOut: "api.json",
    })
  })
})
