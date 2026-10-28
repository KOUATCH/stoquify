#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const TODAY = "2026-07-20"
const DEFAULT_CANDIDATES = [
  "playwright-report",
  "test-results",
  path.join("what-next", "accounting"),
]
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".csv",
  ".htm",
  ".html",
  ".json",
  ".log",
  ".md",
  ".txt",
  ".xml",
  ".yml",
  ".yaml",
])
const SAFE_BINARY_EXTENSIONS = new Set([".gif", ".jpeg", ".jpg", ".png", ".webp"])
const DIAGNOSTIC_BINARY_EXTENSIONS = new Set([".webm", ".zip"])
const FORBIDDEN_PATH_PATTERNS = [
  { id: "dotenv-file", pattern: /(^|\/)\.env(?:\.|$)/i },
  { id: "playwright-auth-state", pattern: /(^|\/)playwright\/\.auth(\/|$)/i },
  { id: "database-dump", pattern: /\.(?:bak|db|dump|sqlite|sqlite3|sql)$/i },
  { id: "git-directory", pattern: /(^|\/)\.git(\/|$)/i },
  { id: "dependency-directory", pattern: /(^|\/)node_modules(\/|$)/i },
]
const SECRET_PATTERNS = [
  { id: "private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i },
  { id: "raw-postgres-url", pattern: /postgres(?:ql)?:\/\/(?![^\s"'`<>]*\*\*\*)[^\s"'`<>]+/i },
  { id: "bearer-token", pattern: /bearer\s+(?!raw-token\b)[a-z0-9._~+/=-]{12,}/i },
  { id: "set-cookie-header", pattern: /\bset-cookie\s*:/i },
  { id: "cookie-header", pattern: /(^|\n)\s*cookie\s*:/i },
  { id: "auth-secret-assignment", pattern: /\b(?:AUTH_SECRET|NEXTAUTH_SECRET)\s*[:=]\s*["']?[^"'\s]{8,}/i },
  { id: "known-sensitive-fixture", pattern: /\b(?:super-secret|provider-token|private-salary|private-payment)\b/i },
]

function parseArgs(argv = process.argv.slice(2), root = process.cwd()) {
  const positionalCandidates = []
  const args = {
    root,
    mode: "report",
    candidates: [...DEFAULT_CANDIDATES],
    allowDiagnosticBinaries: false,
    maxTextBytes: 1_000_000,
    out: path.join(root, "what-next", "accounting", `close-assurance-smoke-artifact-readiness-${TODAY}.md`),
    jsonOut: path.join(root, "what-next", "accounting", `close-assurance-smoke-artifact-readiness-${TODAY}.json`),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--mode") args.mode = argv[++index] || args.mode
    else if (arg === "--candidate") args.candidates.push(argv[++index])
    else if (arg === "--only-candidate") args.candidates = [argv[++index]]
    else if (arg === "--allow-diagnostic-binaries") args.allowDiagnosticBinaries = true
    else if (arg === "--max-text-bytes") args.maxTextBytes = Number(argv[++index])
    else if (arg === "--out") args.out = path.resolve(root, argv[++index])
    else if (arg === "--json-out") args.jsonOut = path.resolve(root, argv[++index])
    else if (arg === "--help" || arg === "-h") args.help = true
    else if (!arg.startsWith("--")) positionalCandidates.push(arg)
    else throw new Error(`Unknown argument: ${arg}`)
  }

  if (positionalCandidates.length > 0) args.candidates = positionalCandidates
  if (!["report", "fail"].includes(args.mode)) {
    throw new Error("--mode must be report or fail")
  }
  if (!Number.isFinite(args.maxTextBytes) || args.maxTextBytes <= 0) {
    throw new Error("--max-text-bytes must be a positive number")
  }
  args.root = path.resolve(args.root)
  args.out = path.resolve(args.out)
  args.jsonOut = path.resolve(args.jsonOut)
  return args
}

function relativePath(root, target) {
  return path.relative(root, target).replace(/\\/g, "/")
}

function withinRoot(root, target) {
  const relative = path.relative(root, target)
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
}

function walkFiles(root, target, files = []) {
  if (!fs.existsSync(target)) return files
  const stat = fs.statSync(target)
  if (stat.isFile()) {
    files.push(target)
    return files
  }
  if (!stat.isDirectory()) return files

  for (const entry of fs.readdirSync(target)) {
    walkFiles(root, path.join(target, entry), files)
  }
  return files
}

function forbiddenPathFinding(root, filePath) {
  const relative = relativePath(root, filePath)
  const normalized = relative.toLowerCase()
  const match = FORBIDDEN_PATH_PATTERNS.find((candidate) => candidate.pattern.test(normalized))
  return match
    ? {
        id: match.id,
        severity: "BLOCKER",
        file: relative,
        detail: "Forbidden file path for CI evidence artifact upload.",
      }
    : null
}

function scanText(root, filePath, maxTextBytes) {
  const stat = fs.statSync(filePath)
  const relative = relativePath(root, filePath)
  if (stat.size > maxTextBytes) {
    return [
      {
        id: "large-text-unscanned",
        severity: "BLOCKER",
        file: relative,
        detail: `Text file exceeds ${maxTextBytes} bytes and was not scanned.`,
      },
    ]
  }

  const source = fs.readFileSync(filePath, "utf8")
  return SECRET_PATTERNS.filter((candidate) => candidate.pattern.test(source)).map((candidate) => ({
    id: candidate.id,
    severity: "BLOCKER",
    file: relative,
    detail: "Secret-like content detected in artifact candidate.",
  }))
}

function scanFile(root, filePath, args) {
  const pathFinding = forbiddenPathFinding(root, filePath)
  if (pathFinding) return [pathFinding]

  const relative = relativePath(root, filePath)
  const ext = path.extname(filePath).toLowerCase()
  if (TEXT_EXTENSIONS.has(ext)) return scanText(root, filePath, args.maxTextBytes)
  if (SAFE_BINARY_EXTENSIONS.has(ext)) return []
  if (DIAGNOSTIC_BINARY_EXTENSIONS.has(ext)) {
    return args.allowDiagnosticBinaries
      ? []
      : [
          {
            id: "diagnostic-binary-requires-approval",
            severity: "BLOCKER",
            file: relative,
            detail: "Playwright trace/video binaries can contain request data and require explicit artifact-upload approval.",
          },
        ]
  }
  return [
    {
      id: "unsupported-file-type",
      severity: "BLOCKER",
      file: relative,
      detail: `Unsupported artifact file extension: ${ext || "(none)"}.`,
    },
  ]
}

function buildReport(options) {
  const args = {
    ...options,
    root: path.resolve(options.root || process.cwd()),
    candidates: options.candidates?.length ? options.candidates : DEFAULT_CANDIDATES,
    maxTextBytes: options.maxTextBytes || 1_000_000,
    allowDiagnosticBinaries: Boolean(options.allowDiagnosticBinaries),
  }
  const findings = []
  const missingCandidates = []
  const files = []

  for (const candidate of args.candidates) {
    const target = path.resolve(args.root, candidate)
    if (!withinRoot(args.root, target) && target !== args.root) {
      findings.push({
        id: "candidate-outside-workspace",
        severity: "BLOCKER",
        file: candidate,
        detail: "Artifact candidate path resolves outside the workspace.",
      })
      continue
    }
    if (!fs.existsSync(target)) {
      missingCandidates.push(candidate.replace(/\\/g, "/"))
      continue
    }
    files.push(...walkFiles(args.root, target))
  }

  for (const filePath of files) {
    findings.push(...scanFile(args.root, filePath, args))
  }

  const blockers = findings.filter((finding) => finding.severity === "BLOCKER")
  return {
    checkedAt: new Date().toISOString(),
    status: blockers.length ? "blocked" : "ready",
    candidatePaths: args.candidates.map((candidate) => candidate.replace(/\\/g, "/")),
    missingCandidates,
    fileCount: files.length,
    blockerCount: blockers.length,
    allowDiagnosticBinaries: args.allowDiagnosticBinaries,
    findings,
    recommendation: blockers.length
      ? "Do not enable CI artifact upload until blockers are removed or explicitly approved."
      : "Artifact candidates are locally scan-ready for the bounded close-assurance smoke evidence set.",
  }
}

function renderMarkdown(report, mode = "report") {
  const lines = [
    "# Close Assurance Smoke Artifact Readiness",
    "",
    `Checked at: ${report.checkedAt}`,
    `Mode: \`${mode}\``,
    `Status: \`${report.status}\``,
    "",
    "## Summary",
    "",
    `- Candidate files scanned: ${report.fileCount}`,
    `- Blockers: ${report.blockerCount}`,
    `- Diagnostic binaries allowed: ${report.allowDiagnosticBinaries ? "yes" : "no"}`,
    "",
    "## Candidate Paths",
    "",
    ...report.candidatePaths.map((candidate) => `- ${candidate}`),
    "",
    "## Missing Candidates",
    "",
    ...(report.missingCandidates.length
      ? report.missingCandidates.map((candidate) => `- ${candidate}`)
      : ["- None"]),
    "",
    "## Findings",
    "",
    ...(report.findings.length
      ? report.findings.map((finding) => `- ${finding.severity}: ${finding.id} - ${finding.file} - ${finding.detail}`)
      : ["- None"]),
    "",
    "## Recommendation",
    "",
    report.recommendation,
    "",
  ]
  return lines.join("\n")
}

function writeReport(args, report) {
  fs.mkdirSync(path.dirname(args.out), { recursive: true })
  fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true })
  fs.writeFileSync(args.out, `${renderMarkdown(report, args.mode)}\n`, "utf8")
  fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8")
}

function main() {
  const args = parseArgs()
  if (args.help) {
    console.log("node scripts/close-assurance-smoke-artifact-gate.js [--mode report|fail] [--only-candidate path] [--candidate path] [path ...] [--allow-diagnostic-binaries]")
    return
  }
  const report = buildReport(args)
  writeReport(args, report)
  console.log(renderMarkdown(report, args.mode))
  if (args.mode === "fail" && report.status !== "ready") process.exitCode = 1
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildReport,
  parseArgs,
  renderMarkdown,
}
