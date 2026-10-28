#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 1100 },
}

function parseArgs(argv) {
  const today = new Date().toISOString().slice(0, 10)
  const args = {
    root: process.cwd(),
    baseUrl: "http://localhost:3000",
    out: path.join(process.cwd(), "what-next", "ui-ux", "landing-packages-browser-evidence-" + today + ".json"),
    screenshotsDir: path.join(process.cwd(), "what-next", "ui-ux", "screenshots", today),
    timeoutMs: 60000,
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--base-url") args.baseUrl = argv[++index]
    else if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--screenshots-dir") args.screenshotsDir = path.resolve(argv[++index])
    else if (arg === "--timeout-ms") args.timeoutMs = Number.parseInt(argv[++index], 10)
    else throw new Error("Unknown argument: " + arg)
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
  throw new Error("Playwright is required for the landing packages smoke")
}

function routeUrl(baseUrl, routePath) {
  return new URL(routePath, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/").toString()
}

function relativePath(args, filePath) {
  return path.relative(args.root, filePath).split(path.sep).join("/")
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

async function captureSection(page, section, args, locale, viewportName, view) {
  const screenshotPath = path.join(args.screenshotsDir, `adoption-${locale}-${viewportName}-${view}.png`)
  const stickyHeader = page.locator("header.sticky").first()
  const hasStickyHeader = (await stickyHeader.count()) > 0
  const previousVisibility = hasStickyHeader
    ? await stickyHeader.evaluate((node) => node.style.visibility)
    : ""

  try {
    if (hasStickyHeader) {
      await stickyHeader.evaluate((node) => { node.style.visibility = "hidden" })
    }
    await section.screenshot({ path: screenshotPath })
  } finally {
    if (hasStickyHeader) {
      await stickyHeader.evaluate((node, visibility) => { node.style.visibility = visibility }, previousVisibility)
    }
  }

  return relativePath(args, screenshotPath)
}

async function inspectLanding(browser, args, locale, viewportName) {
  const context = await browser.newContext({ viewport: VIEWPORTS[viewportName] })
  const page = await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  try {
    await page.goto(routeUrl(args.baseUrl, "/" + locale), {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    })
    await page.waitForLoadState("networkidle", { timeout: Math.min(args.timeoutMs, 5000) }).catch(() => {})

    const section = page.locator("[data-adoption-section]")
    await section.waitFor({ state: "visible", timeout: args.timeoutMs })
    await section.scrollIntoViewIfNeeded()

    const foundation = section.locator("[data-platform-foundation]")
    await foundation.waitFor({ state: "visible", timeout: args.timeoutMs })

    const tabs = section.locator("[data-adoption-tab]")
    const tabCount = await tabs.count()
    const pathsTab = section.locator('[data-adoption-tab="paths"]')
    const extensionsTab = section.locator('[data-adoption-tab="extensions"]')
    const deliveryTab = section.locator('[data-adoption-tab="delivery"]')
    const initialPathsSelected = await pathsTab.getAttribute("aria-selected")
    const pathCount = await section.locator("[data-adoption-path]").count()
    const pathsScreenshot = await captureSection(page, section, args, locale, viewportName, "paths")

    await pathsTab.focus()
    await pathsTab.press("ArrowRight")
    await page.waitForFunction(
      () => document.querySelector('[data-adoption-panel="extensions"]') !== null,
      null,
      { timeout: args.timeoutMs },
    )
    const extensionsSelected = await extensionsTab.getAttribute("aria-selected")
    const extensionCount = await section.locator("[data-adoption-extension]").count()
    const extensionsScreenshot = await captureSection(page, section, args, locale, viewportName, "extensions")

    await extensionsTab.press("ArrowRight")
    await page.waitForFunction(
      () => document.querySelector('[data-adoption-panel="delivery"]') !== null,
      null,
      { timeout: args.timeoutMs },
    )
    const deliverySelected = await deliveryTab.getAttribute("aria-selected")
    const serviceCount = await section.locator("[data-adoption-service]").count()
    const deliveryScreenshot = await captureSection(page, section, args, locale, viewportName, "delivery")

    await deliveryTab.press("Home")
    await page.waitForFunction(
      () => document.querySelector('[data-adoption-panel="paths"]') !== null,
      null,
      { timeout: args.timeoutMs },
    )
    const homeReturnsToPaths = await pathsTab.getAttribute("aria-selected")
    const textLength = ((await section.textContent()) || "").trim().length
    const horizontalOverflow = await hasHorizontalOverflow(page)

    const ok =
      tabCount === 3 &&
      initialPathsSelected === "true" &&
      pathCount === 3 &&
      extensionsSelected === "true" &&
      extensionCount === 4 &&
      deliverySelected === "true" &&
      serviceCount === 4 &&
      homeReturnsToPaths === "true" &&
      textLength > 1800 &&
      !horizontalOverflow &&
      pageErrors.length === 0

    return {
      locale,
      viewport: viewportName,
      ok,
      platformFoundationVisible: await foundation.isVisible(),
      tabCount,
      initialPathsSelected,
      pathCount,
      extensionsSelected,
      extensionCount,
      deliverySelected,
      serviceCount,
      homeReturnsToPaths,
      textLength,
      horizontalOverflow,
      pageErrors,
      screenshots: {
        paths: pathsScreenshot,
        extensions: extensionsScreenshot,
        delivery: deliveryScreenshot,
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
        checks.push(await inspectLanding(browser, args, locale, viewportName))
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
    checks,
  }

  fs.writeFileSync(args.out, JSON.stringify(report, null, 2) + "\n", "utf8")
  console.log("Landing packages browser smoke: " + (ok ? "ok" : "failed"))
  console.log("Evidence: " + relativePath(args, args.out))
  if (!ok) process.exitCode = 1
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { parseArgs, routeUrl }
