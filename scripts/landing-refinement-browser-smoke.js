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
    out: path.join(process.cwd(), "what-next", "ui-ux", "landing-refinement-browser-evidence-" + today + ".json"),
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
  throw new Error("Playwright is required for the landing refinement smoke")
}

function routeUrl(baseUrl, routePath) {
  return new URL(routePath, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/").toString()
}

function relativePath(args, filePath) {
  return path.relative(args.root, filePath).split(path.sep).join("/")
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

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

async function inspectLanding(browser, args, locale, viewportName) {
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
    await page.waitForLoadState("networkidle", { timeout: Math.min(args.timeoutMs, 5000) }).catch(() => {})

    const workflow = page.locator("[data-workflow-carousel]")
    await workflow.waitFor({ state: "visible", timeout: args.timeoutMs })
    await workflow.locator('button[aria-current="true"]').waitFor({ state: "visible", timeout: args.timeoutMs })
    await workflow.scrollIntoViewIfNeeded()

    const workflowSlides = workflow.locator("[data-workflow-slide]")
    const workflowSlideCount = await workflowSlides.count()
    const visibleWorkflowSlides = await visibleSlideCount(workflowSlides)
    const workflowPosition = workflow.locator("[data-workflow-position]")
    const workflowBefore = (await workflowPosition.textContent())?.trim() || ""
    const workflowNext = workflow.locator("[data-workflow-next]")
    await workflowNext.focus()
    await workflowNext.press("Enter")
    await page.waitForFunction(
      (previous) => {
        const current = document.querySelector("[data-workflow-position]")
        return Boolean(current && current.textContent && current.textContent.trim() !== previous)
      },
      workflowBefore,
      { timeout: args.timeoutMs },
    )
    const workflowAfter = (await workflowPosition.textContent())?.trim() || ""
    const workflowControlCount = Math.max(0, (await workflow.locator("button").count()) - 2)
    const workflowTouchAction = await workflow.locator(".touch-pan-y").evaluate((node) => getComputedStyle(node).touchAction)
    const workflowScreenshotPath = path.join(args.screenshotsDir, "workflow-" + locale + "-" + viewportName + ".png")
    await workflow.screenshot({ path: workflowScreenshotPath })

    const hrisModule = page.locator('[data-operations-module="hris"]')
    await hrisModule.waitFor({ state: "visible", timeout: args.timeoutMs })
    const hrisHref = await hrisModule.getAttribute("href")

    const peopleToPay = page.locator("[data-people-to-pay]")
    await peopleToPay.waitFor({ state: "visible", timeout: args.timeoutMs })
    const peopleToPayTextLength = ((await peopleToPay.textContent()) || "").trim().length
    let peopleToPayScreenshot = null
    if (viewportName === "desktop") {
      const peopleToPayScreenshotPath = path.join(args.screenshotsDir, "people-to-pay-" + locale + "-desktop.png")
      await peopleToPay.screenshot({ path: peopleToPayScreenshotPath })
      peopleToPayScreenshot = relativePath(args, peopleToPayScreenshotPath)
    }

    const dailyControl = page.locator("[data-daily-control]")
    await dailyControl.waitFor({ state: "visible", timeout: args.timeoutMs })
    const dailyTabs = dailyControl.locator("[data-daily-control-tab]")
    const dailyTabCount = await dailyTabs.count()
    const inventoryTab = dailyControl.locator('[data-daily-control-tab="inventory"]')
    const purchasingTab = dailyControl.locator('[data-daily-control-tab="purchasing"]')
    const dailyBefore = await inventoryTab.getAttribute("aria-selected")
    await inventoryTab.focus()
    await inventoryTab.press("ArrowRight")
    await page.waitForFunction(
      () => document.querySelector('[data-daily-control-tab="purchasing"]')?.getAttribute("aria-selected") === "true",
      null,
      { timeout: args.timeoutMs },
    )
    const dailyAfter = await purchasingTab.getAttribute("aria-selected")
    const dailyPanel = await dailyControl.locator("[data-daily-control-panel]").getAttribute("data-daily-control-panel")
    const dailyScreenshotPath = path.join(args.screenshotsDir, "daily-control-" + locale + "-" + viewportName + ".png")
    await dailyControl.screenshot({ path: dailyScreenshotPath })

    const horizontalOverflow = await hasHorizontalOverflow(page)
    const localizedPeoplePath = "/" + locale + "/dashboard/people"
    const ok =
      workflowSlideCount === 17 &&
      visibleWorkflowSlides === viewport.expectedSlides &&
      workflowBefore !== workflowAfter &&
      workflowControlCount === 17 &&
      workflowTouchAction.includes("pan-y") &&
      Boolean(hrisHref && hrisHref.includes(localizedPeoplePath)) &&
      peopleToPayTextLength > 300 &&
      dailyTabCount === 7 &&
      dailyBefore === "true" &&
      dailyAfter === "true" &&
      dailyPanel === "purchasing" &&
      !horizontalOverflow &&
      pageErrors.length === 0

    return {
      locale,
      viewport: viewportName,
      ok,
      workflow: {
        slideCount: workflowSlideCount,
        visibleSlides: visibleWorkflowSlides,
        expectedVisibleSlides: viewport.expectedSlides,
        keyboardPositionBefore: workflowBefore,
        keyboardPositionAfter: workflowAfter,
        positionControlCount: workflowControlCount,
        touchAction: workflowTouchAction,
        screenshot: relativePath(args, workflowScreenshotPath),
      },
      hris: {
        moduleHref: hrisHref,
        peopleToPayTextLength,
        peopleToPayScreenshot,
      },
      dailyControl: {
        tabCount: dailyTabCount,
        inventorySelectedBefore: dailyBefore,
        purchasingSelectedAfter: dailyAfter,
        activePanelAfterArrowRight: dailyPanel,
        screenshot: relativePath(args, dailyScreenshotPath),
      },
      horizontalOverflow,
      pageErrors,
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
  console.log("Landing refinement browser smoke: " + (ok ? "ok" : "failed"))
  console.log("Evidence: " + relativePath(args, args.out))
  if (!ok) process.exitCode = 1
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { parseArgs, routeUrl, visibleSlideCount }
