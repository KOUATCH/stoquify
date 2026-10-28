const fs = require("fs")
const path = require("path")

const SETTINGS_ACTION_PREFIXES = [
  "actions/users/",
  "actions/roles/",
  "actions/organization/",
  "actions/locations/",
  "actions/taxRate/",
  "actions/brands/",
  "actions/categories/",
  "actions/units/",
  "actions/storage/",
]

const IDENTITY_BOUNDARIES = {
  "actions/users/createUser.ts": {
    authorizationBoundary: "public-registration",
    expectedEvidence: ["createOrganizationOwner"],
    status: "allowed-public",
    permissionDisposition: "reviewed-public-exception",
    moduleDisposition: "identity-outside-module-entitlement",
    recommendedAction: "Preserve public registration; assess abuse resistance separately.",
  },
  "actions/users/createInvitedUser.ts": {
    authorizationBoundary: "token-bound-invitation",
    expectedEvidence: ["acceptInvitationWorkflow"],
    status: "allowed-public",
    permissionDisposition: "reviewed-token-exception",
    moduleDisposition: "identity-outside-module-entitlement",
    recommendedAction: "Preserve invitation-token redemption and single-use expiry checks.",
  },
  "actions/users/sendResetLink.ts": {
    authorizationBoundary: "public-reset-request",
    expectedEvidence: ["requestPasswordResetLinkWorkflow", "genericResponse"],
    status: "allowed-public",
    permissionDisposition: "reviewed-public-exception",
    moduleDisposition: "identity-outside-module-entitlement",
    recommendedAction: "Preserve enumeration-resistant responses; assess rate limiting separately.",
  },
  "actions/users/verifyOtp.ts": {
    authorizationBoundary: "otp-bound-verification",
    expectedEvidence: ["verifyEmailOtpWorkflow"],
    status: "allowed-public",
    permissionDisposition: "reviewed-token-exception",
    moduleDisposition: "identity-outside-module-entitlement",
    recommendedAction: "Preserve OTP verification and expiry checks in the identity service.",
  },
  "actions/users/updateUserPassword.ts": {
    authorizationBoundary: "mixed-protected-and-token-bound",
    expectedEvidence: [
      "requireRbacContext",
      "requirePermission",
      "requireFreshAuth",
      "changeUserPasswordWorkflow",
      "completePasswordResetWorkflow",
    ],
    status: "protected-mixed",
    permissionDisposition: "required-and-present",
    moduleDisposition: "settings-protected-plus-identity-token",
    recommendedAction: "Keep protected password changes separate from token-bound reset completion.",
  },
}

const FRESH_AUTH_EXPECTED = new Set([
  "actions/users/deleteUser.ts",
  "actions/users/sendInvite.ts",
  "actions/users/updateUserPassword.ts",
  "actions/roles/createRole.ts",
  "actions/roles/updateRole.ts",
  "actions/organization/organization-settings-actions.ts",
])

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    repo: process.cwd(),
    inventory: "what-next/module-surface-inventory.json",
    jsonOut: "what-next/settings-surface-classification.json",
    markdownOut: "what-next/settings-surface-classification.md",
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--repo") options.repo = argv[++index]
    else if (value === "--inventory") options.inventory = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else if (value === "--md-out") options.markdownOut = argv[++index]
    else if (value === "--help") options.help = true
    else throw new Error(`Unknown argument: ${value}`)
  }

  return options
}

function resolveFromRepo(repo, target) {
  return path.isAbsolute(target) ? target : path.join(repo, target)
}

function readJson(target) {
  return JSON.parse(fs.readFileSync(target, "utf8"))
}

function hasUseServer(source) {
  return /^\s*["']use server["'];?/m.test(source)
}

function isPureReExport(source) {
  const remaining = source
    .replace(/^\s*["']use server["'];?\s*/gm, "")
    .replace(/export\s+\*\s+from\s+["'][^"']+["'];?\s*/g, "")
    .replace(/export\s+\{[\s\S]*?\}\s+from\s+["'][^"']+["'];?\s*/g, "")
    .replace(/\/\/.*$/gm, "")
    .trim()
  return remaining.length === 0 && /export\s+(?:\*|\{)/.test(source)
}

function isDelegatingShim(source) {
  const remaining = source
    .replace(/^\s*["']use server["'];?\s*/gm, "")
    .replace(/import\s+[\s\S]*?\s+from\s+["'][^"']+["'];?\s*/g, "")
    .replace(/export\s+\{[^}]+\};?\s*/g, "")
    .replace(/export\s+default\s+[A-Za-z_$][\w$]*;?\s*/g, "")
    .replace(/\/\/.*$/gm, "")
    .trim()
  return remaining.length === 0 && /\bimport\b/.test(source) && /\bexport\b/.test(source)
}

function markerList(source, markers) {
  return markers.filter((marker) => source.includes(marker))
}

function hasProtectCall(source) {
  return source.includes("protect(") || source.includes("protect<")
}

function countBy(records, field) {
  return records.reduce((counts, record) => {
    const key = record[field] || "unknown"
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
}

function isSettingsCandidate(record) {
  if (record.surfaceType !== "action") return false
  if (record.moduleSlug === "settings") return true
  return SETTINGS_ACTION_PREFIXES.some((prefix) => record.file.startsWith(prefix))
}

function classifyRecord(repo, inventoryRecord) {
  const sourcePath = resolveFromRepo(repo, inventoryRecord.file)
  const sourceExists = fs.existsSync(sourcePath)
  const source = sourceExists ? fs.readFileSync(sourcePath, "utf8") : ""
  const findings = []
  const guardMarkers = markerList(source, [
    "requirePermission(",
    "requireAnyPermission(",
    "requireAllPermissions(",
    "requireRbacContext(",
    "checkPermission(",
  ])
  if (hasProtectCall(source)) guardMarkers.push("protect(")
  const tenantMarkers = markerList(source, [
    "assertCanUseOrganization(",
    "resolveActionOrganization(",
    "requireMatchingOrganization(",
    "ctx.orgId",
    "actor.organizationId",
    "user.organizationId",
    "session.user.organizationId",
  ])
  const legacyAuthMarkers = markerList(source, [
    "getAuthenticatedUser(",
    "getSession(",
  ])
  const moduleObserve = source.includes("observeModuleAccess(")
  const freshAuth = source.includes("requireFreshAuth(")
  const registeredBoundary = IDENTITY_BOUNDARIES[inventoryRecord.file]

  const record = {
    file: inventoryRecord.file,
    sourceExists,
    sourceInventory: {
      moduleSlug: inventoryRecord.moduleSlug || null,
      permission: inventoryRecord.permission || null,
      guard: inventoryRecord.guard || "none",
      classification: inventoryRecord.classification || "",
      observeOrEnforce: inventoryRecord.observeOrEnforce || "report-only",
    },
    executionBoundary: "server-action",
    authorizationBoundary: "unresolved-executable",
    status: "review-required",
    permissionDisposition: "unresolved",
    moduleDisposition: inventoryRecord.moduleSlug || "unmapped",
    guardMarkers,
    tenantMarkers,
    freshAuth: freshAuth ? "present" : "not-detected",
    moduleObserve: moduleObserve ? "present" : "not-detected",
    findings,
    recommendedAction: "Identify and enforce the correct trusted authorization boundary.",
  }

  if (!sourceExists) {
    findings.push("source-file-missing")
    return record
  }

  if (isPureReExport(source) || isDelegatingShim(source)) {
    record.executionBoundary = "delegated-re-export"
    record.authorizationBoundary = "delegated-re-export"
    record.status = "delegated"
    record.permissionDisposition = "inherited-from-delegate"
    record.moduleDisposition = "inherited-from-delegate"
    record.freshAuth = "inherited-from-delegate"
    record.moduleObserve = "inherited-from-delegate"
    record.recommendedAction = "Inspect and classify the delegated implementation instead of this shim."
    return record
  }

  if (!hasUseServer(source)) {
    record.executionBoundary = "helper-module"
    record.authorizationBoundary = "helper-module"
    record.status = "helper"
    record.permissionDisposition = "not-applicable"
    record.moduleDisposition = "not-an-executable-surface"
    record.freshAuth = "not-applicable"
    record.moduleObserve = "not-applicable"
    record.recommendedAction = "Exclude this file from executable action permission findings."
    return record
  }

  if (registeredBoundary) {
    Object.assign(record, {
      authorizationBoundary: registeredBoundary.authorizationBoundary,
      status: registeredBoundary.status,
      permissionDisposition: registeredBoundary.permissionDisposition,
      moduleDisposition: registeredBoundary.moduleDisposition,
      recommendedAction: registeredBoundary.recommendedAction,
    })

    const missingEvidence = registeredBoundary.expectedEvidence.filter((item) => !source.includes(item))
    if (missingEvidence.length > 0) {
      findings.push(...missingEvidence.map((item) => `registered-boundary-evidence-missing:${item}`))
      record.status = "review-required"
    }
  } else if (legacyAuthMarkers.length > 0) {
    const hasManualPermissionEvidence = source.includes("PERMISSIONS.") || source.includes("user.permissions")
    record.authorizationBoundary = "legacy-manual-auth"
    record.status = "review-required"
    record.permissionDisposition = hasManualPermissionEvidence ? "legacy-manual-permission" : "legacy-authentication-only"
    record.moduleDisposition = moduleObserve ? "module-observed" : inventoryRecord.moduleSlug || "module-not-detected"
    record.recommendedAction = "Migrate the legacy session boundary to requirePermission, trusted tenant context, and module observation."
    findings.push("legacy-auth-boundary-requires-canonical-rbac")
    if (!hasManualPermissionEvidence) findings.push("canonical-permission-not-enforced")
    if (!moduleObserve) findings.push("module-observe-not-detected")
  } else if (guardMarkers.some((marker) => marker !== "requireRbacContext(")) {
    record.authorizationBoundary = "rbac-protected"
    record.status = "protected"
    record.permissionDisposition = inventoryRecord.permission ? "required-and-present" : "permission-not-extracted"
    record.moduleDisposition = moduleObserve ? "module-observed" : inventoryRecord.moduleSlug || "module-not-detected"
    record.recommendedAction = "Retain the trusted RBAC boundary and verify tenant and module evidence."
    if (!inventoryRecord.permission) findings.push("canonical-permission-not-extracted")
  } else if (guardMarkers.includes("requireRbacContext(")) {
    record.authorizationBoundary = "authenticated-self-service"
    record.status = "protected"
    record.permissionDisposition = "authenticated-context"
    record.moduleDisposition = moduleObserve ? "module-observed" : inventoryRecord.moduleSlug || "module-not-detected"
    record.recommendedAction = "Verify that every target remains limited to the authenticated actor."
  } else {
    findings.push("executable-action-without-approved-auth-boundary")
  }

  if (FRESH_AUTH_EXPECTED.has(inventoryRecord.file) && !freshAuth) {
    findings.push("expected-fresh-auth-not-detected")
  }

  if (["rbac-protected", "authenticated-self-service", "mixed-protected-and-token-bound"].includes(record.authorizationBoundary)) {
    if (tenantMarkers.length === 0) findings.push("trusted-tenant-evidence-not-detected")
    if (!moduleObserve && inventoryRecord.moduleSlug === "settings") findings.push("settings-module-observe-not-detected")
  }

  if (findings.length > 0) record.status = "review-required"
  return record
}

function classifyInventory(repo, inventory) {
  if (!inventory || !Array.isArray(inventory.records)) {
    throw new Error("Inventory JSON must contain a records array")
  }

  const records = inventory.records
    .filter(isSettingsCandidate)
    .map((record) => classifyRecord(repo, record))
    .sort((left, right) => left.file.localeCompare(right.file))

  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: "report-only",
      sourceInventoryGeneratedAt: inventory.summary?.generatedAt || null,
      recordCount: records.length,
      activeFindingCount: records.filter((record) => record.status === "review-required").length,
      byStatus: countBy(records, "status"),
      byExecutionBoundary: countBy(records, "executionBoundary"),
      byAuthorizationBoundary: countBy(records, "authorizationBoundary"),
    },
    records,
  }
}

function renderMarkdown(report) {
  const active = report.records.filter((record) => record.status === "review-required")
  const exceptions = report.records.filter((record) => record.status === "allowed-public")
  const helpers = report.records.filter((record) => ["helper", "delegated"].includes(record.status))
  const lines = [
    "# Stoquify Settings Surface Classification",
    "",
    "Report-only evidence. This artifact does not enable module entitlement enforcement or modify business actions.",
    "",
    "## Summary",
    "",
    `- Generated at: ${report.summary.generatedAt}`,
    `- Source inventory generated at: ${report.summary.sourceInventoryGeneratedAt || "unknown"}`,
    `- Classified records: ${report.summary.recordCount}`,
    `- Active review findings: ${report.summary.activeFindingCount}`,
    ...Object.entries(report.summary.byStatus).sort().map(([key, value]) => `- Status ${key}: ${value}`),
    "",
    "## Reviewed Public And Token Boundaries",
    "",
    "| File | Authorization boundary | Disposition |",
    "|---|---|---|",
    ...exceptions.map((record) => `| ${record.file} | ${record.authorizationBoundary} | ${record.recommendedAction} |`),
    "",
    "## Non-Executable Helpers",
    "",
    "| File | Execution boundary | Disposition |",
    "|---|---|---|",
    ...helpers.map((record) => `| ${record.file} | ${record.executionBoundary} | ${record.recommendedAction} |`),
    "",
    "## Active Findings",
    "",
    "| File | Authorization boundary | Findings | Recommended action |",
    "|---|---|---|---|",
    ...active.map((record) => `| ${record.file} | ${record.authorizationBoundary} | ${record.findings.join("; ")} | ${record.recommendedAction} |`),
    "",
    "## Complete Classification",
    "",
    "| File | Execution | Authorization | Status | Permission | Module | Fresh auth | Tenant evidence | Module observe |",
    "|---|---|---|---|---|---|---|---|---|",
    ...report.records.map((record) => `| ${record.file} | ${record.executionBoundary} | ${record.authorizationBoundary} | ${record.status} | ${record.permissionDisposition} | ${record.moduleDisposition} | ${record.freshAuth} | ${record.tenantMarkers.join("; ") || "not-detected"} | ${record.moduleObserve} |`),
    "",
  ]
  return `${lines.join("\n")}\n`
}

function writeReport(repo, options, report) {
  const jsonTarget = resolveFromRepo(repo, options.jsonOut)
  const markdownTarget = resolveFromRepo(repo, options.markdownOut)
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true })
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true })
  fs.writeFileSync(jsonTarget, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8")
  return { jsonTarget, markdownTarget }
}

function usage() {
  return "Usage: node classify-settings-surfaces.js [--repo <path>] [--inventory <path>] [--json-out <path>] [--md-out <path>]"
}

if (require.main === module) {
  try {
    const options = parseArgs()
    if (options.help) {
      console.log(usage())
      process.exit(0)
    }
    const repo = path.resolve(options.repo)
    const inventory = readJson(resolveFromRepo(repo, options.inventory))
    const report = classifyInventory(repo, inventory)
    const outputs = writeReport(repo, options, report)
    console.log(`Classified ${report.summary.recordCount} settings surfaces; ${report.summary.activeFindingCount} require review.`)
    console.log(`JSON: ${outputs.jsonTarget}`)
    console.log(`Markdown: ${outputs.markdownTarget}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

module.exports = {
  classifyInventory,
  classifyRecord,
  isDelegatingShim,
  isSettingsCandidate,
  parseArgs,
  renderMarkdown,
}

