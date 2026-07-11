const fs = require("fs")
const path = require("path")

const DEFAULT_JSON_OUT = "what-next/api-route-guard-inventory.json"
const DEFAULT_MARKDOWN_OUT = "what-next/api-route-guard-inventory.md"
const VALID_MODES = new Set(["report", "warn", "fail"])

function parseArgs(argv = process.argv) {
  const args = { mode: "report", out: DEFAULT_MARKDOWN_OUT, jsonOut: DEFAULT_JSON_OUT }
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--mode") args.mode = argv[++index] || "report"
    else if (arg === "--out") args.out = argv[++index] || DEFAULT_MARKDOWN_OUT
    else if (arg === "--json-out") args.jsonOut = argv[++index] || DEFAULT_JSON_OUT
    else if (arg === "--root") args.root = argv[++index]
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (!VALID_MODES.has(args.mode)) {
    throw new Error(`Unsupported mode: ${args.mode}`)
  }
  return args
}

function walk(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue
      walk(absolute, predicate, results)
      continue
    }
    if (predicate(absolute)) results.push(absolute)
  }
  return results
}

function toRepoPath(root, absolutePath) {
  return path.relative(root, absolutePath).replace(/\\/g, "/")
}

function extractMethods(source) {
  const methods = Array.from(source.matchAll(/export\s+(?:const|async\s+function|function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)).map((match) => match[1])
  return methods.length ? Array.from(new Set(methods)) : ["handler"]
}

function isReceiptServiceEvidence(file) {
  return file.endsWith("services/pos/receipt.service.ts")
}

function isUploadCoreEvidence(file) {
  return file.endsWith("/api/uploadthing/core.ts")
}

function surfaceKindFor(file) {
  if (isReceiptServiceEvidence(file) || isUploadCoreEvidence(file)) return "guard_evidence"
  return "api_route"
}

function evidenceTargetFor(file) {
  if (isReceiptServiceEvidence(file)) return "app/api/receipts/[receiptId]/route.ts"
  if (isUploadCoreEvidence(file)) return "app/api/uploadthing/route.ts"
  return null
}

function methodsFor(file, source) {
  return surfaceKindFor(file) === "api_route" ? extractMethods(source) : []
}

function extractPermission(source) {
  const match = source.match(/(?:requireAppPermission|requirePermission|hasAppPermission)\([^,]+,\s*["']([^"']+)["']/)
  if (match) return match[1]
  const configMatch = source.match(/permission:\s*["']([^"']+)["']/)
  return configMatch ? configMatch[1] : null
}

function detectGuard(source) {
  if (source.includes("requireApiSessionForCurrentOrg")) return "requireApiSessionForCurrentOrg"
  if (source.includes("requireApiSessionForOrg")) return "requireApiSessionForOrg"
  if (source.includes("requireUploadAuth")) return "requireUploadAuth"
  if (source.includes("assertPublicReceiptAccessToken")) return "assertPublicReceiptAccessToken"
  if (source.includes("requireActivePublicReceiptToken")) return "requireActivePublicReceiptToken"
  if (source.includes("verifyPublicReceiptAccessToken")) return "verifyPublicReceiptAccessToken"
  if (source.includes("requireRbacContext")) return "requireRbacContext"
  if (source.includes("getOptionalRbacContext")) return "getOptionalRbacContext"
  if (source.includes("auth.handler")) return "better-auth-handler"
  return "none"
}

function extractObjectStringOption(source, key) {
  const match = source.match(new RegExp(`${key}:\\s*["']([^"']+)["']`))
  return match ? match[1] : null
}

function extractObjectBooleanOption(source, key) {
  const match = source.match(new RegExp(`${key}:\\s*(true|false)`))
  return match ? match[1] === "true" : null
}

function detectModuleAccess(source) {
  const hasApiModuleAccess = source.includes("requireApiModuleAccess")
  const hasModuleObserve = source.includes("observeModuleAccess")

  if (!hasApiModuleAccess && !hasModuleObserve) {
    return {
      status: "none",
      moduleSlug: null,
      surfaceType: null,
      accessIntent: null,
      mode: null,
      audit: null,
    }
  }

  const mode = extractObjectStringOption(source, "mode") ?? (hasApiModuleAccess ? "enforce" : "observe")
  return {
    status: mode === "enforce" || hasApiModuleAccess ? "enforced" : "observed",
    moduleSlug: extractObjectStringOption(source, "moduleSlug"),
    surfaceType: extractObjectStringOption(source, "surfaceType"),
    accessIntent: extractObjectStringOption(source, "accessIntent") ?? "read",
    mode,
    audit: extractObjectBooleanOption(source, "audit"),
  }
}

function expectedModuleAccessFor(file) {
  if (file.includes("/api/v1/organisations/[id]/items/") || file.includes("/api/v1/organisations/[id]/briefItems/")) {
    return { applicability: "required", expectedModuleSlug: "inventory", reason: "Inventory item APIs expose inventory DTOs." }
  }
  if (isReceiptServiceEvidence(file)) {
    return { applicability: "not_applicable_public_service", expectedModuleSlug: null, reason: "Public receipt service is token-gated and redacted rather than module-entitled." }
  }
  if (file.includes("/api/auth/") || file.includes("/api/security-txt/") || file.includes("/api/receipts/")) {
    return { applicability: "not_applicable_public", expectedModuleSlug: null, reason: "Intentional public/provider/tokenized route." }
  }
  if (file.includes("/api/me/permissions/")) {
    return { applicability: "not_applicable_session_claims", expectedModuleSlug: null, reason: "Returns current RBAC/session claims, not domain module data." }
  }
  if (file.endsWith("/api/v1/organisations/route.ts")) {
    return { applicability: "required", expectedModuleSlug: "settings", reason: "Organization self-service data exposes tenant settings metadata." }
  }
  if (file.includes("/api/uploads/")) {
    return { applicability: "required", expectedModuleSlug: "dashboard", reason: "Tenant-uploaded assets are core dashboard workspace assets, not public content." }
  }
  if (file.endsWith("/api/uploadthing/core.ts")) {
    return { applicability: "required", expectedModuleSlug: "dashboard", reason: "UploadThing middleware owns tenant upload authentication and module access." }
  }
  if (file.endsWith("/api/uploadthing/route.ts")) {
    return { applicability: "delegated_uploadthing_core", expectedModuleSlug: null, reason: "UploadThing route delegates auth and module access to app/api/uploadthing/core.ts middleware." }
  }
  if (file.includes("/api/v1/organisations/")) {
    return { applicability: "review_required", expectedModuleSlug: "settings", reason: "Organization self-service data likely belongs to settings/administration." }
  }
  return { applicability: "review_required", expectedModuleSlug: null, reason: "No deterministic module mapping in report mode." }
}

function classifyRoute(file, source) {
  if (isReceiptServiceEvidence(file)) return "public-receipt-service-evidence"
  if (file.includes("/api/security-txt/")) return "public-intentional"
  if (file.includes("/api/auth/")) return "public-auth-provider"
  if (file.includes("/api/receipts/")) return "public-receipt-lookup"
  if (source.includes("requireApiSessionForCurrentOrg")) return "tenant-scoped"
  if (source.includes("requireApiSessionForOrg")) return "tenant-scoped"
  if (source.includes("createRouteHandler") && file.includes("/api/uploadthing/route.ts")) return "delegated-upload-handler"
  if (source.includes("requireUploadAuth")) return "authenticated-upload"
  if (source.includes("requireRbacContext") || source.includes("getOptionalRbacContext")) return "authenticated"
  return "unclassified"
}

function detectOrgSource(file, source) {
  if (isReceiptServiceEvidence(file)) return "token-bound receipt access"
  if (source.includes("params") && file.includes("organisations/[id]")) return "route params id"
  if (source.includes("requireApiSessionForCurrentOrg")) return "rbac ctx"
  if (source.includes("ctx.orgId")) return "rbac ctx"
  if (source.includes("organizationId")) return "source field"
  return "none"
}

function detectReturnedDataClass(file, source) {
  if (isReceiptServiceEvidence(file)) return "public receipt service payload"
  if (file.includes("receipts")) return "public receipt payload"
  if (file.includes("briefItems")) return "brief inventory item DTO"
  if (file.includes("items")) return "inventory item DTO"
  if (file.includes("uploads")) return "uploaded asset"
  if (file.includes("uploadthing")) return "upload handler"
  if (file.includes("security-txt")) return "security contact policy"
  if (file.includes("auth")) return "auth provider response"
  if (file.includes("permissions")) return "permission claims"
  return source.includes("NextResponse.json") ? "json response" : "response"
}

function detectResponseEnvelope(source) {
  if (source.includes("jsonErrorEnvelopeResponse")) return "success envelope with safe error envelope"
  if (source.includes("jsonErrorResponse") || source.includes("jsonAuthzError")) return "safe route error body"
  if (source.includes("NextResponse.json")) return "NextResponse.json"
  if (source.includes("new Response")) return "Response"
  return "unknown"
}

function responseEnvelopeFor(file, source) {
  return surfaceKindFor(file) === "api_route" ? detectResponseEnvelope(source) : "not_api_response"
}

function detectIssues(file, source, now, moduleAccess, expectedModuleAccess) {
  const issues = []
  if ((file.includes("/items/route.ts") || file.includes("/briefItems/route.ts")) && !source.includes("inventory.items.read")) {
    issues.push("missing_permission_inventory_items_read")
  }
  if (expectedModuleAccess.applicability === "required") {
    if (moduleAccess.status !== "enforced") {
      issues.push(`missing_module_entitlement_${expectedModuleAccess.expectedModuleSlug}`)
    } else if (moduleAccess.moduleSlug !== expectedModuleAccess.expectedModuleSlug) {
      issues.push(`module_entitlement_slug_mismatch_expected_${expectedModuleAccess.expectedModuleSlug}`)
    }
  }
  if (file.includes("/api/receipts/") && !/receiptAccessToken|token|signature|expires|expiry/i.test(source)) {
    issues.push("receipt_lookup_id_based_no_signed_expiry_token")
  }
  if (isReceiptServiceEvidence(file)) {
    const hasPublicReceiptService = source.includes("getPublicSalesReceipt")
    const hasTokenGate = source.includes("assertPublicReceiptAccessToken") || source.includes("requireActivePublicReceiptToken") || source.includes("verifyPublicReceiptAccessToken")
    const hasPublicContactRedaction = /includeCustomerContact:\s*false/.test(source)
    if (hasPublicReceiptService && !hasTokenGate) {
      issues.push("receipt_service_missing_public_token_gate")
    }
    if (hasPublicReceiptService && !hasPublicContactRedaction) {
      issues.push("receipt_service_missing_public_contact_redaction")
    }
    if (/customerEmail:\s*sale\.customer\.email/.test(source)) {
      issues.push("receipt_service_contains_customer_contact_before_public_redaction")
    }
  }
  if (file.includes("security-txt")) {
    const expires = source.match(/Expires:\s*([^\n`]+)/)
    if (expires) {
      const expiresAt = new Date(expires[1].trim())
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt < now) {
        issues.push("stale_security_txt_expires")
      }
    }
  }
  if (file.includes("uploads") && !/path traversal|\.\.|normalize|safe/i.test(source)) {
    issues.push("upload_path_traversal_evidence_needed")
  }
  if (file.includes("/api/uploads/") && !source.includes("getSupportedUploadContentType")) {
    issues.push("upload_mime_allowlist_evidence_needed")
  }
  return issues
}

function negativeCasesFor(record) {
  if (record.classification === "tenant-scoped") {
    return ["unauthenticated", "cross-org", "missing permission", "safe error response"]
  }
  if (record.classification === "public-receipt-lookup") {
    return ["missing token", "blank token", "service token validation failure", "safe error envelope"]
  }
  if (record.classification === "public-receipt-service-evidence") {
    return ["raw receipt-id lookup", "bound-to-other-sale token", "expired/tampered token", "revoked registry row", "public contact redaction"]
  }
  if (record.classification === "authenticated-upload" || record.classification === "delegated-upload-handler") {
    return ["unauthenticated", "cross-org", "path traversal", "unsafe mime"]
  }
  if (record.classification.startsWith("public")) return ["intentional public access", "bounded response"]
  return ["unauthenticated", "safe error response"]
}

function routeRecord(root, absolutePath, now) {
  const file = toRepoPath(root, absolutePath)
  const source = fs.readFileSync(absolutePath, "utf8")
  const moduleAccess = detectModuleAccess(source)
  const expectedModuleAccess = expectedModuleAccessFor(file)
  const record = {
    file,
    surfaceKind: surfaceKindFor(file),
    evidenceFor: evidenceTargetFor(file),
    methods: methodsFor(file, source),
    classification: classifyRoute(file, source),
    guard: detectGuard(source),
    orgSource: detectOrgSource(file, source),
    permission: extractPermission(source),
    moduleAccess: moduleAccess.status,
    moduleSlug: moduleAccess.moduleSlug,
    moduleAccessIntent: moduleAccess.accessIntent,
    moduleAccessMode: moduleAccess.mode,
    moduleAccessAudit: moduleAccess.audit,
    expectedModuleSlug: expectedModuleAccess.expectedModuleSlug,
    moduleApplicability: expectedModuleAccess.applicability,
    moduleApplicabilityReason: expectedModuleAccess.reason,
    returnedDataClass: detectReturnedDataClass(file, source),
    negativeCases: [],
    responseEnvelope: responseEnvelopeFor(file, source),
    issues: detectIssues(file, source, now, moduleAccess, expectedModuleAccess),
  }
  record.negativeCases = negativeCasesFor(record)
  return record
}

function gateStatusForIssueCount(issueCount) {
  return issueCount > 0 ? "blocked" : "ready"
}

function gateResultForReport(report, mode = "report") {
  const issueCount = report.summary.issueCount
  const status = gateStatusForIssueCount(issueCount)
  const exitCode = mode === "fail" && issueCount > 0 ? 1 : 0
  return {
    mode,
    status,
    exitCode,
    issueCount,
    message: issueCount > 0
      ? `API route guard inventory found ${issueCount} active issue(s).`
      : "API route guard inventory found no active issues.",
  }
}

function buildApiRouteGuardInventory(root = process.cwd(), options = {}) {
  const now = options.now ? new Date(options.now) : new Date()
  const routeRoot = path.join(root, "app/api")
  const routeFiles = walk(routeRoot, (file) => file.endsWith(`${path.sep}route.ts`))
  const uploadCore = path.join(root, "app/api/uploadthing/core.ts")
  if (fs.existsSync(uploadCore)) routeFiles.push(uploadCore)
  const receiptService = path.join(root, "services/pos/receipt.service.ts")
  if (fs.existsSync(receiptService)) routeFiles.push(receiptService)

  const records = routeFiles
    .map((file) => routeRecord(root, file, now))
    .sort((a, b) => a.file.localeCompare(b.file))
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: options.mode || "report",
    routeCount: records.filter((record) => record.surfaceKind === "api_route").length,
    supportEvidenceCount: records.filter((record) => record.surfaceKind !== "api_route").length,
    evidenceFileCount: records.length,
    bySurfaceKind: countBy(records, "surfaceKind"),
    byClassification: countBy(records, "classification"),
    byModuleAccess: countBy(records, "moduleAccess"),
    byModuleApplicability: countBy(records, "moduleApplicability"),
    issueCount: records.reduce((count, record) => count + record.issues.length, 0),
    issues: records.flatMap((record) => record.issues.map((issue) => ({ file: record.file, issue }))),
  }
  summary.status = gateStatusForIssueCount(summary.issueCount)

  return { summary, records }
}

function countBy(records, field) {
  return records.reduce((acc, record) => {
    const key = record[field] || "unknown"
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function modeDescription(mode) {
  if (mode === "fail") return "Fail mode: this inventory exits non-zero when active guard issues are present."
  if (mode === "warn") return "Warn mode: this inventory reports active guard issues without blocking."
  return "Report mode: this inventory is read-only and does not enforce route behavior."
}

function renderMarkdown(report) {
  const lines = [
    "# API Route Guard Inventory",
    "",
    modeDescription(report.summary.mode),
    "",
    "## Summary",
    "",
    `- Generated at: ${report.summary.generatedAt}`,
    `- Status: ${report.summary.status}`,
    `- Mode: ${report.summary.mode}`,
    `- API routes inventoried: ${report.summary.routeCount}`,
    `- Supporting guard evidence files inventoried: ${report.summary.supportEvidenceCount}`,
    `- Evidence files inventoried: ${report.summary.evidenceFileCount}`,
    `- Surface kind: ${Object.entries(report.summary.bySurfaceKind).map(([key, count]) => `${key}=${count}`).join(", ")}`,
    `- Issues flagged: ${report.summary.issueCount}`,
    `- Module access: ${Object.entries(report.summary.byModuleAccess).map(([key, count]) => `${key}=${count}`).join(", ")}`,
    `- Module applicability: ${Object.entries(report.summary.byModuleApplicability).map(([key, count]) => `${key}=${count}`).join(", ")}`,
    "",
    "## Issues",
    "",
    ...(report.summary.issues.length ? report.summary.issues.map((item) => `- ${item.file}: ${item.issue}`) : ["- None"]),
    "",
    "## Routes And Evidence",
    "",
    "| File | Surface | Evidence For | Methods | Classification | Guard | Org Source | Permission | Module Access | Module | Expected Module | Module Applicability | Data Class | Response | Issues |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ]

  for (const record of report.records) {
    const methods = record.methods.length ? record.methods.join(", ") : "n/a"
    lines.push(`| ${record.file} | ${record.surfaceKind} | ${record.evidenceFor || ""} | ${methods} | ${record.classification} | ${record.guard} | ${record.orgSource} | ${record.permission || ""} | ${record.moduleAccess} | ${record.moduleSlug || ""} | ${record.expectedModuleSlug || ""} | ${record.moduleApplicability} | ${record.returnedDataClass} | ${record.responseEnvelope} | ${record.issues.join(", ")} |`)
  }

  return `${lines.join("\n")}\n`
}

function writeReport(root, args, report) {
  const jsonTarget = path.join(root, args.jsonOut)
  const markdownTarget = path.join(root, args.out)
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true })
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true })
  fs.writeFileSync(jsonTarget, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8")
}

if (require.main === module) {
  const args = parseArgs(process.argv)
  const root = path.resolve(args.root || process.cwd())
  const report = buildApiRouteGuardInventory(root, { mode: args.mode })
  const gateResult = gateResultForReport(report, args.mode)
  writeReport(root, args, report)
  console.log(`API route guard inventory wrote ${report.summary.evidenceFileCount} records to ${args.jsonOut}`)
  console.log(gateResult.message)
  if (gateResult.exitCode !== 0) {
    for (const item of report.summary.issues) {
      console.error(`${item.file}: ${item.issue}`)
    }
    process.exitCode = gateResult.exitCode
  }
}

module.exports = {
  buildApiRouteGuardInventory,
  gateResultForReport,
  modeDescription,
  parseArgs,
  renderMarkdown,
}
