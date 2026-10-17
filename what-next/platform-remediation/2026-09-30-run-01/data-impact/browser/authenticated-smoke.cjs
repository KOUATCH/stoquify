/* Read-only navigation proof on the retained clone created by this run.
 * Ordinary authentication/session and access-audit writes are expected.
 * No seeds, migrations, business actions, password changes or provider calls.
 * Usage: node <this-file> --preflight
 * Final bundle: node <this-file> --dist <verified-dist-directory>
 * The final command starts Next's production runtime, never a compiler.
 */
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto")
const net = require("node:net"), { spawn } = require("node:child_process")
const { Client } = require("pg"), { parse } = require("pg-connection-string")
const dotenv = require("dotenv")
const ROOT = process.cwd(), DATABASE = "stoquify_restore_local_remediation_20260930_run01"
const FOLLOWUP = process.argv.includes("--followup-reconciliation")
const EVIDENCE_DIRECTORY = FOLLOWUP ? path.join(__dirname, "reconciliation-followup") : __dirname
const hash = value => crypto.createHash("sha256").update(value).digest("hex")
const normalizeHost = value => String(value || "").toLowerCase().replace(/^\[|\]$/g, "")
const local = value => ["localhost", "127.0.0.1", "::1"].includes(normalizeHost(value))
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const save = (name, value) => fs.writeFileSync(path.join(EVIDENCE_DIRECTORY, name), JSON.stringify(value, null, 2) + "\n")
const fail = code => { throw Object.assign(new Error(code), { safeCode: code }) }
const report = {
  startedAt: new Date().toISOString(), status: "STARTING", target: DATABASE,
  scope: FOLLOWUP ? "Parent-authorized reconciliation follow-up; one additional ordinary login, original evidence preserved" : "Original five-route smoke",
  schemaSha256: hash(fs.readFileSync(path.join(ROOT, "prisma/schema.prisma"))),
  authAttempts: [], routes: [], serverOutputBytes: 0, serverDiagnosticMarkers: [], browserExternalRequestsBlocked: 0, schedulerRequestsBlocked: 0,
  expectedWrites: ["ordinary authentication/session lifecycle", "read-access RBAC/module audit records"],
  prohibitedActionsAttempted: false, rawIdentifiersOrSecretsEmitted: false,
  limitations: ["One existing local fixture identity; denial is not functional feature acceptance.",
    "Read-only route render proof; no business mutation, cross-tenant matrix, accessibility or production qualification.",
    "All non-allowlisted screenshot text and media are redacted; screenshots are local only."]
}
let browser, server, targetUrl, serverExit, permissionsIdentity

function configureTarget() {
  for (const file of [".env.local", ".env"]) {
    const filename = path.join(ROOT, file)
    if (fs.existsSync(filename)) dotenv.config({ path: filename, quiet: true })
  }
  const restored = JSON.parse(fs.readFileSync(path.join(__dirname, "../restore/execution.json"), "utf8"))
  if (restored.status !== "RESTORE_REHEARSAL_READY" || !restored.databaseCreatedByThisRun ||
      !restored.databaseRetained || restored.databaseName !== DATABASE) fail("VERIFIED_OWN_RESTORE_REQUIRED")
  const source = (process.env.DATABASE_URL || process.env.DIRECT_URL || "")
    .replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => process.env[key] || "")
    .replace(/^['"]|['"]$/g, "").trim()
  const url = new URL(source), effective = parse(source)
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !local(url.hostname) || !local(effective.host) ||
      (url.searchParams.has("hostaddr") && !local(url.searchParams.get("hostaddr"))) ||
      hash(`${normalizeHost(effective.host)}:${effective.port || "5432"}/${effective.database || ""}`) !== restored.sourceFingerprint) fail("SOURCE_CONFIGURATION_GUARD_FAILED")
  url.pathname = `/${DATABASE}`
  url.searchParams.set("options", "-c statement_timeout=30000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=30000")
  targetUrl = url.toString()
  const target = parse(targetUrl)
  if (target.database !== DATABASE || !local(target.host)) fail("EFFECTIVE_TARGET_GUARD_FAILED")
  report.sourceMutationAttempted = false
}

async function readTarget(work) {
  const client = new Client({ ...parse(targetUrl), connectionTimeoutMillis: 12000, query_timeout: 18000,
    options: "-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=2000" })
  await client.connect()
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
    const guard = (await client.query("SELECT current_database() AS name, current_setting('transaction_read_only') AS read_only")).rows[0]
    if (guard.name !== DATABASE || guard.read_only !== "on") fail("ACTUAL_DATABASE_GUARD_FAILED")
    return await work(client)
  } finally { await client.query("ROLLBACK").catch(() => {}); await client.end() }
}

function fixtureCredentials() {
  // Read the project's existing local-test defaults; never copy the secret into evidence.
  const source = fs.readFileSync(path.join(ROOT, "tests/e2e/auth.setup.ts"), "utf8")
  const email = source.match(/AQSTOQFLOW_E2E_EMAIL\s*\?\?\s*["']([^"']+)["']/)?.[1]
  const password = source.match(/AQSTOQFLOW_E2E_PASSWORD\s*\?\?\s*["']([^"']+)["']/)?.[1]
  if (!email?.endsWith("@stockflow.test") || !password) fail("KNOWN_LOCAL_FIXTURE_NOT_FOUND")
  const candidates = [{ email, password, source: "existing_payroll_test_default" }]
  // The development authentication reference explicitly designates this ignored
  // local artifact as the credential source. Read only documented fixture emails.
  const reference = path.join(ROOT, "docs/password_DB/development-authentication-credentials.md")
  const localSecret = path.join(ROOT, ".seed-artifacts/seed-login-credentials.json")
  if (fs.existsSync(reference) && fs.existsSync(localSecret)) {
    const document = fs.readFileSync(reference, "utf8")
    if (!document.includes("./.seed-artifacts/seed-login-credentials.json")) fail("LOCAL_CREDENTIAL_SOURCE_NOT_DOCUMENTED")
    const entries = JSON.parse(fs.readFileSync(localSecret, "utf8")).credentials
    for (const role of ["Admin", "Accountant", "Super Admin", "User"]) {
      const row = document.split(/\r?\n/).find(line => line.startsWith(`| ${role} |`))
      const documentedEmail = row?.match(/`([^`]+@stockflow\.test)`/)?.[1]
      const entry = Array.isArray(entries) ? entries.find(entry => entry.email === documentedEmail) : null
      if (entry && typeof entry.password === "string" && entry.password.length > 0) {
        candidates.push({ email: entry.email, password: entry.password, source: "documented_local_development_fixture" })
      }
    }
  }
  return candidates
}

function cookieCandidates() {
  const directory = path.join(ROOT, "playwright/.auth"), candidates = []
  let parsedStates = 0, expiredCookies = 0
  if (fs.existsSync(directory)) for (const name of fs.readdirSync(directory).filter(name => name.endsWith(".json")).sort()) {
    let state
    try { state = JSON.parse(fs.readFileSync(path.join(directory, name), "utf8")) } catch { continue }
    if (!Array.isArray(state.cookies)) continue
    parsedStates++
    const cookies = state.cookies.filter(cookie => {
      if (!local(String(cookie.domain || "").replace(/^\./, ""))) return false
      if (cookie.expires > 0 && cookie.expires <= Date.now() / 1000) { expiredCookies++; return false }
      return typeof cookie.name === "string" && typeof cookie.value === "string"
    })
    // Secure cookies cannot authenticate this explicitly HTTP loopback origin.
    const usable = cookies.filter(cookie => !cookie.secure && !cookie.name.startsWith("__Secure-") && !cookie.name.startsWith("__Host-"))
    if (usable.some(cookie => /session/i.test(cookie.name))) candidates.push({ fingerprint: hash(name), cookies: usable })
  }
  report.cookieInventory = { parsedStates, expiredCookies, candidates: candidates.length, valuesRetainedInReport: false }
  return candidates
}

async function preflight() {
  report.cloneMigrationSnapshot = await readTarget(async client => {
    const rows = (await client.query('SELECT migration_name, checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name')).rows
    return { capturedAt: new Date().toISOString(), completedRows: rows.length,
      nameChecksumSha256: hash(JSON.stringify(rows)), originalRestoreCompletedMigrations: 87 }
  })
  const candidates = fixtureCredentials()
  let fixture = candidates[0]
  report.fixtureCandidates = []
  for (const candidate of candidates) {
    const state = await readTarget(async client => (await client.query(`SELECT COUNT(*)::int AS matches,
    COALESCE(BOOL_AND(u."isActive" AND u."emailVerified" AND NOT u."isLocked" AND
      (u."lockedUntil" IS NULL OR u."lockedUntil" <= NOW()) AND u."organizationId" IS NOT NULL),false) AS eligible,
    COALESCE(BOOL_AND(EXISTS(SELECT 1 FROM accounts a WHERE a."userId"=u.id AND a."providerId"='credential' AND a.password IS NOT NULL)),false) AS credential_available
    FROM users u WHERE LOWER(u.email)=LOWER($1)`, [candidate.email])).rows[0])
    const proof = { ...state, emailFingerprint: hash(candidate.email), source: candidate.source }
    report.fixtureCandidates.push(proof)
    if (!report.fixture) report.fixture = proof
    if (state.matches === 1 && state.eligible && state.credential_available) { fixture = candidate; report.fixture = proof; break }
  }
  report.actualDatabaseVerified = true
  return { fixture: { email: fixture.email, password: fixture.password }, candidates: cookieCandidates() }
}

async function aggregateCounts() {
  return readTarget(async client => (await client.query(`SELECT
    (SELECT COUNT(*)::text FROM users) AS users,
    (SELECT COUNT(*)::text FROM sessions) AS sessions,
    (SELECT COUNT(*)::text FROM journal_entries) AS journal_entries,
    (SELECT COUNT(*)::text FROM journal_entry_lines) AS journal_entry_lines,
    (SELECT COUNT(*)::text FROM payroll_runs) AS payroll_runs`)).rows[0])
}

async function freePort() {
  const probe = net.createServer()
  await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolve) })
  const port = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  return port
}

async function startServer(distArg) {
  const dist = path.resolve(ROOT, distArg), relative = path.relative(ROOT, dist)
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) fail("BUNDLE_MUST_BE_WITHIN_WORKSPACE")
  const buildId = path.join(dist, "BUILD_ID"), required = [buildId, path.join(dist, "required-server-files.json")]
  if (required.some(file => !fs.existsSync(file))) fail("FINAL_BUILD_NOT_READY")
  if (fs.readFileSync(buildId, "utf8").trim() !== "GqRaF9F_RTehAxrqSBlS2") fail("RUNNER_BUILD_ID_MISMATCH")
  if (report.cloneMigrationSnapshot?.completedRows !== 89) fail("EXPECTED_CLONE_MIGRATIONS_NOT_PRESENT")
  const built = JSON.parse(fs.readFileSync(required[1], "utf8"))
  if (path.resolve(ROOT, built.config?.distDir || ".next") !== dist) fail("DIST_CONFIG_MISMATCH")
  report.bundle = { directory: relative, buildIdSha256: hash(fs.readFileSync(buildId)), configSha256: hash(fs.readFileSync(required[1])),
    qualification: "Workspace-backed compiled runtime only. Compilation, lint/types and static generation passed; standalone packaging exited 1 on Windows EPERM and is not certified by this smoke.",
    runnerConfirmedSourceDrift: "none across 6042 build-window files and 52 baseline supplemental files" }
  const port = await freePort(), origin = `http://127.0.0.1:${port}`
  const env = { ...process.env, DATABASE_URL: targetUrl, DIRECT_URL: targetUrl,
    NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1", NEXT_DIST_DIR: relative,
    NEXTAUTH_URL: origin, NEXT_PUBLIC_BASE_URL: origin, NEXT_TELEMETRY_DISABLED: "1" }
  for (const key of ["PGHOSTADDR", "PGSERVICE", "PGSERVICEFILE", "NODE_OPTIONS"]) delete env[key]
  // Read compiled configuration from required-server-files; use the workspace's traced
  // dependencies and static/public files. This is the same production start-server
  // path used by standalone output, and cannot trigger next build/dev.
  const entry = path.join(__dirname, "production-entry.cjs")
  env.SMOKE_DIST_DIRECTORY = dist
  server = spawn(process.execPath, ["--require", path.join(__dirname, "local-only-preload.cjs"), entry],
    { cwd: ROOT, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] })
  serverExit = new Promise(resolve => { server.once("exit", (code, signal) => { report.serverExit = { code, signal }; resolve() }); server.once("error", () => resolve()) })
  const countSafeDiagnostics = bytes => {
    report.serverOutputBytes += bytes.length
    for (const marker of ["PrismaClientInitializationError", "PrismaClientKnownRequestError", "ENOENT", "Cannot find module", "Error parsing datasource", "Invalid URL", "ERR_SMOKE_EXTERNAL_NETWORK_DISABLED", "EADDRINUSE"]) {
      if (bytes.includes(marker) && !report.serverDiagnosticMarkers.includes(marker)) report.serverDiagnosticMarkers.push(marker)
    }
  }
  server.stdout.on("data", countSafeDiagnostics)
  server.stderr.on("data", countSafeDiagnostics)
  report.server = { pid: server.pid, origin, compilerStarted: false, externalSocketsBlocked: true, rawLogsRetained: false }
  for (let attempt = 0; attempt < 90; attempt++) {
    if (server.exitCode !== null) fail("SERVER_EXITED_BEFORE_READY")
    try {
      const response = await fetch(`${origin}/api/me/permissions`, { redirect: "manual", signal: AbortSignal.timeout(2000) })
      if (response.status < 500) return origin
    } catch { /* bounded readiness retry */ }
    await pause(1000)
  }
  fail("SERVER_READINESS_TIMEOUT")
}

async function permissions(page) {
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/me/permissions", { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(30000) })
    const value = await response.json().catch(() => null)
    return { status: response.status, value }
  })
  if (result.status !== 200 || !result.value?.userId || !result.value.organizationId || !Array.isArray(result.value.permissions)) {
    const code = result.value?.code || result.value?.error
    return { status: result.status, authenticated: false, errorCode: typeof code === "string" && /^[A-Z_]{1,80}$/.test(code) ? code : undefined }
  }
  const value = result.value
  const pair = await readTarget(async client => (await client.query('SELECT EXISTS(SELECT 1 FROM users WHERE id=$1 AND "organizationId"=$2) AS valid', [value.userId, value.organizationId])).rows[0].valid)
  if (!pair) fail("AUTHENTICATED_IDENTITY_NOT_IN_CLONE")
  permissionsIdentity = { userId: value.userId, organizationId: value.organizationId }
  return { status: result.status, authenticated: true, databasePairVerified: true,
    userFingerprint: hash(value.userId), organizationFingerprint: hash(value.organizationId),
    permissionCount: value.permissions.length, roleCount: Array.isArray(value.roles) ? value.roles.length : 0 }
}

async function redactScreenshot(page, filename, allowed) {
  await page.evaluate(allow => {
    // Preserve geometry, not private copy. All unrecognized text receives an opaque
    // overlay; no raw rendered text is returned to Node or retained in a report.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const boxes = []
    while (walker.nextNode()) {
      const node = walker.currentNode, text = node.textContent.trim()
      if (!text || allow.includes(text) || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(node.parentElement?.tagName || "")) continue
      const range = document.createRange(); range.selectNodeContents(node)
      for (const rect of range.getClientRects()) if (rect.width && rect.height) boxes.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    }
    const style = document.createElement("style")
    // CSS also hides newly rendered private text if a polling update lands while
    // screenshot capture is pending. Only exact static headings stay visible.
    style.textContent = "*{color:transparent!important;text-shadow:none!important;background-image:none!important}img,svg,canvas,video,iframe,input,textarea,select{visibility:hidden!important}*::before,*::after{content:none!important}[data-smoke-static-heading]{color:#e2e8f0!important}"
    document.head.append(style)
    for (const heading of document.querySelectorAll("h1,h2,h3")) if (allow.includes(heading.textContent.trim())) heading.setAttribute("data-smoke-static-heading", "true")
    for (const box of boxes) {
      const mask = document.createElement("div")
      Object.assign(mask.style, { position: "absolute", left: `${box.x + scrollX}px`, top: `${box.y + scrollY}px`, width: `${box.width + 2}px`, height: `${box.height + 2}px`, background: "#202b36", zIndex: "2147483647", pointerEvents: "none" })
      document.body.append(mask)
    }
  }, allowed)
  await page.screenshot({ path: path.join(EVIDENCE_DIRECTORY, filename), fullPage: false, animations: "disabled" })
}

const routes = [
  { key: "reconciliation", route: "/en/dashboard/finance/reconciliation", headings: ["Payment reconciliation workbench", "Payment reconciliation", "Payment Reconciliation"] },
  { key: "accounting-close", route: "/en/dashboard/accounting/close", headings: ["Close & Assurance Center"] },
  { key: "owner-war-room", route: "/en/dashboard/owner-war-room", headings: ["Owner War Room"] },
  { key: "manager-action-center", route: "/en/dashboard/manager-action-center", headings: ["Manager Action Center"] },
  { key: "cash-command", route: "/en/dashboard/finance/cash-command", headings: ["Cash Command Intelligence"] },
]

async function runBrowser(origin, fixture, candidates) {
  const { chromium } = require("playwright")
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 1000 } })
  const requestFacts = new Map()
  const safePath = request => {
    const pathname = new URL(request.url()).pathname
    if (pathname.startsWith("/_next/static/")) return "/_next/static/*"
    if (["/api/me/permissions", "/api/auth/get-session", "/api/auth/sign-in/email", "/en/dashboard/finance/reconciliation"].includes(pathname)) return pathname
    return pathname.startsWith("/api/") ? "/api/[redacted]" : "/[redacted]"
  }
  const requestKey = request => `${request.method()} ${safePath(request)}`
  const fact = request => {
    const key = requestKey(request)
    if (!requestFacts.has(key)) requestFacts.set(key, { endpoint: key, started: 0, completed: 0, failed: 0, statuses: {}, failureCodes: [] })
    return requestFacts.get(key)
  }
  if (FOLLOWUP) {
    context.on("request", request => { fact(request).started++ })
    context.on("requestfinished", request => { fact(request).completed++ })
    context.on("requestfailed", request => {
      const item = fact(request); item.failed++
      const code = request.failure()?.errorText
      if (/^net::ERR_[A-Z_]+$/.test(code || "") && !item.failureCodes.includes(code)) item.failureCodes.push(code)
    })
    context.on("response", response => { const item = fact(response.request()); item.statuses[response.status()] = (item.statuses[response.status()] || 0) + 1 })
  }
  await context.route("**/*", route => {
    const url = new URL(route.request().url())
    if (/^\/api\/(internal|cron|jobs|workers)(\/|$)/.test(url.pathname)) { report.schedulerRequestsBlocked++; return route.abort("blockedbyclient") }
    if (url.origin === origin || ["data:", "blob:"].includes(url.protocol)) return route.continue()
    report.browserExternalRequestsBlocked++; return route.abort("blockedbyclient")
  })
  const page = await context.newPage()
  // Same-origin blank document avoids rendering tenant information before proof.
  await page.goto(`${origin}/api/me/permissions`, { waitUntil: "domcontentloaded", timeout: 60000 })
  for (const candidate of candidates) {
    await context.clearCookies()
    await context.addCookies(candidate.cookies.map(cookie => ({ ...cookie, domain: "127.0.0.1", path: cookie.path || "/", secure: false })))
    const proof = await permissions(page)
    report.authAttempts.push({ method: "existing_loopback_test_cookie", stateFingerprint: candidate.fingerprint, ...proof })
    if (proof.authenticated) { report.authentication = proof; break }
  }
  if (!report.authentication) {
    await context.clearCookies()
    if (report.fixture.matches !== 1 || !report.fixture.eligible || !report.fixture.credential_available) fail("KNOWN_FIXTURE_ACCOUNT_UNAVAILABLE")
    // Exactly one ordinary credential request, with no retry and no password writes.
    const attemptPath = path.join(EVIDENCE_DIRECTORY, "ordinary-login-attempt.json")
    if (fs.existsSync(attemptPath)) fail("ONE_ORDINARY_LOGIN_ALREADY_ATTEMPTED")
    fs.writeFileSync(attemptPath, JSON.stringify({ attemptedAt: new Date().toISOString(), emailFingerprint: report.fixture.emailFingerprint, target: DATABASE }) + "\n", { flag: "wx" })
    const login = await page.evaluate(async credentials => {
      const response = await fetch("/api/auth/sign-in/email", { method: "POST", redirect: "manual", signal: AbortSignal.timeout(45000),
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...credentials, rememberMe: true }) })
      const body = await response.json().catch(() => null)
      return { status: response.status, errorCode: typeof body?.code === "string" && /^[A-Z_]{1,80}$/.test(body.code) ? body.code : undefined,
        additionalAuthenticationRequired: body?.twoFactorRedirect === true }
    }, fixture)
    report.authAttempts.push({ method: "one_ordinary_local_fixture_login", ...login })
    const proof = await permissions(page)
    if (!proof.authenticated) { report.authentication = proof; fail("ORDINARY_FIXTURE_LOGIN_DID_NOT_AUTHENTICATE") }
    report.authentication = proof
  }
  report.businessCountsBefore = await aggregateCounts()
  for (const definition of FOLLOWUP ? routes.filter(route => route.key === "reconciliation") : routes) {
    const outcome = { key: definition.key, route: definition.route, status: "NOT_RUN" }
    let pageErrors = 0
    const onError = () => { pageErrors++ }
    page.on("pageerror", onError)
    try {
      const response = await page.goto(`${origin}${definition.route}`, { waitUntil: "domcontentloaded", timeout: 90000 })
      await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {})
      if (FOLLOWUP) {
        const hydrationStarted = Date.now()
        outcome.hydrationSamples = []
        for (let sample = 0; sample < 24; sample++) {
          const state = await page.evaluate(headings => {
            const text = document.body.innerText
            return { expectedHeading: [...document.querySelectorAll("h1")].some(node => headings.includes(node.textContent.trim())),
              explicitError: /workbench unavailable|Something went wrong|not available for this role|not enabled for this tenant|Module locked/i.test(text),
              loadingSkeletonCount: document.querySelectorAll('[data-slot="skeleton"],.animate-pulse').length,
              documentReady: document.readyState }
          }, definition.headings)
          const activeRequests = [...requestFacts.values()].reduce((sum, item) => sum + item.started - item.completed - item.failed, 0)
          outcome.hydrationSamples.push({ elapsedMs: Date.now() - hydrationStarted, ...state, activeRequests })
          save("authenticated-smoke.json", { ...report, followupHydrationProgress: outcome.hydrationSamples, safeRequestSummary: [...requestFacts.values()] })
          if (state.expectedHeading || state.explicitError) break
          await pause(5000)
        }
        outcome.hydrationWaitMs = Date.now() - hydrationStarted
      }
      const finalPath = new URL(page.url()).pathname
      outcome.httpStatus = response?.status() || null
      outcome.sameRoute = finalPath === definition.route
      outcome.loginRedirect = /\/(login|sign-in)(\/|$)/.test(finalPath)
      const state = await page.evaluate(headings => {
        const text = document.body.innerText
        const titles = [...document.querySelectorAll("h1,h2,h3")].map(node => node.textContent.trim())
        return {
          expectedHeading: headings.some(heading => titles.includes(heading)),
          permissionDenied: /not available for this role|Permission required|requires organization-wide authority|administrator-wide operating authority|Access denied|do not have permission|don't have permission/i.test(text),
          moduleLocked: /not enabled for this tenant|Module locked/i.test(text),
          scopeDenied: /needs an active organization|unavailable for this operating scope/i.test(text),
          errorBoundary: /Application error|Internal Server Error|Something went wrong|workbench unavailable|Failed to load/i.test(text),
          notFound: /This page could not be found|404 - Page Not Found/i.test(text),
        }
      }, definition.headings)
      Object.assign(outcome, state)
      outcome.status = outcome.loginRedirect ? "LOGIN_REDIRECT_NOT_AUTHENTICATED" : outcome.httpStatus >= 500 || state.errorBoundary ? "APPLICATION_ERROR" :
        state.moduleLocked ? "AUTHENTICATED_MODULE_DENIAL" : state.permissionDenied || outcome.httpStatus === 403 ? "AUTHENTICATED_PERMISSION_DENIAL" :
        state.scopeDenied ? "AUTHENTICATED_SCOPE_DENIAL" : state.notFound || outcome.httpStatus === 404 ? "NOT_FOUND" :
        state.expectedHeading && outcome.sameRoute ? "AUTHENTICATED_RENDER" : "UNVERIFIED_RENDER"
      outcome.screenshot = `${definition.key}-redacted.png`
      await redactScreenshot(page, outcome.screenshot, [...definition.headings, "Permission required", "Module locked", "Back to dashboard"])
    } catch (error) { outcome.status = "NAVIGATION_FAILED"; outcome.errorName = error.name === "TimeoutError" ? "TimeoutError" : "BrowserOperationError" }
    finally {
      page.off("pageerror", onError); outcome.pageErrorCount = pageErrors
      if (pageErrors > 0 && outcome.status === "AUTHENTICATED_RENDER") outcome.status = "AUTHENTICATED_RENDER_WITH_CLIENT_ERRORS"
      report.routes.push(outcome); save("authenticated-smoke.json", report)
    }
  }
  report.businessCountsAfter = await aggregateCounts()
  report.businessAggregateCountsUnchanged = ["users", "journal_entries", "journal_entry_lines", "payroll_runs"]
    .every(key => report.businessCountsBefore[key] === report.businessCountsAfter[key])
  report.finalAuthentication = await permissions(page)
  if (FOLLOWUP) report.safeRequestSummary = [...requestFacts.values()]
  report.identityStable = report.finalAuthentication.userFingerprint === report.authentication.userFingerprint &&
    report.finalAuthentication.organizationFingerprint === report.authentication.organizationFingerprint
  report.status = report.routes.every(route => route.status === "AUTHENTICATED_RENDER") && report.identityStable && report.businessAggregateCountsUnchanged
    ? "AUTHENTICATED_ROUTES_RENDERED" : "AUTHENTICATED_SMOKE_PARTIAL"
}

async function cleanup() {
  if (browser) await browser.close().catch(() => {})
  if (server && server.exitCode === null && server.pid) {
    server.kill()
    await Promise.race([serverExit, pause(10000)])
    report.ownedServerStopped = server.exitCode !== null || server.signalCode !== null
  } else report.ownedServerStopped = true
  permissionsIdentity = undefined
}

async function main() {
  const preflightOnly = process.argv.includes("--preflight")
  try {
    configureTarget()
    const { fixture, candidates } = await preflight()
    if (preflightOnly) { report.status = "PREFLIGHT_COMPLETE_WAITING_FINAL_BUNDLE"; return }
    const arg = process.argv.indexOf("--dist")
    if (arg < 0 || !process.argv[arg + 1]) fail("FINAL_DIST_ARGUMENT_REQUIRED")
    const origin = await startServer(process.argv[arg + 1])
    await runBrowser(origin, fixture, candidates)
  } catch (error) {
    report.status = "BLOCKED"
    report.errorCode = error.safeCode || (/^[A-Z0-9_]+$/.test(error.code || "") ? error.code : "GUARDED_SMOKE_FAILED")
    process.exitCode = 1
  } finally {
    await cleanup()
    report.completedAt = new Date().toISOString()
    save(preflightOnly ? "preflight.json" : "authenticated-smoke.json", report)
    console.log(JSON.stringify({ status: report.status, errorCode: report.errorCode, actualDatabaseVerified: report.actualDatabaseVerified,
      fixture: report.fixture, cookieInventory: report.cookieInventory, routes: report.routes.map(({ key, status }) => ({ key, status })), ownedServerStopped: report.ownedServerStopped }))
  }
}
module.exports = { configureTarget, readTarget }
if (require.main === module) main().catch(error => {
  console.log(JSON.stringify({ status: "EVIDENCE_WRITE_FAILED", errorCode: /^[A-Z0-9_]+$/.test(error.code || "") ? error.code : "UNCLASSIFIED" }))
  process.exitCode = 1
})
