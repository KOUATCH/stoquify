#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const ASSET_NAME = "product-command-branch-close-2026-07-18.png"
const VIEWPORTS = {
  mobile: { width: 390, height: 844, expectedObjectFit: "cover", expectedAspectRatio: 6 / 5 },
  desktop: { width: 1440, height: 1000, expectedObjectFit: "contain", expectedAspectRatio: 36 / 25 },
}
const EXPECTED_CAPTIONS = {
  en: "Branch daily close with completion and evidence coverage",
  fr: "Clôture quotidienne d'agence avec avancement et couverture des preuves",
}

function parseArgs(argv) {
  const today = new Date().toISOString().slice(0, 10)
  const args = {
    root: process.cwd(),
    baseUrl: "http://localhost:3000",
    out: path.join(process.cwd(), "what-next", "ui-ux", "product-command-screenshot-browser-evidence-" + today + ".json"),
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
  throw new Error("Playwright is required for the Product Command screenshot smoke")
}

function routeUrl(baseUrl, routePath) {
  return new URL(routePath, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/").toString()
}

async function inspectProductCommand(browser, args, locale, viewportName) {
  const viewport = VIEWPORTS[viewportName]
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const pageErrors = []
  const failedRequests = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || "unknown" }))

  try {
    await page.goto(routeUrl(args.baseUrl, "/" + locale + "#product"), {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    })

    const figure = page.locator("[data-product-command-evidence]")
    await figure.waitFor({ state: "visible", timeout: args.timeoutMs })
    await figure.scrollIntoViewIfNeeded()

    const image = figure.locator("img")
    await image.waitFor({ state: "visible", timeout: args.timeoutMs })
    await page.waitForFunction(
      (assetName) => {
        const node = document.querySelector("[data-product-command-evidence] img")
        return Boolean(node && node.complete && node.naturalWidth > 0 && node.currentSrc.includes(assetName))
      },
      ASSET_NAME,
      { timeout: args.timeoutMs },
    )

    const imageState = await image.evaluate((node) => {
      const frame = node.parentElement
      const imageRect = node.getBoundingClientRect()
      const frameRect = frame.getBoundingClientRect()
      return {
        src: node.currentSrc,
        alt: node.alt,
        complete: node.complete,
        naturalWidth: node.naturalWidth,
        naturalHeight: node.naturalHeight,
        objectFit: getComputedStyle(node).objectFit,
        frameAspectRatio: frameRect.width / frameRect.height,
        frameWidth: frameRect.width,
        frameHeight: frameRect.height,
        imageWidth: imageRect.width,
        imageHeight: imageRect.height,
      }
    })
    const caption = ((await figure.locator("figcaption").textContent()) || "").replace(/\s+/g, " ").trim()
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    const assetRequests = await page.evaluate((assetName) =>
      performance.getEntriesByType("resource").filter((entry) => entry.name.includes(assetName)).map((entry) => entry.name), ASSET_NAME)
    const screenshotPath = path.join(args.screenshotsDir, "product-command-" + locale + "-" + viewportName + ".png")
    await figure.screenshot({ path: screenshotPath })

    const expectedCaption = EXPECTED_CAPTIONS[locale]
    const aspectRatioMatches = Math.abs(imageState.frameAspectRatio - viewport.expectedAspectRatio) < 0.03
    const ok =
      imageState.complete &&
      imageState.naturalWidth > 0 &&
      imageState.naturalHeight > 0 &&
      imageState.src.includes(ASSET_NAME) &&
      imageState.alt.length > 0 &&
      imageState.objectFit === viewport.expectedObjectFit &&
      aspectRatioMatches &&
      caption.includes(expectedCaption) &&
      assetRequests.length > 0 &&
      !horizontalOverflow &&
      pageErrors.length === 0 &&
      failedRequests.length === 0

    return {
      locale,
      viewport: viewportName,
      ok,
      expectedCaption,
      caption,
      image: imageState,
      expectedObjectFit: viewport.expectedObjectFit,
      expectedAspectRatio: viewport.expectedAspectRatio,
      aspectRatioMatches,
      assetRequests,
      horizontalOverflow,
      pageErrors,
      failedRequests,
      screenshot: path.relative(args.root, screenshotPath).replace(/\\/g, "/"),
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
        checks.push(await inspectProductCommand(browser, args, locale, viewportName))
      }
    }
  } finally {
    await browser.close()
  }

  const ok = checks.every((result) => result.ok)
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    sourceAsset: "public/images/" + ASSET_NAME,
    ok,
    checks,
  }

  fs.writeFileSync(args.out, JSON.stringify(report, null, 2) + "\n", "utf8")
  console.log("Product Command screenshot browser smoke: " + (ok ? "ok" : "failed"))
  console.log("Evidence: " + path.relative(args.root, args.out).replace(/\\/g, "/"))

  if (!ok) process.exitCode = 1
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { parseArgs, routeUrl }
