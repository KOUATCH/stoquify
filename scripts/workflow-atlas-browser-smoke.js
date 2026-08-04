#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 1100 },
}

const DEFAULT_EVIDENCE_ROOT = path.join(
  "what-next",
  "workflow-atlas-role-conditioned-outcomes",
)

function parseArgs(argv, root = process.cwd()) {
  const args = {
    root,
    baseUrl: "http://127.0.0.1:3000",
    out: path.resolve(root, DEFAULT_EVIDENCE_ROOT, "browser-evidence.json"),
    screenshotsDir: path.resolve(root, DEFAULT_EVIDENCE_ROOT, "screenshots"),
    timeoutMs: 60000,
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--base-url") args.baseUrl = argv[++index]
    else if (arg === "--out") args.out = path.resolve(root, argv[++index])
    else if (arg === "--screenshots-dir") args.screenshotsDir = path.resolve(root, argv[++index])
    else if (arg === "--timeout-ms") args.timeoutMs = Number.parseInt(argv[++index], 10)
    else throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function loadPlaywright(root) {
  for (const packageName of ["playwright", "@playwright/test"]) {
    try {
      const modulePath = require.resolve(packageName, { paths: [root] })
      const mod = require(modulePath)
      if (mod.chromium) return mod
    } catch {
      // Try the next supported Playwright package.
    }
  }
  throw new Error("Playwright is required for the Workflow Atlas browser smoke")
}

function routeUrl(baseUrl, locale) {
  return new URL(`/${locale}/workflows`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString()
}

function relativePath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/")
}

function attachDiagnostics(page) {
  const diagnostics = {
    pageErrors: [],
    consoleErrors: [],
    criticalRequestFailures: [],
  }

  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text())
  })
  page.on("requestfailed", (request) => {
    if (["document", "script", "stylesheet", "image"].includes(request.resourceType())) {
      diagnostics.criticalRequestFailures.push({
        url: request.url(),
        error: request.failure()?.errorText || "request failed",
      })
    }
  })

  return diagnostics
}

async function attributeKeys(locator, attribute) {
  return locator.evaluateAll(
    (nodes, attributeName) => nodes.map((node) => node.getAttribute(attributeName)),
    attribute,
  )
}

async function inspectAtlas(browser, args, locale, viewportName) {
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewportName],
    reducedMotion: "reduce",
  })
  const page = await context.newPage()
  const diagnostics = attachDiagnostics(page)

  try {
    const response = await page.goto(routeUrl(args.baseUrl, locale), {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    })
    await page.waitForLoadState("networkidle", { timeout: Math.min(args.timeoutMs, 5000) }).catch(() => {})

    const atlas = page.locator("[data-workflow-atlas]")
    await atlas.waitFor({ state: "visible", timeout: args.timeoutMs })

    const roles = atlas.locator("[data-workflow-atlas-role]")
    const outcomes = atlas.locator("[data-workflow-atlas-outcome]")
    const initialRoleCount = await roles.count()
    const initialOutcomeCount = await outcomes.count()

    const cashierButton = atlas.locator('[data-workflow-atlas-role="cashier"]')
    await cashierButton.focus()
    await cashierButton.press("Enter")
    await page.waitForFunction(
      () => document.querySelectorAll("[data-workflow-atlas-outcome]").length === 3,
      null,
      { timeout: args.timeoutMs },
    )
    const cashierOutcomeKeys = await attributeKeys(outcomes, "data-workflow-atlas-outcome")

    const stockOutcome = atlas.locator('[data-workflow-atlas-outcome="stock"]')
    await stockOutcome.focus()
    await stockOutcome.press("Space")
    await page.waitForFunction(
      () => document.querySelector('[data-workflow-atlas-outcome="stock"]')?.getAttribute("aria-pressed") === "true",
      null,
      { timeout: args.timeoutMs },
    )

    const purchasingButton = atlas.locator('[data-workflow-atlas-role="purchasing"]')
    await purchasingButton.focus()
    await purchasingButton.press("Enter")
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-workflow-atlas-outcome]").length === 2 &&
        !document.querySelector('[data-workflow-atlas-outcome="stock"]'),
      null,
      { timeout: args.timeoutMs },
    )

    const purchasingOutcomeKeys = await attributeKeys(outcomes, "data-workflow-atlas-outcome")
    const allOutcomePressed = await atlas
      .locator('[data-workflow-atlas-outcome="all"]')
      .getAttribute("aria-pressed")
    const resultCounts = {
      recommendations: await atlas.locator(
        "[data-workflow-recommendations] [data-workflow-atlas-section]",
      ).count(),
      map: await atlas.locator("[data-workflow-map-index] a").count(),
      library: await atlas.locator(
        "[data-workflow-playbook-library] [data-workflow-atlas-section]",
      ).count(),
    }
    const liveAnnouncement = ((await atlas.locator("[data-workflow-atlas-live]").textContent()) || "").trim()
    const focusedRole = await purchasingButton.evaluate((node) => document.activeElement === node)

    const layout = await page.evaluate(() => {
      const clippedText = Array.from(
        document.querySelectorAll(
          "[data-workflow-atlas] button, [data-workflow-atlas] h1, [data-workflow-atlas] h2, [data-workflow-atlas] h3, [data-workflow-atlas] a",
        ),
      )
        .filter(
          (node) =>
            node.scrollWidth > node.clientWidth + 1 ||
            node.scrollHeight > node.clientHeight + 4,
        )
        .map((node) => (node.textContent || "").trim().slice(0, 80))

      return {
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        clippedText,
      }
    })

    const decisionScreenshot = path.join(
      args.screenshotsDir,
      `workflow-atlas-decision-${locale}-${viewportName}.png`,
    )
    const launchpadScreenshot = path.join(
      args.screenshotsDir,
      `workflow-atlas-launchpad-${locale}-${viewportName}.png`,
    )
    await atlas.locator("[data-workflow-decision-bar]").screenshot({ path: decisionScreenshot })
    await atlas.locator("[data-workflow-launchpad]").screenshot({ path: launchpadScreenshot })

    const status = response?.status() || 0
    const ok =
      status >= 200 &&
      status < 400 &&
      initialRoleCount === 9 &&
      initialOutcomeCount === 13 &&
      JSON.stringify(cashierOutcomeKeys) === JSON.stringify(["all", "sell", "stock"]) &&
      JSON.stringify(purchasingOutcomeKeys) === JSON.stringify(["all", "buy"]) &&
      allOutcomePressed === "true" &&
      Object.values(resultCounts).every((count) => count === 1) &&
      liveAnnouncement.length > 0 &&
      focusedRole &&
      !layout.horizontalOverflow &&
      layout.clippedText.length === 0 &&
      diagnostics.pageErrors.length === 0 &&
      diagnostics.consoleErrors.length === 0 &&
      diagnostics.criticalRequestFailures.length === 0

    return {
      locale,
      viewport: viewportName,
      ok,
      status,
      initialRoleCount,
      initialOutcomeCount,
      cashierOutcomeKeys,
      purchasingOutcomeKeys,
      allOutcomePressed,
      resultCounts,
      liveAnnouncement,
      focusedRole,
      layout,
      ...diagnostics,
      screenshots: {
        decision: relativePath(args.root, decisionScreenshot),
        launchpad: relativePath(args.root, launchpadScreenshot),
      },
    }
  } finally {
    await page.close()
    await context.close()
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const playwright = loadPlaywright(args.root)
  fs.mkdirSync(path.dirname(args.out), { recursive: true })
  fs.mkdirSync(args.screenshotsDir, { recursive: true })

  const browser = await playwright.chromium.launch({ headless: true })
  const checks = []

  try {
    for (const locale of ["en", "fr"]) {
      for (const viewportName of Object.keys(VIEWPORTS)) {
        checks.push(await inspectAtlas(browser, args, locale, viewportName))
      }
    }
  } finally {
    await browser.close()
  }

  const ok = checks.every((check) => check.ok)
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    ok,
    viewports: VIEWPORTS,
    checks,
  }
  fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`, "utf8")

  console.log(`Workflow Atlas browser smoke: ${ok ? "ok" : "failed"}`)
  console.log(`Evidence: ${relativePath(args.root, args.out)}`)
  if (!ok) process.exitCode = 1
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { DEFAULT_EVIDENCE_ROOT, VIEWPORTS, parseArgs, routeUrl }
