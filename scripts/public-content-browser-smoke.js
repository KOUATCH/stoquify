#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const VIEWPORTS = {
  mobile: { width: 390, height: 844, expectedSlides: 1 },
  tablet: { width: 834, height: 1112, expectedSlides: 2 },
  desktop: { width: 1440, height: 1100, expectedSlides: 3 },
}

function parseArgs(argv) {
  const today = new Date().toISOString().slice(0, 10)
  const args = {
    root: process.cwd(),
    baseUrl: "http://localhost:3000",
    out: path.join(process.cwd(), "what-next", "ui-ux", "public-content-browser-evidence-" + today + ".json"),
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
  throw new Error("Playwright is required for the public content browser smoke")
}

function routeUrl(baseUrl, routePath) {
  return new URL(routePath, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/").toString()
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

async function visibleSlideCount(slides) {
  return slides.evaluateAll((nodes) => {
    const viewport = nodes[0] && nodes[0].parentElement && nodes[0].parentElement.parentElement
    if (!viewport) return 0
    const viewportRect = viewport.getBoundingClientRect()

    return nodes.filter((node) => {
      const rect = node.getBoundingClientRect()
      const overlap = Math.max(0, Math.min(rect.right, viewportRect.right) - Math.max(rect.left, viewportRect.left))
      return overlap >= rect.width * 0.5
    }).length
  })
}

async function inspectCarousel(browser, args, locale, viewportName) {
  const viewport = VIEWPORTS[viewportName]
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  try {
    await page.goto(routeUrl(args.baseUrl, "/" + locale), {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    })
    const carousel = page.locator("[data-use-cases-carousel]")
    await carousel.waitFor({ state: "visible", timeout: args.timeoutMs })
    await carousel.scrollIntoViewIfNeeded()

    const activeIndicator = carousel.locator('button[aria-current="true"]')
    await activeIndicator.waitFor({ state: "visible", timeout: args.timeoutMs })

    const slides = carousel.locator("[data-use-case-slide]")
    const slideCount = await slides.count()
    const visibleBefore = await visibleSlideCount(slides)
    const position = carousel.locator('[aria-live="polite"]')
    const before = (await position.textContent())?.trim() || ""
    const next = carousel.locator("[data-carousel-next]")
    await next.focus()
    await next.press("Enter")
    await page.waitForFunction(
      (previous) => {
        const current = document.querySelector('[data-use-cases-carousel] [aria-live="polite"]')
        return Boolean(current && current.textContent && current.textContent.trim() !== previous)
      },
      before,
      { timeout: args.timeoutMs },
    )
    const after = (await position.textContent())?.trim() || ""
    const indicatorCount = await carousel.locator('button[aria-label*="use case"], button[aria-label*="cas d\'usage"]').count()
    const touchAction = await carousel.locator(".touch-pan-y").evaluate((node) => getComputedStyle(node).touchAction)
    const horizontalOverflow = await hasHorizontalOverflow(page)
    const screenshotPath = path.join(args.screenshotsDir, "use-cases-" + locale + "-" + viewportName + ".png")
    await carousel.screenshot({ path: screenshotPath })

    const ok =
      slideCount === 14 &&
      visibleBefore === viewport.expectedSlides &&
      before !== after &&
      indicatorCount >= 14 &&
      touchAction.includes("pan-y") &&
      !horizontalOverflow &&
      pageErrors.length === 0

    return {
      locale,
      viewport: viewportName,
      ok,
      slideCount,
      visibleSlides: visibleBefore,
      expectedVisibleSlides: viewport.expectedSlides,
      keyboardPositionBefore: before,
      keyboardPositionAfter: after,
      positionControlCount: indicatorCount,
      touchAction,
      horizontalOverflow,
      pageErrors,
      screenshot: path.relative(args.root, screenshotPath).replace(/\\/g, "/"),
    }
  } finally {
    await page.close()
    await context.close()
  }
}

async function inspectAuth(browser, args, locale, route) {
  const context = await browser.newContext({ viewport: VIEWPORTS.desktop })
  const page = await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  try {
    await page.goto(routeUrl(args.baseUrl, "/" + locale + "/" + route), {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    })
    const journey = page.locator("[data-auth-journey]")
    await journey.waitFor({ state: "visible", timeout: args.timeoutMs })
    const cardCount = await journey.locator("[data-auth-journey-card]").count()
    const horizontalOverflow = await hasHorizontalOverflow(page)
    const screenshotPath = path.join(args.screenshotsDir, "auth-journey-" + locale + "-" + route + ".png")
    await journey.screenshot({ path: screenshotPath })
    return {
      locale,
      route,
      ok: cardCount === 3 && !horizontalOverflow && pageErrors.length === 0,
      cardCount,
      horizontalOverflow,
      pageErrors,
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
  const carousel = []
  const auth = []

  try {
    for (const locale of ["en", "fr"]) {
      for (const viewportName of Object.keys(VIEWPORTS)) {
        carousel.push(await inspectCarousel(browser, args, locale, viewportName))
      }
      for (const route of ["login", "register"]) {
        auth.push(await inspectAuth(browser, args, locale, route))
      }
    }
  } finally {
    await browser.close()
  }

  const ok = carousel.every((result) => result.ok) && auth.every((result) => result.ok)
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    ok,
    carousel,
    auth,
  }

  fs.writeFileSync(args.out, JSON.stringify(report, null, 2) + "\n", "utf8")
  console.log("Public content browser smoke: " + (ok ? "ok" : "failed"))
  console.log("Evidence: " + path.relative(args.root, args.out).replace(/\\/g, "/"))

  if (!ok) process.exitCode = 1
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { parseArgs, routeUrl, visibleSlideCount }
