const fs = require("fs")
const path = require("path")
const { buildApiRouteGuardInventory } = require("./api-route-guard-inventory")

const DEFAULT_JSON_OUT = "what-next/module-surface-inventory.json"
const DEFAULT_MARKDOWN_OUT = "what-next/module-surface-inventory.md"

function parseArgs(argv = process.argv) {
  const args = { mode: "report", out: DEFAULT_MARKDOWN_OUT, jsonOut: DEFAULT_JSON_OUT, baseline: null }
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--mode") args.mode = argv[++index] || "report"
    if (arg === "--out") args.out = argv[++index] || DEFAULT_MARKDOWN_OUT
    if (arg === "--json-out") args.jsonOut = argv[++index] || DEFAULT_JSON_OUT
    if (arg === "--baseline") args.baseline = argv[++index] || null
  }

  if (!["report", "warn", "fail"].includes(args.mode)) {
    throw new Error("--mode must be one of: report, warn, fail")
  }

  if (args.mode !== "report" && !args.baseline) {
    throw new Error("--baseline is required when --mode is warn or fail")
  }

  return args
}

function readFile(root, relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), "utf8")
  } catch {
    return ""
  }
}

function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath))
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

function matchLast(text, regex) {
  const matches = Array.from(text.matchAll(regex))
  return matches.length ? matches[matches.length - 1][1] : null
}

function matchFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }
  return null
}

function parseModuleCatalog(root) {
  const source = readFile(root, "services/modules/module-catalog.service.ts")
  const slugMatches = Array.from(source.matchAll(/slug:\s*["']([^"']+)["']/g))
  const entries = new Map()

  slugMatches.forEach((match, index) => {
    const slug = match[1]
    const start = match.index || 0
    const end = index + 1 < slugMatches.length ? slugMatches[index + 1].index || source.length : source.length
    const block = source.slice(start, end)
    const routeBlock = block.match(/routePrefixes:\s*\[([\s\S]*?)\]/)
    const routePrefixes = routeBlock
      ? Array.from(routeBlock[1].matchAll(/["']([^"']+)["']/g)).map((item) => item[1])
      : []
    const dependencyBlock = block.match(/dependencies:\s*\[([\s\S]*?)\]/)
    const dependencies = dependencyBlock
      ? Array.from(dependencyBlock[1].matchAll(/dependsOnSlug:\s*["']([^"']+)["']/g)).map((item) => item[1])
      : []
    entries.set(slug, { slug, routePrefixes, dependencies })
  })

  return entries
}

function inferModuleSlug(surface, source, catalog) {
  const explicit = matchFirst(source, [
    /moduleSlug:\s*["']([^"']+)["']/,
    /moduleSlug\s*=\s*["']([^"']+)["']/,
  ])

  const normalizedSurface = surface.replace(/\\/g, "/")
  const routePrefixes = Array.from(catalog.values())
    .flatMap((entry) => entry.routePrefixes.map((prefix) => ({ slug: entry.slug, prefix })))
    .sort((a, b) => b.prefix.length - a.prefix.length)
  const matchedPrefix = routePrefixes.find((entry) => normalizedSurface.startsWith(entry.prefix))
  if (matchedPrefix) return matchedPrefix.slug

  if (normalizedSurface === "modules/module-control.actions.ts") return "settings"

  const fallback = [
    ["inventory", "inventory"],
    ["pos", "pos"],
    ["accounting", "accounting"],
    ["finance", "finance"],
    ["payments", "payment_reconciliation"],
    ["reconciliation", "payment_reconciliation"],
    ["purchasing", "purchasing"],
    ["purchase", "purchasing"],
    ["payroll", "payroll"],
    ["hr", "payroll"],
    ["compliance", "compliance"],
    ["assurance", "compliance"],
    ["settings", "settings"],
    ["analytics", "analytics"],
  ]
  const lowered = normalizedSurface.toLowerCase()
  const match = fallback.find(([needle]) => lowered.startsWith(`${needle}/`) || lowered.includes(`/${needle}`) || lowered.includes(`${needle}.`))
  if (match) return match[1]

  return explicit || null
}

function extractStringList(block) {
  const values = Array.from(block.matchAll(/["']([^"']+)["']/g)).map((match) => match[1])
  return values.length ? values.join(" | ") : null
}

function parsePermissionConstants(root) {
  const source = readFile(root, "lib/permissions.ts")
  const entries = new Map()

  for (const match of source.matchAll(/([A-Z0-9_]+):\s*["']([^"']+)["']/g)) {
    entries.set(`PERMISSIONS.${match[1]}`, match[2])
  }

  return entries
}

function unique(values) {
  const seen = new Set()
  return values.filter((value) => {
    if (!value || seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function returnedStringLiterals(source, functionName) {
  const escapedName = escapeRegExp(functionName)
  const match = source.match(new RegExp(`function\\s+${escapedName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\}`))
  if (!match) return []
  return Array.from(match[1].matchAll(/return\s+["']([^"']+)["']/g)).map((item) => item[1])
}

function extractWrappedPermissions(source) {
  const values = []
  const helperPattern = /function\s+([A-Za-z_$][\w$]*)\s*\(([\s\S]*?)\)\s*\{([\s\S]*?)\n\s*\}/g
  const helpers = Array.from(source.matchAll(helperPattern))
    .map((match) => ({
      name: match[1],
      params: match[2],
      body: match[3],
    }))
    .filter((helper) => /\brequirePermission\(\s*permission\b/.test(helper.body))

  for (const helper of helpers) {
    const defaultPermission = helper.params.match(/\bpermission\s*=\s*["']([^"']+)["']/)
    if (defaultPermission) values.push(defaultPermission[1])

    const escapedName = escapeRegExp(helper.name)
    const literalCallPattern = new RegExp(`\\b${escapedName}\\s*\\(\\s*[^,()\\n]+,\\s*["']([^"']+)["']`, "g")
    for (const match of source.matchAll(literalCallPattern)) values.push(match[1])

    const delegatedCallPattern = new RegExp(`\\b${escapedName}\\s*\\(\\s*[^,()\\n]+,\\s*([A-Za-z_$][\\w$]*)\\s*\\(`, "g")
    for (const match of source.matchAll(delegatedCallPattern)) {
      values.push(...returnedStringLiterals(source, match[1]))
    }
  }

  const permissions = unique(values)
  return permissions.length ? permissions.join(" | ") : null
}

function extractPermission(source) {
  const requireAnyArray = source.match(/requireAnyPermission\(\s*\[([\s\S]*?)\]\s*,/)
  if (requireAnyArray) return extractStringList(requireAnyArray[1])

  const permissionsArray = source.match(/permissions:\s*\[([\s\S]*?)\]\s*,/)
  if (permissionsArray) return extractStringList(permissionsArray[1])

  const financeView = source.match(/permissions:\s*financeViewPermissions\(\s*["']([^"']+)["']\s*\)/)
  if (financeView) return `financeViewPermissions(${financeView[1]})`

  const wrappedPermissions = extractWrappedPermissions(source)
  if (wrappedPermissions) return wrappedPermissions

  return matchFirst(source, [
    /permission:\s*["']([^"']+)["']/,
    /requiredPermission:\s*["']([^"']+)["']/,
    /requirePermission\(\s*["']([^"']+)["']/,
    /checkPermission\(\s*["']([^"']+)["']/,
    /requireAnyPermission\(\s*([^,\n]+)\s*,/,
    /permissions:\s*financeViewPermissions\(\s*["']([^"']+)["']\s*\)/,
    /permissions:\s*([^,\n}]+)\s*,/,
    /protect<[^>]*>\(\s*\{[\s\S]*?permission:\s*["']([^"']+)["']/,
    /protect\(\s*\{[\s\S]*?permission:\s*["']([^"']+)["']/,
  ])
}

function detectGuard(source) {
  if (/FinanceRouteAccess\s*\(/.test(source)) return "FinanceRouteAccess"
  if (/protect(?:<[\s\S]*?>)?\s*\(/.test(source)) return "protect"
  if (source.includes("requireAnyPermission(")) return "requireAnyPermission"
  if (source.includes("requirePermission(")) return "requirePermission"
  if (source.includes("checkPermission(")) return "checkPermission"
  if (source.includes("requireRbacContext(")) return "requireRbacContext"
  if (source.includes("observeModuleAccess")) return "module-observe"
  if (source.includes("filterSidebarLinksByPermission")) return "sidebar-permission-filter"
  return "none"
}

function inferModuleApplicability(file, surface, source) {
  const normalizedFile = (file || "").replace(/\\/g, "/")
  const normalizedSurface = (surface || "").replace(/\\/g, "/")

  if (normalizedFile === "actions/roles/role-utils.ts" || normalizedSurface === "roles/role-utils.ts") {
    return "not applicable: internal display helper"
  }

  if (/^actions\/users\/(createInvitedUser|createUser|sendResetLink|verifyOtp)\.ts$/.test(normalizedFile)) {
    if (source.includes("acceptInvitationWorkflow")) return "not applicable: token-bound invitation acceptance"
    if (source.includes("createOrganizationOwner")) return "not applicable: public organization onboarding"
    if (source.includes("requestPasswordResetLinkWorkflow")) return "not applicable: public password reset request"
    if (source.includes("verifyEmailOtpWorkflow")) return "not applicable: public email verification"
  }

  if (normalizedFile === "services/modules/module-control-contracts.ts") {
    return "not applicable: internal module governance contract"
  }

  return "required"
}

function classify(record, catalog) {
  if (record.moduleApplicability && record.moduleApplicability !== "required") {
    return record.moduleApplicability
  }

  const classes = []
  if (!record.moduleSlug) classes.push("unmapped")
  else if (!catalog.has(record.moduleSlug)) classes.push("unknown slug")
  else classes.push("mapped")

  if (!record.permission && ["navigation", "page", "action", "api", "report", "export"].includes(record.surfaceType)) {
    classes.push("missing permission")
  }
  if (record.surfaceType === "page" && record.guard === "none") classes.push("dashboard-only risk")
  if (record.dependencyGaps.length) classes.push("dependency gap")
  if (record.delegatedTo.length) classes.push("delegated re-export")
  if (record.observeOrEnforce === "report-only") classes.push("enforcement candidate")
  return classes.join(", ")
}

function createRecord(input, catalog) {
  const moduleSlug = input.moduleSlug || inferModuleSlug(input.surface, input.source || "", catalog)
  const dependencies = moduleSlug && catalog.get(moduleSlug) ? catalog.get(moduleSlug).dependencies : []
  const record = {
    file: input.file,
    surface: input.surface,
    surfaceType: input.surfaceType,
    moduleApplicability: input.moduleApplicability || inferModuleApplicability(input.file, input.surface, input.source || ""),
    moduleSlug,
    permission: input.permission || extractPermission(input.source || ""),
    guard: input.guard || detectGuard(input.source || ""),
    observeOrEnforce: input.observeOrEnforce || "report-only",
    dependencyGaps: dependencies || [],
    delegatedTo: input.delegatedTo || [],
    metadata: input.metadata || {},
    classification: "",
  }
  record.classification = classify(record, catalog)
  return record
}

function stripReExportSyntax(source) {
  return source
    .replace(/^\s*["']use server["'];?\s*/gm, "")
    .replace(/export\s+\*\s+from\s+["'][^"']+["'];?\s*/g, "")
    .replace(/export\s+\{[\s\S]*?\}\s+from\s+["'][^"']+["'];?\s*/g, "")
    .replace(/\/\/.*$/gm, "")
    .trim()
}

function pureReExportTargets(root, file, source) {
  const specs = [
    ...Array.from(source.matchAll(/export\s+\*\s+from\s+["']([^"']+)["']/g)).map((match) => match[1]),
    ...Array.from(source.matchAll(/export\s+\{[\s\S]*?\}\s+from\s+["']([^"']+)["']/g)).map((match) => match[1]),
  ]

  if (!specs.length || stripReExportSyntax(source)) return []

  const directory = path.dirname(path.join(root, file))
  const candidatesFor = (spec) => {
    const base = path.resolve(directory, spec)
    return [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      path.join(base, "index.ts"),
      path.join(base, "index.tsx"),
    ]
  }

  return specs
    .filter((spec) => spec.startsWith("."))
    .map((spec) => candidatesFor(spec).find((candidate) => fs.existsSync(candidate)))
    .filter(Boolean)
    .map((target) => toRepoPath(root, target))
}

function sidebarRecords(root, catalog) {
  const file = "config/sidebar.ts"
  const source = readFile(root, file)
  if (!source) return []
  const lines = source.split(/\r?\n/)
  const permissionConstants = parsePermissionConstants(root)
  const records = []

  function sidebarForwardContext(index) {
    const line = lines[index]
    if (line.includes("},") || line.includes("}]")) return line

    const context = [line]
    for (let next = index + 1; next < lines.length; next += 1) {
      context.push(lines[next])
      if (/^  \},?/.test(lines[next])) break
    }
    return context.join("\n")
  }

  function extractSidebarPermission(context) {
    const literal = matchLast(context, /permission:\s*["']([^"']+)["']/g)
    if (literal) return literal

    const constant = matchLast(context, /permission:\s*(PERMISSIONS\.[A-Z0-9_]+)/g)
    if (!constant) return null

    return permissionConstants.get(constant) || constant
  }

  lines.forEach((line, index) => {
    const href = line.match(/href:\s*["']([^"']+)["']/)
    if (!href) return
    const beforeContext = lines.slice(Math.max(0, index - 24), index + 1).join("\n")
    const forwardContext = sidebarForwardContext(index)
    const context = `${beforeContext}\n${forwardContext}`
    records.push(createRecord({
      file,
      surface: href[1],
      surfaceType: "navigation",
      moduleSlug:
        matchLast(line, /moduleSlug:\s*["']([^"']+)["']/g) ||
        matchLast(forwardContext, /moduleSlug:\s*["']([^"']+)["']/g) ||
        matchLast(beforeContext, /moduleSlug:\s*["']([^"']+)["']/g),
      permission:
        extractSidebarPermission(line) ||
        extractSidebarPermission(forwardContext) ||
        extractSidebarPermission(beforeContext),
      guard: "sidebar-permission-filter",
      source: context,
    }, catalog))
  })

  return records
}

function dashboardRoute(surfaceFile) {
  return surfaceFile
    .replace(/^app\/\[locale\]\/\(dashboard\)\/dashboard/, "/dashboard")
    .replace(/\/page\.tsx$/, "")
    .replace(/\/layout\.tsx$/, "")
    .replace(/\/route\.tsx$/, "") || "/dashboard"
}

function dashboardRecords(root, catalog) {
  const dashboardRoot = path.join(root, "app/[locale]/(dashboard)/dashboard")
  return walk(dashboardRoot, (file) => /(?:page|layout)\.tsx$/.test(file) && !file.includes("__tests__"))
    .map((absolute) => {
      const file = toRepoPath(root, absolute)
      const source = fs.readFileSync(absolute, "utf8")
      return createRecord({
        file,
        surface: dashboardRoute(file),
        surfaceType: file.endsWith("layout.tsx") ? "layout" : "page",
        source,
      }, catalog)
    })
}

function actionRecords(root, catalog) {
  const actionsRoot = path.join(root, "actions")
  return walk(actionsRoot, (file) => /\.(ts|tsx)$/.test(file) && !file.includes("__tests__"))
    .map((absolute) => {
      const file = toRepoPath(root, absolute)
      const source = fs.readFileSync(absolute, "utf8")
      const delegatedTo = pureReExportTargets(root, file, source)

      if (delegatedTo.length) {
        const delegatedSource = delegatedTo.map((target) => readFile(root, target)).join("\n")
        const delegatedSurface = delegatedTo[0].replace(/^actions\//, "")
        return createRecord({
          file,
          surface: file.replace(/^actions\//, ""),
          surfaceType: "action",
          moduleSlug: inferModuleSlug(delegatedSurface, delegatedSource, catalog),
          permission: extractPermission(delegatedSource),
          guard: "delegated-re-export",
          source: delegatedSource || source,
          delegatedTo,
        }, catalog)
      }

      return createRecord({
        file,
        surface: file.replace(/^actions\//, ""),
        surfaceType: "action",
        source,
      }, catalog)
    })
}

function moduleServiceRecords(root, catalog) {
  const modulesRoot = path.join(root, "services/modules")
  return walk(modulesRoot, (file) => /\.(ts|tsx)$/.test(file) && !file.includes("__tests__"))
    .map((absolute) => {
      const file = toRepoPath(root, absolute)
      const source = fs.readFileSync(absolute, "utf8")
      return createRecord({
        file,
        surface: file.replace(/^services\/modules\//, ""),
        surfaceType: "module_service",
        source,
        guard: detectGuard(source),
      }, catalog)
    })
}

function apiSurfaceFor(record) {
  if (record.evidenceFor) return record.evidenceFor
  if (record.file.startsWith("app/api/") && record.file.endsWith("/route.ts")) {
    return record.file.replace(/^app\/api/, "/api").replace(/\/route\.ts$/, "")
  }
  if (record.file.startsWith("app/.well-known/") && record.file.endsWith("/route.ts")) {
    return record.file.replace(/^app/, "").replace(/\/route\.ts$/, "")
  }
  return record.file
}

function apiModuleApplicability(record) {
  if (record.moduleApplicability === "required") return "required"
  return record.moduleApplicability || "review_required"
}

function apiRecords(root, catalog) {
  const report = buildApiRouteGuardInventory(root, { mode: "report" })
  return report.records.map((apiRecord) => createRecord({
    file: apiRecord.file,
    surface: apiSurfaceFor(apiRecord),
    surfaceType: apiRecord.surfaceKind === "guard_evidence" ? "api_evidence" : "api",
    moduleApplicability: apiModuleApplicability(apiRecord),
    moduleSlug: apiRecord.moduleSlug || apiRecord.expectedModuleSlug,
    permission: apiRecord.permission,
    guard: apiRecord.guard,
    source: "",
    metadata: {
      apiClassification: apiRecord.classification,
      apiDataClass: apiRecord.returnedDataClass,
      apiEvidenceFor: apiRecord.evidenceFor,
      apiIssues: apiRecord.issues,
      apiMethods: apiRecord.methods,
      apiModuleAccess: apiRecord.moduleAccess,
      apiModuleAccessIntent: apiRecord.moduleAccessIntent,
      apiModuleAccessMode: apiRecord.moduleAccessMode,
      apiOrgSource: apiRecord.orgSource,
      apiResponseEnvelope: apiRecord.responseEnvelope,
      apiSurfaceKind: apiRecord.surfaceKind,
    },
  }, catalog))
}

function isReportFile(file, source) {
  const normalizedFile = file.toLowerCase()
  return (
    normalizedFile.includes("report") ||
    /\b(?:TrialBalance|GeneralLedger|FinancialSummaryReport|CashierPerformanceReport|ItemPerformanceReport|CashFlowReport)\b/.test(source)
  )
}

function isExportSurface(file, source) {
  const normalizedFile = file.toLowerCase()
  return (
    normalizedFile.includes("export") ||
    /\bAccountingExport\b/.test(source) ||
    /permission:\s*["'][^"']*exports?\.[^"']*["']/i.test(source) ||
    /\bexport[A-Za-z0-9_]*Report(?:Action|Protected)?\b/.test(source)
  )
}

function extractPermissionForSurface(source, surfaceType) {
  if (surfaceType === "export") {
    return matchFirst(source, [
      /permission:\s*["']([^"']*exports?[^"']*)["']/i,
      /permission:\s*["']([^"']+)["'][\s\S]{0,260}?auditResource:\s*["'][^"']*Export[^"']*["']/i,
    ]) || extractPermission(source)
  }

  return matchFirst(source, [
    /permission:\s*["']([^"']*reports?[^"']*)["']/i,
    /permission:\s*["']([^"']+)["'][\s\S]{0,260}?auditResource:\s*["'](?:TrialBalance|GeneralLedger|AnalyticsReport|AccountingReport)["']/i,
  ]) || extractPermission(source)
}

function sourceModulesFor(moduleSlug) {
  return moduleSlug ? [moduleSlug] : []
}

function reportExportRecords(root, catalog) {
  const scanTargets = [
    { base: path.join(root, "actions"), prefix: "actions", evidence: false },
    { base: path.join(root, "services"), prefix: "services", evidence: true },
  ]
  const records = []

  for (const target of scanTargets) {
    const files = walk(target.base, (file) => /\.(ts|tsx)$/.test(file) && !file.includes("__tests__"))
    for (const absolute of files) {
      const file = toRepoPath(root, absolute)
      const source = fs.readFileSync(absolute, "utf8")
      const moduleSlug = inferModuleSlug(file.replace(new RegExp(`^${target.prefix}/`), ""), source, catalog)
      const surfaceBase = file.replace(new RegExp(`^${target.prefix}/`), "")
      const sharedMetadata = {
        sourceModules: sourceModulesFor(moduleSlug),
        sourceEvidence: target.evidence ? "service-owned read model" : "protected action boundary",
      }

      if (isReportFile(file, source)) {
        records.push(createRecord({
          file,
          surface: surfaceBase,
          surfaceType: target.evidence ? "report_evidence" : "report",
          moduleApplicability: target.evidence ? "source_inherited_service" : undefined,
          moduleSlug,
          permission: target.evidence ? null : extractPermissionForSurface(source, "report"),
          guard: target.evidence ? detectGuard(source) : undefined,
          source,
          metadata: {
            ...sharedMetadata,
            reportExportKind: "report",
          },
        }, catalog))
      }

      if (isExportSurface(file, source)) {
        records.push(createRecord({
          file,
          surface: surfaceBase,
          surfaceType: target.evidence ? "export_evidence" : "export",
          moduleApplicability: target.evidence ? "source_inherited_service" : undefined,
          moduleSlug,
          permission: target.evidence ? null : extractPermissionForSurface(source, "export"),
          guard: target.evidence ? detectGuard(source) : undefined,
          source,
          metadata: {
            ...sharedMetadata,
            reportExportKind: "export",
            freshAuthEvidence: /freshAuth\s*:/.test(source),
          },
        }, catalog))
      }
    }
  }

  return records
}
function buildModuleSurfaceInventory(root = process.cwd(), options = {}) {
  const catalog = parseModuleCatalog(root)
  const records = [
    ...sidebarRecords(root, catalog),
    ...moduleServiceRecords(root, catalog),
    ...dashboardRecords(root, catalog),
    ...actionRecords(root, catalog),
    ...reportExportRecords(root, catalog),
    ...apiRecords(root, catalog),
  ].sort((a, b) => `${a.surfaceType}:${a.file}:${a.surface}`.localeCompare(`${b.surfaceType}:${b.file}:${b.surface}`))

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: options.mode || "report",
    sourceFiles: {
      sidebar: exists(root, "config/sidebar.ts"),
      moduleCatalog: exists(root, "services/modules/module-catalog.service.ts"),
      dashboardRoot: exists(root, "app/[locale]/(dashboard)/dashboard"),
      actionsRoot: exists(root, "actions"),
      reportExportSurfaces: exists(root, "actions") || exists(root, "services"),
      apiRoutes: exists(root, "app/api") || exists(root, "app/.well-known"),
      apiGuardInventory: exists(root, "scripts/api-route-guard-inventory.js"),
    },
    catalogCount: catalog.size,
    recordCount: records.length,
    bySurfaceType: countBy(records, "surfaceType"),
    byClassification: countClassifications(records),
  }

  return { summary, records }
}

function countBy(records, field) {
  return records.reduce((acc, record) => {
    const key = record[field] || "unknown"
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function countClassifications(records) {
  return records.reduce((acc, record) => {
    for (const item of record.classification.split(", ")) {
      acc[item] = (acc[item] || 0) + 1
    }
    return acc
  }, {})
}

function moduleSurfaceGapFindings(report) {
  if (!report || !Array.isArray(report.records)) {
    throw new Error("Module surface inventory report must include a records array.")
  }

  const findings = []

  for (const record of report.records) {
    if (record.moduleApplicability && record.moduleApplicability !== "required") continue

    const base = {
      surfaceType: record.surfaceType,
      surface: record.surface,
      file: record.file,
      moduleSlug: record.moduleSlug || null,
      permission: record.permission || null,
      guard: record.guard || "none",
      classification: record.classification,
      metadata: record.metadata || {},
    }

    if (!record.moduleSlug) {
      findings.push({
        ...base,
        category: "MODULE_SURFACE_UNMAPPED",
        reason: "Module-required surface has no canonical module owner.",
      })
    }

    if (record.classification.includes("unknown slug")) {
      findings.push({
        ...base,
        category: "MODULE_SURFACE_UNKNOWN_SLUG",
        reason: "Surface references a module slug that is not in the canonical catalog.",
      })
    }

    if (!record.permission && ["navigation", "page", "action", "api", "report", "export"].includes(record.surfaceType)) {
      findings.push({
        ...base,
        category: "MODULE_SURFACE_MISSING_PERMISSION",
        reason: "Protected user-facing surface has no RBAC permission evidence.",
      })
    }

    if (["report", "export"].includes(record.surfaceType)) {
      const sourceModules = Array.isArray(record.metadata?.sourceModules) ? record.metadata.sourceModules : []
      if (!sourceModules.length) {
        findings.push({
          ...base,
          category: "MODULE_SURFACE_REPORT_EXPORT_MISSING_SOURCE_MODULES",
          reason: "Report/export surface has no explicit source module evidence.",
        })
      }
    }
    if (record.surfaceType === "page" && record.guard === "none") {
      findings.push({
        ...base,
        category: "MODULE_SURFACE_PAGE_GUARD_NONE",
        reason: "Dashboard page has no detected server-side guard.",
      })
    }

    if (["action", "api"].includes(record.surfaceType) && record.guard === "none" && (record.permission || record.moduleSlug)) {
      findings.push({
        ...base,
        category: "MODULE_SURFACE_PROTECTED_GUARD_NONE",
        reason: "Module-owned action or API surface has no detected server-side guard.",
      })
    }

    if (record.dependencyGaps.length) {
      findings.push({
        ...base,
        category: "MODULE_SURFACE_DEPENDENCY_GAP",
        reason: "Surface owner module has catalog dependencies that need explicit release review.",
        dependencyGaps: record.dependencyGaps,
      })
    }

    const apiIssues = Array.isArray(record.metadata?.apiIssues) ? record.metadata.apiIssues : []
    for (const issue of apiIssues) {
      findings.push({
        ...base,
        category: "MODULE_SURFACE_API_GUARD_ISSUE",
        reason: "API route guard inventory reported an active module or access-control issue.",
        issue,
      })
    }
  }

  return findings
}

function gapFindingKey(finding) {
  return [
    finding.category,
    finding.surfaceType,
    finding.file,
    finding.surface,
    finding.issue || "",
  ].join("::")
}

function countByCategory(findings) {
  return findings.reduce((acc, finding) => {
    acc[finding.category] = (acc[finding.category] || 0) + 1
    return acc
  }, {})
}

function compareWithBaseline(currentReport, baselineReport) {
  const currentFindings = moduleSurfaceGapFindings(currentReport)
  const baselineFindings = moduleSurfaceGapFindings(baselineReport)
  const currentKeys = new Set(currentFindings.map(gapFindingKey))
  const baselineKeys = new Set(baselineFindings.map(gapFindingKey))
  const newFindings = currentFindings.filter((finding) => !baselineKeys.has(gapFindingKey(finding)))
  const resolvedFindings = baselineFindings.filter((finding) => !currentKeys.has(gapFindingKey(finding)))
  const currentCounts = countByCategory(currentFindings)
  const baselineCounts = countByCategory(baselineFindings)
  const worsenedCategories = []

  for (const category of new Set([...Object.keys(currentCounts), ...Object.keys(baselineCounts)])) {
    const currentCount = currentCounts[category] || 0
    const baselineCount = baselineCounts[category] || 0
    if (currentCount > baselineCount) {
      worsenedCategories.push({
        category,
        baselineCount,
        currentCount,
        delta: currentCount - baselineCount,
      })
    }
  }

  return {
    failed: newFindings.length > 0 || worsenedCategories.length > 0,
    baselineActiveGapCount: baselineFindings.length,
    currentActiveGapCount: currentFindings.length,
    activeGapDelta: currentFindings.length - baselineFindings.length,
    baselineCounts,
    currentCounts,
    newFindings,
    resolvedFindings,
    worsenedCategories,
  }
}

function renderMarkdown(report) {
  const lines = [
    "# Module Surface Inventory",
    "",
    report.summary.mode === "report"
      ? "Report mode: this inventory is read-only and does not enforce module entitlements."
      : report.summary.mode === "warn"
        ? "Warn mode: this inventory compares against the saved baseline and does not enforce module entitlements."
        : "Fail mode: this inventory blocks only new ratchet gaps and does not enforce module entitlements.",
    "",
    "## Summary",
    "",
    `- Generated at: ${report.summary.generatedAt}`,
    `- Catalog modules: ${report.summary.catalogCount}`,
    `- Surfaces inventoried: ${report.summary.recordCount}`,
    `- Source coverage: ${Object.entries(report.summary.sourceFiles).map(([key, value]) => `${key}=${value ? "present" : "missing"}`).join(", ")}`,
    "",
    "## Classification Counts",
    "",
    ...Object.entries(report.summary.byClassification).sort().map(([key, value]) => `- ${key}: ${value}`),
    "",
  ]

  if (report.ratchet) {
    lines.push("## Baseline Ratchet")
    lines.push("")
    lines.push(`- Ratchet status: ${report.ratchet.failed ? "failed" : "passed"}`)
    lines.push(`- Baseline active gaps: ${report.ratchet.baselineActiveGapCount}`)
    lines.push(`- Current active gaps: ${report.ratchet.currentActiveGapCount}`)
    lines.push(`- Active gap delta: ${report.ratchet.activeGapDelta}`)
    lines.push(`- New gaps: ${report.ratchet.newFindings.length}`)
    lines.push(`- Resolved gaps: ${report.ratchet.resolvedFindings.length}`)
    lines.push("")

    if (report.ratchet.worsenedCategories.length) {
      lines.push("### Worsened Categories")
      lines.push("")
      for (const item of report.ratchet.worsenedCategories) {
        lines.push(`- ${item.category}: ${item.baselineCount} -> ${item.currentCount} (${item.delta > 0 ? "+" : ""}${item.delta})`)
      }
      lines.push("")
    }

    if (report.ratchet.newFindings.length) {
      lines.push("### New Gaps")
      lines.push("")
      lines.push("| Category | Surface Type | Surface | File | Reason |")
      lines.push("|---|---|---|---|---|")
      for (const finding of report.ratchet.newFindings) {
        lines.push(`| ${finding.category} | ${finding.surfaceType} | ${finding.surface} | ${finding.file} | ${finding.reason} |`)
      }
      lines.push("")
    } else {
      lines.push("No new module-surface gaps were introduced beyond the saved baseline.")
      lines.push("")
    }
  }

  lines.push("## Surfaces")
  lines.push("")
  lines.push("| Surface Type | Surface | Module | Permission | Guard | Classification | File |")
  lines.push("|---|---|---|---|---|---|---|")

  for (const record of report.records) {
    lines.push(`| ${record.surfaceType} | ${record.surface} | ${record.moduleSlug || ""} | ${record.permission || ""} | ${record.guard} | ${record.classification} | ${record.file} |`)
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
  const report = buildModuleSurfaceInventory(process.cwd(), { mode: args.mode })
  if (args.baseline) {
    const baseline = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), args.baseline), "utf8"))
    report.ratchet = compareWithBaseline(report, baseline)
  }
  writeReport(process.cwd(), args, report)
  console.log(`Module surface inventory wrote ${report.summary.recordCount} records to ${args.jsonOut}`)
  if (report.ratchet?.failed) {
    const message = `Module surface ratchet found ${report.ratchet.newFindings.length} new gaps.`
    if (args.mode === "fail") {
      console.error(message)
      process.exitCode = 1
    } else if (args.mode === "warn") {
      console.warn(message)
    }
  }
}

module.exports = {
  buildModuleSurfaceInventory,
  compareWithBaseline,
  moduleSurfaceGapFindings,
  parseArgs,
  renderMarkdown,
}
