#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 1000 },
}
const STAGE_KEYS = ["people", "payroll", "proof", "close"]

function parseArgs(argv) {
  const today = new Date().toISOString().slice(0, 10)
  const evidenceRoot = path.join(
    process.cwd(),
    "what-next",
    "ui-ux",
    "people-to-pay-refinement",
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
  throw new Error("Playwright is required for the People to pay browser smoke")
}

function routeUrl(baseUrl, locale) {
  return new URL(`/${locale}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString()
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

async function inspectPeopleToPay(browser, args, locale, viewportName) {
  const viewport = VIEWPORTS[viewportName]
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" })
  const page = await context.newPage()
  const diagnostics = attachDiagnostics(page)

  try {
    const response = await page.goto(routeUrl(args.baseUrl, locale), {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    })
    await page.waitForLoadState("networkidle", { timeout: Math.min(args.timeoutMs, 5000) }).catch(() => {})

    const section = page.locator("[data-people-to-pay]")
    await section.waitFor({ state: "visible", timeout: args.timeoutMs })
    await section.scrollIntoViewIfNeeded()

    const stages = section.locator("[data-people-stage]")
    const stageKeys = await stages.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-people-stage")),
    )
    const stageTextLengths = await stages.evaluateAll((nodes) =>
      nodes.map((node) => (node.textContent || "").trim().length),
    )
    const flowTag = await section.locator("[data-people-to-pay-flow]").evaluate((node) =>
      node.tagName.toLowerCase(),
    )
    const flowAria = await section.locator("[data-people-to-pay-flow]").getAttribute("aria-label")
    const definitionTermCount = await section.locator("[data-people-stage] dt").count()
    const definitionValueCount = await section.locator("[data-people-stage] dd").count()
    const implementedVisible = await section.locator("[data-people-implemented]").isVisible()
    const gatedVisible = await section.locator("[data-people-gated]").isVisible()
    const carouselCount = await section.locator('[aria-roledescription="carousel"]').count()
    const unsafeLinkCount = await section
      .locator('a[href*="/dashboard"], a[href*="/register"]')
      .count()
    const ctaHrefs = await section.locator("a").evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href")),
    )

    const layout = await section.evaluate((node, desktop) => {
      const stageNodes = Array.from(node.querySelectorAll("[data-people-stage]"))
      const stageRects = stageNodes.map((stage) => {
        const rect = stage.getBoundingClientRect()
        return {
          key: stage.getAttribute("data-people-stage"),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        }
      })
      const overlaps = []

      for (let first = 0; first < stageRects.length; first += 1) {
        for (let second = first + 1; second < stageRects.length; second += 1) {
          const a = stageRects[first]
          const b = stageRects[second]
          const horizontal = Math.min(a.right, b.right) - Math.max(a.left, b.left)
          const vertical = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          if (horizontal > 1 && vertical > 1) overlaps.push([a.key, b.key])
        }
      }

      const sequenceCorrect = desktop
        ? stageRects.every(
            (rect, index) =>
              index === 0 ||
              (rect.left > stageRects[index - 1].left &&
                Math.abs(rect.top - stageRects[index - 1].top) < 2),
          )
        : stageRects.every(
            (rect, index) => index === 0 || rect.top > stageRects[index - 1].top,
          )
      const clippedText = Array.from(
        node.querySelectorAll("h2, h3, p, dt, dd, a, [data-people-stage] span"),
      )
        .filter(
          (textNode) =>
            textNode.scrollWidth > textNode.clientWidth + 1 ||
            textNode.scrollHeight > textNode.clientHeight + 4,
        )
        .map((textNode) => (textNode.textContent || "").trim().slice(0, 80))

      return {
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        sectionWidth: node.getBoundingClientRect().width,
        viewportWidth: window.innerWidth,
        stageRects,
        overlaps,
        sequenceCorrect,
        clippedText,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      }
    }, viewportName === "desktop")

    const screenshotPath = path.join(
      args.screenshotsDir,
      `after-${locale}-${viewportName}.png`,
    )
    await section.screenshot({ path: screenshotPath })

    const firstCta = section.locator('a[href*="#pricing"]').first()
    await firstCta.focus()
    const ctaFocused = await firstCta.evaluate((node) => document.activeElement === node)
    await firstCta.press("Enter")
    await page.waitForFunction(() => window.location.hash === "#pricing", null, {
      timeout: args.timeoutMs,
    })

    const status = response?.status() || 0
    const ok =
      status >= 200 &&
      status < 400 &&
      JSON.stringify(stageKeys) === JSON.stringify(STAGE_KEYS) &&
      stageTextLengths.every((length) => length > 180) &&
      flowTag === "ol" &&
      Boolean(flowAria && flowAria.length > 40) &&
      definitionTermCount === 8 &&
      definitionValueCount === 8 &&
      implementedVisible &&
      gatedVisible &&
      carouselCount === 0 &&
      unsafeLinkCount === 0 &&
      ctaHrefs.length === 2 &&
      ctaHrefs.every((href) => Boolean(href && href.includes("#pricing"))) &&
      !layout.documentOverflow &&
      layout.overlaps.length === 0 &&
      layout.sequenceCorrect &&
      layout.clippedText.length === 0 &&
      layout.reducedMotion &&
      ctaFocused &&
      new URL(page.url()).hash === "#pricing" &&
      diagnostics.pageErrors.length === 0 &&
      diagnostics.consoleErrors.length === 0 &&
      diagnostics.criticalRequestFailures.length === 0

    return {
      locale,
      viewport: viewportName,
      ok,
      status,
      stageKeys,
      stageTextLengths,
      flowTag,
      flowAria,
      definitionTermCount,
      definitionValueCount,
      implementedVisible,
      gatedVisible,
      carouselCount,
      unsafeLinkCount,
      ctaHrefs,
      ctaFocused,
      keyboardDestination: `${new URL(page.url()).pathname}${new URL(page.url()).hash}`,
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
    for (const locale of ["en", "fr"]) {
      for (const viewportName of Object.keys(VIEWPORTS)) {
        checks.push(await inspectPeopleToPay(browser, args, locale, viewportName))
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

  console.log(`People to pay browser smoke: ${ok ? "ok" : "failed"}`)
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
