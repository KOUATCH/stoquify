#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 1000 },
}

const EXPECTED_TITLES = {
  en: "From your first sale to controlled growth.",
  fr: "Du premier encaissement à une croissance maîtrisée.",
}

function parseArgs(argv) {
  const today = new Date().toISOString().slice(0, 10)
  const evidenceRoot = path.join(process.cwd(), "what-next", "ui-ux", "landing-founder-journey", today)
  const args = {
    root: process.cwd(),
    baseUrl: "http://localhost:3000",
    out: path.join(evidenceRoot, "browser-evidence.json"),
    screenshotsDir: path.join(evidenceRoot, "screenshots"),
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
  throw new Error("Playwright is required for the landing founder journey smoke")
}

function routeUrl(baseUrl, locale) {
  return new URL("/" + locale, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/").toString()
}

function relativePath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/")
}

async function inspectLayout(page) {
  return page.locator("[data-founder-journey]").evaluate((journey) => {
    const stageNodes = Array.from(journey.querySelectorAll("[data-founder-stage]"))
    const rectangles = stageNodes.map((node) => {
      const rect = node.getBoundingClientRect()
      return { key: node.getAttribute("data-founder-stage"), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
    })
    const overlaps = []

    for (let first = 0; first < rectangles.length; first += 1) {
      for (let second = first + 1; second < rectangles.length; second += 1) {
        const a = rectangles[first]
        const b = rectangles[second]
        const horizontal = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const vertical = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (horizontal > 1 && vertical > 1) overlaps.push([a.key, b.key])
      }
    }

    return {
      documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      clippedStages: stageNodes
        .filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1)
        .map((node) => node.getAttribute("data-founder-stage")),
      overlaps,
    }
  })
}

async function inspectJourney(browser, args, locale, viewportName) {
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewportName],
    reducedMotion: "reduce",
  })
  const page = await context.newPage()
  const pageErrors = []
  const consoleErrors = []
  const criticalRequestFailures = []

  page.on("pageerror", (error) => pageErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  page.on("requestfailed", (request) => {
    if (["document", "script", "stylesheet", "image"].includes(request.resourceType())) {
      criticalRequestFailures.push({ url: request.url(), error: request.failure()?.errorText || "request failed" })
    }
  })

  try {
    await page.goto(routeUrl(args.baseUrl, locale), {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    })
    await page.waitForLoadState("networkidle", { timeout: Math.min(args.timeoutMs, 5000) }).catch(() => {})

    const journey = page.locator("[data-founder-journey]")
    await journey.waitFor({ state: "visible", timeout: args.timeoutMs })
    await journey.scrollIntoViewIfNeeded()

    const stages = journey.locator("[data-founder-stage]")
    const stageCount = await stages.count()
    const stageKeys = await stages.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-founder-stage")))
    const stageTextLengths = await stages.evaluateAll((nodes) => nodes.map((node) => (node.textContent || "").trim().length))
    const title = ((await journey.locator("[data-founder-journey-title]").textContent()) || "").trim()
    const carouselCount = await journey.locator('[aria-roledescription="carousel"]').count()
    const reducedMotion = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    const layout = await inspectLayout(page)

    const cta = journey.locator("[data-founder-journey-cta]")
    const ctaHref = await cta.getAttribute("href")
    const ctaUrl = new URL(ctaHref || "", page.url())
    await cta.focus()
    const ctaFocused = await cta.evaluate((node) => document.activeElement === node)

    const screenshotPath = path.join(args.screenshotsDir, `founder-journey-${locale}-${viewportName}.png`)
    await journey.screenshot({ path: screenshotPath })

    await cta.press("Enter")
    await page.waitForFunction(() => window.location.hash === "#pricing", null, { timeout: args.timeoutMs })
    const keyboardDestination = new URL(page.url())

    const ok =
      stageCount === 4 &&
      JSON.stringify(stageKeys) === JSON.stringify(["foundation", "launch", "control", "growth"]) &&
      stageTextLengths.every((length) => length > 120) &&
      title === EXPECTED_TITLES[locale] &&
      carouselCount === 0 &&
      reducedMotion &&
      ctaUrl.hash === "#pricing" &&
      keyboardDestination.hash === "#pricing" &&
      ctaFocused &&
      !layout.documentOverflow &&
      layout.clippedStages.length === 0 &&
      layout.overlaps.length === 0 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0 &&
      criticalRequestFailures.length === 0

    return {
      locale,
      viewport: viewportName,
      ok,
      title,
      stageCount,
      stageKeys,
      stageTextLengths,
      carouselCount,
      reducedMotion,
      ctaHref,
      ctaFocused,
      keyboardDestination: keyboardDestination.pathname + keyboardDestination.hash,
      layout,
      pageErrors,
      consoleErrors,
      criticalRequestFailures,
      screenshot: relativePath(args.root, screenshotPath),
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
        checks.push(await inspectJourney(browser, args, locale, viewportName))
      }
    }
  } finally {
    await browser.close()
  }

  const ok = checks.every((check) => check.ok)
  const report = { generatedAt: new Date().toISOString(), baseUrl: args.baseUrl, ok, checks }
  fs.writeFileSync(args.out, JSON.stringify(report, null, 2) + "\n", "utf8")

  console.log("Landing founder journey browser smoke: " + (ok ? "ok" : "failed"))
  console.log("Evidence: " + relativePath(args.root, args.out))
  if (!ok) process.exitCode = 1
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { parseArgs, routeUrl }
