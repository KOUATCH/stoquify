#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 1000 },
}
const LOCALES = ["en", "fr"]
const SECTION_KEYS = ["hero", "problem", "journey", "proof", "pathways", "trust", "adoption"]
const JOURNEY_KEYS = ["foundation", "operation", "control", "growth"]
const PATHWAY_KEYS = ["retail", "inventory", "finance", "leadership"]

function parseArgs(argv) {
  const today = new Date().toISOString().slice(0, 10)
  const evidenceRoot = path.join(
    process.cwd(),
    "what-next",
    "ui-ux",
    "landing-founder-preview",
    today,
    "comparison",
  )
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
  throw new Error("Playwright is required for the landing founder preview smoke")
}

function routeUrl(baseUrl, locale, preview) {
  const route = preview ? `/${locale}/landing-preview/founder-journey` : `/${locale}`
  return new URL(route, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString()
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

async function captureCurrent(browser, args, locale, viewportName) {
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewportName],
    reducedMotion: "reduce",
  })
  const page = await context.newPage()
  const diagnostics = attachDiagnostics(page)

  try {
    const response = await page.goto(routeUrl(args.baseUrl, locale, false), {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    })
    await page.waitForLoadState("networkidle", { timeout: Math.min(args.timeoutMs, 5000) }).catch(() => {})

    const screenshotPath = path.join(args.screenshotsDir, `current-${locale}-${viewportName}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })

    const layout = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() || "",
      documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    }))
    const status = response?.status() || 0

    return {
      surface: "current",
      locale,
      viewport: viewportName,
      ok: status >= 200 && status < 400 && !layout.documentOverflow && diagnostics.pageErrors.length === 0,
      status,
      layout,
      ...diagnostics,
      screenshot: relativePath(args.root, screenshotPath),
    }
  } finally {
    await page.close()
    await context.close()
  }
}

async function capturePreview(browser, args, locale, viewportName) {
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewportName],
    reducedMotion: "reduce",
  })
  const page = await context.newPage()
  const diagnostics = attachDiagnostics(page)

  try {
    const response = await page.goto(routeUrl(args.baseUrl, locale, true), {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    })
    await page.waitForLoadState("networkidle", { timeout: Math.min(args.timeoutMs, 5000) }).catch(() => {})
    await page.locator("[data-founder-preview]").waitFor({ state: "visible", timeout: args.timeoutMs })

    const sections = page.locator("[data-preview-section]")
    const journeyStages = page.locator("[data-preview-journey-stage]")
    const pathways = page.locator("[data-preview-pathway]")
    const productImages = page.locator('img[src*="product-command-branch-close-2026-07-18"]')
    const robots = (await page.locator('meta[name="robots"]').getAttribute("content")) || ""
    const screenshotPath = path.join(args.screenshotsDir, `preview-${locale}-${viewportName}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })

    const sectionKeys = await sections.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-preview-section")),
    )
    const journeyKeys = await journeyStages.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-preview-journey-stage")),
    )
    const pathwayKeys = await pathways.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-preview-pathway")),
    )
    const imageState = await productImages.evaluateAll((nodes) =>
      nodes.map((node) => ({
        complete: node.complete,
        naturalWidth: node.naturalWidth,
        naturalHeight: node.naturalHeight,
      })),
    )
    const layout = await page.evaluate(() => {
      const problemTop =
        document.querySelector('[data-preview-section="problem"]')?.getBoundingClientRect().top ??
        Number.POSITIVE_INFINITY
      const clipped = Array.from(
        document.querySelectorAll(
          "[data-preview-section] h1, [data-preview-section] h2, [data-preview-section] h3, [data-preview-section] a",
        ),
      )
        .filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 4)
        .map((node) => (node.textContent || "").trim().slice(0, 80))

      return {
        h1: document.querySelector("h1")?.textContent?.trim() || "",
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        problemTop,
        nextSectionHintVisible: problemTop < window.innerHeight,
        clippedText: clipped,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      }
    })
    const unsafeLinks = await page.locator('a[href*="/register"], a[href*="/dashboard"]').count()
    const carouselCount = await page.locator('[aria-roledescription="carousel"]').count()
    const primaryCta = page.locator('a[href="#adoption"]').first()
    await primaryCta.focus()
    const ctaFocused = await primaryCta.evaluate((node) => document.activeElement === node)
    await primaryCta.press("Enter")
    await page.waitForFunction(() => window.location.hash === "#adoption", null, {
      timeout: args.timeoutMs,
    })

    const status = response?.status() || 0
    const ok =
      status >= 200 &&
      status < 400 &&
      JSON.stringify(sectionKeys) === JSON.stringify(SECTION_KEYS) &&
      JSON.stringify(journeyKeys) === JSON.stringify(JOURNEY_KEYS) &&
      JSON.stringify(pathwayKeys) === JSON.stringify(PATHWAY_KEYS) &&
      layout.h1 === "Stoquify" &&
      layout.reducedMotion &&
      layout.nextSectionHintVisible &&
      !layout.documentOverflow &&
      layout.clippedText.length === 0 &&
      robots.includes("noindex") &&
      robots.includes("nofollow") &&
      imageState.length === 2 &&
      imageState.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) &&
      unsafeLinks === 0 &&
      carouselCount === 0 &&
      ctaFocused &&
      new URL(page.url()).hash === "#adoption" &&
      diagnostics.pageErrors.length === 0 &&
      diagnostics.consoleErrors.length === 0 &&
      diagnostics.criticalRequestFailures.length === 0

    return {
      surface: "preview",
      locale,
      viewport: viewportName,
      ok,
      status,
      sectionKeys,
      journeyKeys,
      pathwayKeys,
      robots,
      imageState,
      unsafeLinks,
      carouselCount,
      ctaFocused,
      keyboardDestination: new URL(page.url()).pathname + new URL(page.url()).hash,
      layout,
      ...diagnostics,
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
    for (const locale of LOCALES) {
      for (const viewportName of Object.keys(VIEWPORTS)) {
        checks.push(await captureCurrent(browser, args, locale, viewportName))
        checks.push(await capturePreview(browser, args, locale, viewportName))
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

  console.log(`Landing founder preview browser smoke: ${ok ? "ok" : "failed"}`)
  console.log(`Evidence: ${relativePath(args.root, args.out)}`)
  if (!ok) process.exitCode = 1
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { parseArgs, routeUrl }
