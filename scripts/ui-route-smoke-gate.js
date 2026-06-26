#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const DEFAULT_ROUTES = [
  {
    id: "public-home",
    path: "/en",
    surface: "Public first impression",
    requiresAuth: false,
    viewports: ["mobile", "desktop"],
  },
  {
    id: "login",
    path: "/en/login",
    surface: "Authentication",
    requiresAuth: false,
    viewports: ["mobile", "desktop"],
  },
  {
    id: "dashboard",
    path: "/en/dashboard",
    surface: "Today's Operating Truth",
    requiresAuth: true,
    viewports: ["mobile", "tablet", "desktop"],
  },
  {
    id: "finance",
    path: "/en/dashboard/finance",
    surface: "Finance command center",
    requiresAuth: true,
    viewports: ["tablet", "desktop"],
  },
  {
    id: "payroll",
    path: "/en/dashboard/payroll",
    surface: "Payroll command center",
    requiresAuth: true,
    viewports: ["tablet", "desktop"],
  },
  {
    id: "inventory-items",
    path: "/en/dashboard/inventory/items",
    surface: "Inventory items",
    requiresAuth: true,
    viewports: ["mobile", "desktop"],
  },
  {
    id: "pos",
    path: "/en/dashboard/pos",
    surface: "Point of sale",
    requiresAuth: true,
    viewports: ["tablet", "desktop"],
  },
]

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 1100 },
}

const ACCEPTED_PUBLIC_STATUSES = new Set([200, 301, 302, 303, 307, 308])
const ACCEPTED_PROTECTED_STATUSES = new Set([200, 301, 302, 303, 307, 308, 401, 403])
const ERROR_MARKERS = [
  "Application error",
  "Internal Server Error",
  "Unhandled Runtime Error",
  "This page could not be found",
]

function parseArgs(argv) {
  const today = new Date().toISOString().slice(0, 10)
  const args = {
    root: process.cwd(),
    baseUrl: "http://localhost:3000",
    mode: "report",
    out: path.join(process.cwd(), "what-next", "ui-ux", `ui-route-smoke-${today}.json`),
    screenshotsDir: path.join(process.cwd(), "what-next", "ui-ux", "screenshots", today),
    timeoutMs: 15000,
    requireScreenshots: false,
    routeIds: null,
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--base-url") args.baseUrl = argv[++index]
    else if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--screenshots-dir") args.screenshotsDir = path.resolve(argv[++index])
    else if (arg === "--timeout-ms") args.timeoutMs = Number.parseInt(argv[++index], 10)
    else if (arg === "--require-screenshots") args.requireScreenshots = true
    else if (arg === "--route") {
      args.routeIds = args.routeIds || new Set()
      args.routeIds.add(argv[++index])
    } else if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!["report", "fail"].includes(args.mode)) {
    throw new Error("--mode must be one of: report, fail")
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 1000) {
    throw new Error("--timeout-ms must be a number greater than or equal to 1000")
  }

  return args
}

function printHelp() {
  console.log(`AqStoqFlow UI route smoke gate

Usage:
  node scripts/ui-route-smoke-gate.js [--mode report|fail] [--base-url http://localhost:3000] [--out file]

Options:
  --route id               Limit the run to one route id. Can be repeated.
  --require-screenshots    Fail when Playwright is unavailable or screenshot capture fails.
  --screenshots-dir dir    Directory for screenshots when Playwright is installed.

The gate always checks HTTP reachability. If the optional playwright package is
installed, it also captures desktop/tablet/mobile screenshots for the selected
high-value routes.
`)
}

function selectedRoutes(args) {
  if (!args.routeIds) return DEFAULT_ROUTES
  return DEFAULT_ROUTES.filter((route) => args.routeIds.has(route.id))
}

function routeUrl(baseUrl, routePath) {
  return new URL(routePath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString()
}

async function withTimeout(timeoutMs, operation) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await operation(controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}

async function checkHttp(args, route) {
  const startedAt = Date.now()
  const url = routeUrl(args.baseUrl, route.path)

  try {
    const response = await withTimeout(args.timeoutMs, (signal) =>
      fetch(url, {
        redirect: "follow",
        signal,
        headers: {
          "user-agent": "aqstoqflow-ui-route-smoke-gate",
        },
      }),
    )
    const text = await response.text()
    const acceptedStatuses = route.requiresAuth ? ACCEPTED_PROTECTED_STATUSES : ACCEPTED_PUBLIC_STATUSES
    const markers = ERROR_MARKERS.filter((marker) => text.includes(marker))
    const ok = acceptedStatuses.has(response.status) && markers.length === 0

    return {
      ok,
      status: response.status,
      finalUrl: response.url,
      durationMs: Date.now() - startedAt,
      errorMarkers: markers,
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      finalUrl: url,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function loadPlaywright(root) {
  try {
    const modulePath = require.resolve("playwright", { paths: [root] })
    return require(modulePath)
  } catch {
    return null
  }
}

async function captureScreenshots(args, routes, playwright) {
  if (!playwright) {
    return {
      available: false,
      reason: "playwright package is not installed",
      captures: routes.flatMap((route) =>
        route.viewports.map((viewport) => ({
          routeId: route.id,
          viewport,
          ok: false,
          skipped: true,
          reason: "missing_playwright",
        })),
      ),
    }
  }

  fs.mkdirSync(args.screenshotsDir, { recursive: true })

  const browser = await playwright.chromium.launch({ headless: true })
  const captures = []

  try {
    for (const route of routes) {
      for (const viewportName of route.viewports) {
        const viewport = VIEWPORTS[viewportName]
        const page = await browser.newPage({ viewport })
        const fileName = `${route.id}-${viewportName}.png`
        const filePath = path.join(args.screenshotsDir, fileName)

        try {
          await page.goto(routeUrl(args.baseUrl, route.path), {
            waitUntil: "networkidle",
            timeout: args.timeoutMs,
          })
          await page.screenshot({ path: filePath, fullPage: true })
          captures.push({
            routeId: route.id,
            viewport: viewportName,
            ok: true,
            file: path.relative(args.root, filePath).replace(/\\/g, "/"),
          })
        } catch (error) {
          captures.push({
            routeId: route.id,
            viewport: viewportName,
            ok: false,
            file: path.relative(args.root, filePath).replace(/\\/g, "/"),
            error: error instanceof Error ? error.message : String(error),
          })
        } finally {
          await page.close().catch(() => {})
        }
      }
    }
  } finally {
    await browser.close().catch(() => {})
  }

  return {
    available: true,
    captures,
  }
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
}

async function main() {
  const args = parseArgs(process.argv)
  const routes = selectedRoutes(args)

  if (routes.length === 0) {
    throw new Error("No routes selected. Use one of: " + DEFAULT_ROUTES.map((route) => route.id).join(", "))
  }

  const httpResults = []
  for (const route of routes) {
    httpResults.push({
      route,
      http: await checkHttp(args, route),
    })
  }

  const playwright = loadPlaywright(args.root)
  const screenshots = await captureScreenshots(args, routes, playwright)
  const routeFailures = httpResults.filter((result) => !result.http.ok)
  const screenshotFailures = screenshots.captures.filter((capture) => !capture.ok && !capture.skipped)
  const screenshotBlocked = args.requireScreenshots && screenshots.captures.some((capture) => !capture.ok)
  const ok = routeFailures.length === 0 && screenshotFailures.length === 0 && !screenshotBlocked
  const report = {
    checkedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    mode: args.mode,
    ok,
    routeCount: routes.length,
    screenshotTool: screenshots.available ? "playwright" : "unavailable",
    routes: httpResults,
    screenshots,
  }

  writeJson(args.out, report)

  console.log(`UI route smoke: ${ok ? "ok" : "attention needed"}`)
  console.log(`Report: ${path.relative(args.root, args.out).replace(/\\/g, "/")}`)
  if (!screenshots.available) {
    console.log("Screenshots skipped: playwright package is not installed.")
  }
  for (const result of httpResults) {
    const marker = result.http.ok ? "OK" : "FAIL"
    console.log(`${marker} ${result.route.id} ${result.route.path} status=${result.http.status ?? "error"}`)
  }

  if (args.mode === "fail" && !ok) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
