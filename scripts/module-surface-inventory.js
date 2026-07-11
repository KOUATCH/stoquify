const fs = require("fs")
const path = require("path")

const DEFAULT_JSON_OUT = "what-next/module-surface-inventory.json"
const DEFAULT_MARKDOWN_OUT = "what-next/module-surface-inventory.md"

function parseArgs(argv = process.argv) {
  const args = { mode: "report", out: DEFAULT_MARKDOWN_OUT, jsonOut: DEFAULT_JSON_OUT }
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--mode") args.mode = argv[++index] || "report"
    if (arg === "--out") args.out = argv[++index] || DEFAULT_MARKDOWN_OUT
    if (arg === "--json-out") args.jsonOut = argv[++index] || DEFAULT_JSON_OUT
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

function classify(record, catalog) {
  const classes = []
  if (!record.moduleSlug) classes.push("unmapped")
  else if (!catalog.has(record.moduleSlug)) classes.push("unknown slug")
  else classes.push("mapped")

  if (!record.permission && ["navigation", "page", "action", "api"].includes(record.surfaceType)) {
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
    moduleSlug,
    permission: input.permission || extractPermission(input.source || ""),
    guard: input.guard || detectGuard(input.source || ""),
    observeOrEnforce: input.observeOrEnforce || "report-only",
    dependencyGaps: dependencies || [],
    delegatedTo: input.delegatedTo || [],
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

function buildModuleSurfaceInventory(root = process.cwd(), options = {}) {
  const catalog = parseModuleCatalog(root)
  const records = [
    ...sidebarRecords(root, catalog),
    ...moduleServiceRecords(root, catalog),
    ...dashboardRecords(root, catalog),
    ...actionRecords(root, catalog),
  ].sort((a, b) => `${a.surfaceType}:${a.file}:${a.surface}`.localeCompare(`${b.surfaceType}:${b.file}:${b.surface}`))

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: options.mode || "report",
    sourceFiles: {
      sidebar: exists(root, "config/sidebar.ts"),
      moduleCatalog: exists(root, "services/modules/module-catalog.service.ts"),
      dashboardRoot: exists(root, "app/[locale]/(dashboard)/dashboard"),
      actionsRoot: exists(root, "actions"),
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

function renderMarkdown(report) {
  const lines = [
    "# Module Surface Inventory",
    "",
    "Report mode: this inventory is read-only and does not enforce module entitlements.",
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
    "## Surfaces",
    "",
    "| Surface Type | Surface | Module | Permission | Guard | Classification | File |",
    "|---|---|---|---|---|---|---|",
  ]

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
  writeReport(process.cwd(), args, report)
  console.log(`Module surface inventory wrote ${report.summary.recordCount} records to ${args.jsonOut}`)
}

module.exports = {
  buildModuleSurfaceInventory,
  parseArgs,
  renderMarkdown,
}