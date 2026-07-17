#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const DEFAULT_BASE_URL = "http://127.0.0.1:3000"
const DEFAULT_OUT = "what-next/security-txt-live-smoke.json"
const DEFAULT_TIMEOUT_MS = 15000
const ROUTES = ["/api/security-txt", "/.well-known/security.txt"]

function parsePositiveInt(value, name) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

function resolveFromRoot(root, value) {
  return path.isAbsolute(value) ? value : path.resolve(root, value)
}

function normalizeRelative(root, value) {
  return path.relative(root, value).replace(/\\/g, "/")
}

function parseArgs(argv = process.argv, env = process.env, defaultRoot = process.cwd()) {
  const args = {
    root: defaultRoot,
    mode: env.SECURITY_TXT_SMOKE_MODE || "fail",
    baseUrl: env.SECURITY_TXT_SMOKE_BASE_URL || env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: parsePositiveInt(env.SECURITY_TXT_SMOKE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS, "SECURITY_TXT_SMOKE_TIMEOUT_MS"),
    out: env.SECURITY_TXT_SMOKE_OUT || DEFAULT_OUT,
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--base-url") args.baseUrl = argv[++index]
    else if (arg === "--timeout-ms") args.timeoutMs = parsePositiveInt(argv[++index], "--timeout-ms")
    else if (arg === "--out") args.out = argv[++index]
    else if (arg === "--help" || arg === "-h") args.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }

  if (!["report", "fail"].includes(args.mode)) {
    throw new Error("--mode must be one of: report, fail")
  }

  args.root = path.resolve(args.root)
  args.out = resolveFromRoot(args.root, args.out)
  return args
}

function routeUrl(baseUrl, routePath) {
  return new URL(routePath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString()
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function readRoute(fetchImpl, args, routePath) {
  const url = routeUrl(args.baseUrl, routePath)
  const startedAt = Date.now()
  const response = await fetchWithTimeout(fetchImpl, url, args.timeoutMs)
  const body = await response.text()

  return {
    routePath,
    url,
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - startedAt,
    headers: {
      contentType: response.headers.get("content-type"),
      cacheControl: response.headers.get("cache-control"),
    },
    body,
  }
}

function evaluateSecurityTxt(api, canonical, now = new Date()) {
  const issues = []
  if (api.status !== 200) issues.push("api_security_txt_not_200")
  if (canonical.status !== 200) issues.push("well_known_security_txt_not_200")
  if (api.body !== canonical.body) issues.push("security_txt_body_mismatch")
  if (api.headers.contentType !== canonical.headers.contentType) issues.push("security_txt_content_type_mismatch")
  if (api.headers.cacheControl !== canonical.headers.cacheControl) issues.push("security_txt_cache_control_mismatch")
  if (!/Contact:\s*mailto:/m.test(canonical.body)) issues.push("security_txt_contact_not_mailto")

  const expires = canonical.body.match(/^Expires:\s*(.+)$/m)?.[1]
  if (!expires) {
    issues.push("security_txt_missing_expires")
  } else {
    const expiresAt = new Date(expires.trim())
    if (Number.isNaN(expiresAt.getTime())) issues.push("security_txt_invalid_expires")
    else if (expiresAt <= now) issues.push("security_txt_stale_expires")
  }

  return issues
}

async function runSmoke(args, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch
  if (typeof fetchImpl !== "function") throw new Error("global fetch is not available")

  const routes = []
  for (const routePath of ROUTES) {
    routes.push(await readRoute(fetchImpl, args, routePath))
  }

  const issues = evaluateSecurityTxt(routes[0], routes[1], options.now || new Date())
  const report = {
    generatedAt: new Date().toISOString(),
    mode: args.mode,
    baseUrl: args.baseUrl,
    status: issues.length === 0 ? "ready" : "blocked",
    issueCount: issues.length,
    issues,
    routes: routes.map((route) => ({
      routePath: route.routePath,
      url: route.url,
      status: route.status,
      ok: route.ok,
      durationMs: route.durationMs,
      headers: route.headers,
      bodyLength: route.body.length,
    })),
    parity: {
      body: routes[0].body === routes[1].body,
      contentType: routes[0].headers.contentType === routes[1].headers.contentType,
      cacheControl: routes[0].headers.cacheControl === routes[1].headers.cacheControl,
    },
    output: normalizeRelative(args.root, args.out),
  }

  return report
}

function writeReport(report, out, fsImpl = fs) {
  fsImpl.mkdirSync(path.dirname(out), { recursive: true })
  fsImpl.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8")
}

function printHelp() {
  console.log(`Security.txt Live Smoke

Usage:
  node scripts/security-txt-live-smoke.js --base-url http://127.0.0.1:3100 --out what-next/security-txt-live-smoke.json

Checks:
  - /api/security-txt returns 200
  - /.well-known/security.txt returns 200
  - body, content-type, and cache-control match
  - Contact uses mailto:
  - Expires is present and future-dated
`)
}

async function main() {
  const args = parseArgs()
  if (args.help) {
    printHelp()
    return
  }

  const report = await runSmoke(args)
  writeReport(report, args.out)

  if (report.status === "ready") {
    console.log(`Security.txt live smoke passed for ${args.baseUrl}`)
  } else {
    console.error(`Security.txt live smoke found ${report.issueCount} issue(s): ${report.issues.join(", ")}`)
  }

  if (args.mode === "fail" && report.status !== "ready") process.exitCode = 1
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message)
    process.exitCode = 1
  })
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_OUT,
  ROUTES,
  evaluateSecurityTxt,
  parseArgs,
  routeUrl,
  runSmoke,
  writeReport,
}
