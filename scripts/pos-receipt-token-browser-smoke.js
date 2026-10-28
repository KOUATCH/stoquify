#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const TARGET_PERMISSION = "pos.receipts.revoke"
const DEFAULT_ROUTE_PATH = "/en/dashboard/pos"
const DEFAULT_OUT = "what-next/AQSTOQFLOW_POS_RECEIPT_TOKEN_BROWSER_SMOKE.json"
const DEFAULT_SCREENSHOTS_DIR = "what-next/screenshots/pos-receipt-token-management"
const VIEWPORT = { width: 1440, height: 1100 }
const ERROR_MARKERS = [
  "Application error",
  "Internal Server Error",
  "Unhandled Runtime Error",
  "This page could not be found",
]

function firstEnv(env, names, fallback) {
  for (const name of names) {
    if (env[name]) return env[name]
  }
  return fallback
}

function parseNumber(value, name) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed < 1000) {
    throw new Error(`${name} must be a number greater than or equal to 1000`)
  }
  return parsed
}

function resolveFromRoot(root, value) {
  return path.isAbsolute(value) ? value : path.resolve(root, value)
}

function normalizeRelative(root, value) {
  return path.relative(root, value).replace(/\\/g, "/")
}

function formatCommandArg(root, value) {
  if (!path.isAbsolute(value)) return value

  const resolvedRoot = path.resolve(root)
  const resolvedValue = path.resolve(value)
  const insideRoot =
    resolvedValue === resolvedRoot ||
    resolvedValue.toLowerCase().startsWith(`${resolvedRoot.toLowerCase()}${path.sep}`)

  return insideRoot ? normalizeRelative(root, value) : value
}

function parseArgs(argv, env = process.env, defaultRoot = process.cwd()) {
  let root = defaultRoot

  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      root = path.resolve(argv[index + 1])
      index += 1
    }
  }

  const args = {
    root,
    mode: firstEnv(env, ["POS_RECEIPT_TOKEN_SMOKE_MODE"], "fail"),
    baseUrl: firstEnv(
      env,
      ["POS_RECEIPT_TOKEN_SMOKE_BASE_URL", "PLAYWRIGHT_BASE_URL"],
      "http://127.0.0.1:3000",
    ),
    routePath: firstEnv(env, ["POS_RECEIPT_TOKEN_SMOKE_ROUTE"], DEFAULT_ROUTE_PATH),
    timeoutMs: parseNumber(
      firstEnv(env, ["POS_RECEIPT_TOKEN_SMOKE_TIMEOUT_MS"], "90000"),
      "POS_RECEIPT_TOKEN_SMOKE_TIMEOUT_MS",
    ),
    authorizedStorageState: firstEnv(
      env,
      ["POS_RECEIPT_TOKEN_SMOKE_AUTHORIZED_STORAGE_STATE"],
      "playwright/.auth/pos-receipt-token-authorized.json",
    ),
    deniedStorageState: firstEnv(
      env,
      ["POS_RECEIPT_TOKEN_SMOKE_DENIED_STORAGE_STATE"],
      "playwright/.auth/pos-receipt-token-denied.json",
    ),
    searchQuery: firstEnv(env, ["POS_RECEIPT_TOKEN_SMOKE_SEARCH_QUERY"], ""),
    out: firstEnv(env, ["POS_RECEIPT_TOKEN_SMOKE_OUT"], DEFAULT_OUT),
    screenshotsDir: firstEnv(env, ["POS_RECEIPT_TOKEN_SMOKE_SCREENSHOTS_DIR"], DEFAULT_SCREENSHOTS_DIR),
    requireSaleResult: env.POS_RECEIPT_TOKEN_SMOKE_ALLOW_EMPTY_SALES !== "1",
    dryRun: env.POS_RECEIPT_TOKEN_SMOKE_DRY_RUN === "1",
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") index += 1
    else if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--base-url") args.baseUrl = argv[++index]
    else if (arg === "--route") args.routePath = argv[++index]
    else if (arg === "--timeout-ms") args.timeoutMs = parseNumber(argv[++index], "--timeout-ms")
    else if (arg === "--authorized-storage-state") args.authorizedStorageState = argv[++index]
    else if (arg === "--denied-storage-state") args.deniedStorageState = argv[++index]
    else if (arg === "--search-query") args.searchQuery = argv[++index]
    else if (arg === "--out") args.out = argv[++index]
    else if (arg === "--screenshots-dir") args.screenshotsDir = argv[++index]
    else if (arg === "--allow-empty-sale-results") args.requireSaleResult = false
    else if (arg === "--require-sale-result") args.requireSaleResult = true
    else if (arg === "--dry-run") args.dryRun = true
    else if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!["report", "fail"].includes(args.mode)) {
    throw new Error("--mode must be one of: report, fail")
  }

  args.authorizedStorageState = resolveFromRoot(args.root, args.authorizedStorageState)
  args.deniedStorageState = resolveFromRoot(args.root, args.deniedStorageState)
  args.out = resolveFromRoot(args.root, args.out)
  args.screenshotsDir = resolveFromRoot(args.root, args.screenshotsDir)

  if (path.resolve(args.authorizedStorageState) === path.resolve(args.deniedStorageState)) {
    throw new Error("Authorized and denied POS receipt-token smoke storage states must be different files")
  }

  return args
}

function routeUrl(baseUrl, routePath) {
  return new URL(routePath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString()
}

function buildOperatorScenarios(args) {
  return [
    {
      id: "authorized-operator",
      label: "Authorized POS operator",
      storageState: args.authorizedStorageState,
      expectsTargetPermission: true,
    },
    {
      id: "denied-operator",
      label: "Denied POS operator",
      storageState: args.deniedStorageState,
      expectsTargetPermission: false,
    },
  ]
}

function buildSmokeCommand(args) {
  return {
    command: process.execPath,
    args: [
      path.join("scripts", "pos-receipt-token-browser-smoke.js"),
      "--mode",
      args.mode,
      "--base-url",
      args.baseUrl,
      "--route",
      args.routePath,
      "--timeout-ms",
      String(args.timeoutMs),
      "--authorized-storage-state",
      args.authorizedStorageState,
      "--denied-storage-state",
      args.deniedStorageState,
      "--search-query",
      args.searchQuery,
      "--screenshots-dir",
      args.screenshotsDir,
      "--out",
      args.out,
      args.requireSaleResult ? "--require-sale-result" : "--allow-empty-sale-results",
    ],
  }
}

function ensureStorageStates(args, fsImpl = fs) {
  const missing = buildOperatorScenarios(args)
    .filter((scenario) => !fsImpl.existsSync(scenario.storageState))
    .map((scenario) => `${scenario.label}: ${scenario.storageState}`)

  if (missing.length > 0) {
    throw new Error(
      [
        "POS receipt-token browser smoke auth state not found.",
        "Create two tenant-scoped Playwright storage states before running the gate:",
        `- authorized operator with ${TARGET_PERMISSION}`,
        `- denied POS operator without ${TARGET_PERMISSION}`,
        ...missing.map((entry) => `Missing ${entry}`),
      ].join("\n"),
    )
  }
}

function reportConfig(args) {
  const smokeCommand = buildSmokeCommand(args)

  return {
    baseUrl: args.baseUrl,
    mode: args.mode,
    routePath: args.routePath,
    targetPermission: TARGET_PERMISSION,
    authStates: {
      authorizedOperator: normalizeRelative(args.root, args.authorizedStorageState),
      deniedOperator: normalizeRelative(args.root, args.deniedStorageState),
    },
    searchQuery: args.searchQuery,
    requireSaleResult: args.requireSaleResult,
    output: normalizeRelative(args.root, args.out),
    screenshotsDir: normalizeRelative(args.root, args.screenshotsDir),
    timeoutMs: args.timeoutMs,
    smokeCommand: {
      command: "node",
      args: smokeCommand.args.map((value) => formatCommandArg(args.root, value)),
    },
  }
}

function printHelp() {
  console.log(`AqStoqFlow POS receipt-token browser smoke

Usage:
  node scripts/pos-receipt-token-browser-smoke.js --base-url http://127.0.0.1:3000

Required auth states:
  --authorized-storage-state file  Operator whose /api/me/permissions includes ${TARGET_PERMISSION}.
  --denied-storage-state file      POS operator whose /api/me/permissions excludes ${TARGET_PERMISSION}.

Options:
  --allow-empty-sale-results       Record an empty sale search as non-fatal.
  --require-sale-result            Require a completed sale so token controls can be selected. Default.
  --search-query value             Optional order-number query. Blank searches recent completed sales.

Evidence:
  JSON report defaults to ${DEFAULT_OUT}
  Screenshots default to ${DEFAULT_SCREENSHOTS_DIR}
`)
}

function loadPlaywright(root) {
  for (const packageName of ["playwright", "@playwright/test"]) {
    try {
      const modulePath = require.resolve(packageName, { paths: [root] })
      const mod = require(modulePath)
      if (mod.chromium) return mod
    } catch {
      // Try the next supported Playwright package name.
    }
  }
  return null
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isAuthRedirect(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    return pathname.endsWith("/login") || pathname.includes("/login/")
  } catch {
    return false
  }
}

async function locatorVisible(locator) {
  return locator.isVisible().catch(() => false)
}

async function waitForVisible(locator, timeoutMs, description) {
  try {
    await locator.waitFor({ state: "visible", timeout: timeoutMs })
  } catch (error) {
    throw new Error(`${description} was not visible within ${timeoutMs}ms`)
  }
}

async function assertNotVisible(locator, description) {
  const count = await locator.count().catch(() => 0)
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible().catch(() => false)) {
      throw new Error(`${description} was visible when it should be suppressed`)
    }
  }
}

async function assertNoErrorMarkers(page) {
  const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "")
  const marker = ERROR_MARKERS.find((candidate) => bodyText.includes(candidate))
  if (marker) throw new Error(`Page rendered error marker: ${marker}`)
}

async function readPermissionEvidence(context, args) {
  const response = await context.request.get(routeUrl(args.baseUrl, "/api/me/permissions"), {
    timeout: Math.min(args.timeoutMs, 30000),
  })
  const text = await response.text()
  if (!response.ok()) {
    throw new Error(`/api/me/permissions returned ${response.status()}: ${text.slice(0, 240)}`)
  }

  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error("/api/me/permissions did not return JSON")
  }

  const permissions = Array.isArray(payload.permissions) ? payload.permissions : []

  return {
    status: response.status(),
    organizationIdPresent: Boolean(payload.organizationId),
    roleCount: Array.isArray(payload.roles) ? payload.roles.length : 0,
    permissionCount: permissions.length,
    hasTargetPermission: permissions.includes(TARGET_PERMISSION),
  }
}

async function captureScenarioScreenshot(page, args, scenarioId, suffix) {
  fs.mkdirSync(args.screenshotsDir, { recursive: true })
  const filePath = path.join(args.screenshotsDir, `${scenarioId}-${suffix}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  return normalizeRelative(args.root, filePath)
}

async function waitForSaleSearchState(panel, timeoutMs) {
  const emptyState = panel.getByText("No completed sales found").first()
  const deniedState = panel.getByText(/Access unavailable/i).first()
  const resultState = panel.locator("button").filter({ hasText: /links\s*\/\s*\d+\s*active/i }).first()
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await locatorVisible(resultState)) return { state: "results", locator: resultState }
    if (await locatorVisible(emptyState)) return { state: "empty", locator: emptyState }
    if (await locatorVisible(deniedState)) return { state: "denied", locator: deniedState }
    await delay(250)
  }

  throw new Error("Receipt sale search did not settle into results, empty, or denied state")
}

async function runOperatorScenario(args, browser, scenario) {
  const result = {
    operator: scenario.id,
    label: scenario.label,
    expectedTargetPermission: scenario.expectsTargetPermission,
    authState: normalizeRelative(args.root, scenario.storageState),
    ok: false,
    checks: [],
    screenshot: null,
  }

  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState: scenario.storageState,
  })
  const page = await context.newPage()

  try {
    const permissionEvidence = await readPermissionEvidence(context, args)
    result.permissionEvidence = permissionEvidence

    if (permissionEvidence.hasTargetPermission !== scenario.expectsTargetPermission) {
      throw new Error(
        `${scenario.label} permission proof mismatch: expected ${TARGET_PERMISSION}=${scenario.expectsTargetPermission}, got ${permissionEvidence.hasTargetPermission}`,
      )
    }
    result.checks.push({ name: "permission-proof", ok: true })

    await page.goto(routeUrl(args.baseUrl, args.routePath), {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    })
    await page.waitForLoadState("networkidle", { timeout: Math.min(args.timeoutMs, 10000) }).catch(() => {})

    if (isAuthRedirect(page.url())) {
      throw new Error(`POS route redirected to login: ${page.url()}`)
    }

    await assertNoErrorMarkers(page)
    result.checks.push({ name: "pos-route-rendered", ok: true, finalUrl: page.url() })

    const historyPanel = page.locator('section[aria-label="Receipt access history"]').first()
    await waitForVisible(historyPanel, args.timeoutMs, "Receipt access history panel")
    result.checks.push({ name: "receipt-history-panel-visible", ok: true })

    const saleSearchInput = historyPanel.getByPlaceholder("Order number, or leave blank for recent")
    const saleSearchButton = historyPanel.getByRole("button", { name: /^Search$/ })
    const tokenManagementSurface = page.locator('section[aria-label="Public receipt access"]').first()

    if (scenario.expectsTargetPermission) {
      await waitForVisible(saleSearchInput, args.timeoutMs, "Receipt sale search input")
      await waitForVisible(saleSearchButton, args.timeoutMs, "Receipt sale search button")
      result.checks.push({ name: "sale-search-visible-after-permission-proof", ok: true })

      await saleSearchInput.fill(args.searchQuery)
      await saleSearchButton.click()
      const saleSearchState = await waitForSaleSearchState(historyPanel, args.timeoutMs)
      result.saleSearch = {
        query: args.searchQuery,
        state: saleSearchState.state,
      }

      if (saleSearchState.state === "denied") {
        throw new Error("Authorized operator received a sale-search denial state")
      }

      if (saleSearchState.state === "empty") {
        if (args.requireSaleResult) {
          throw new Error(
            "Receipt sale search returned no completed sales; seed a completed POS sale or pass --allow-empty-sale-results for exploratory runs",
          )
        }
        result.checks.push({ name: "sale-search-empty-state-recorded", ok: true })
      } else {
        await saleSearchState.locator.click()
        await waitForVisible(tokenManagementSurface, args.timeoutMs, "Public receipt access token controls")
        result.checks.push({ name: "token-management-surface-visible-after-sale-selection", ok: true })
      }
    } else {
      const deniedMessage = historyPanel
        .getByText(/Receipt access management requires POS receipt revoke permission|Access unavailable|Forbidden/i)
        .first()
      await waitForVisible(deniedMessage, args.timeoutMs, "Receipt-token RBAC denial message")
      await assertNotVisible(saleSearchInput, "Receipt sale search input")
      await assertNotVisible(saleSearchButton, "Receipt sale search button")
      await assertNotVisible(tokenManagementSurface, "Public receipt access token controls")
      result.checks.push({ name: "receipt-token-management-suppressed-without-permission", ok: true })
    }

    result.screenshot = await captureScenarioScreenshot(page, args, scenario.id, "receipt-token-management")
    result.ok = true
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    result.screenshot = await captureScenarioScreenshot(page, args, scenario.id, "failure").catch(() => null)
  } finally {
    await page.close().catch(() => {})
    await context.close().catch(() => {})
  }

  return result
}

async function runBrowserSmoke(args, playwright) {
  const browser = await playwright.chromium.launch({ headless: true })
  const scenarios = []

  try {
    for (const scenario of buildOperatorScenarios(args)) {
      scenarios.push(await runOperatorScenario(args, browser, scenario))
    }
  } finally {
    await browser.close().catch(() => {})
  }

  return scenarios
}

async function main() {
  const args = parseArgs(process.argv)
  const config = reportConfig(args)

  if (args.dryRun) {
    console.log(JSON.stringify(config, null, 2))
    return
  }

  ensureStorageStates(args)

  const report = {
    checkedAt: new Date().toISOString(),
    ...config,
    ok: false,
    scenarios: [],
  }

  const playwright = loadPlaywright(args.root)
  if (!playwright) {
    report.reason = "playwright package is not installed"
    writeJson(args.out, report)
    console.log("POS receipt-token browser smoke: attention needed")
    console.log(`Report: ${normalizeRelative(args.root, args.out)}`)
    if (args.mode === "fail") process.exitCode = 1
    return
  }

  report.scenarios = await runBrowserSmoke(args, playwright)
  report.ok = report.scenarios.every((scenario) => scenario.ok)
  writeJson(args.out, report)

  console.log(`POS receipt-token browser smoke: ${report.ok ? "ok" : "attention needed"}`)
  console.log(`Report: ${normalizeRelative(args.root, args.out)}`)
  for (const scenario of report.scenarios) {
    console.log(`${scenario.ok ? "OK" : "FAIL"} ${scenario.operator}`)
    if (scenario.error) console.log(`  ${scenario.error}`)
  }

  if (args.mode === "fail" && !report.ok) {
    process.exitCode = 1
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}

module.exports = {
  TARGET_PERMISSION,
  buildOperatorScenarios,
  buildSmokeCommand,
  ensureStorageStates,
  parseArgs,
  reportConfig,
  routeUrl,
}
