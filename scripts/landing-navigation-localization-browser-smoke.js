#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const SECTION_IDS = [
  "product",
  "workflow",
  "modules",
  "people-to-pay",
  "daily-control",
  "automation",
  "trust",
  "use-cases",
  "pricing",
]

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 1000 },
}

function parseArgs(argv) {
  const today = new Date().toISOString().slice(0, 10)
  const args = {
    root: process.cwd(),
    baseUrl: "http://localhost:3000",
    out: path.join(
      process.cwd(),
      "what-next",
      "ui-ux",
      "landing-navigation-localization-browser-evidence-" + today + ".json",
    ),
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
  throw new Error("Playwright is required for the landing navigation smoke")
}

function routeUrl(baseUrl, routePath) {
  return new URL(routePath, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/").toString()
}

function relativePath(args, filePath) {
  return path.relative(args.root, filePath).split(path.sep).join("/")
}

async function settle(page, timeoutMs) {
  await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 5000) }).catch(() => {})
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

async function capture(page, args, name) {
  const screenshotPath = path.join(args.screenshotsDir, name + ".png")
  await page.screenshot({ path: screenshotPath })
  return relativePath(args, screenshotPath)
}

async function waitForAnchor(page, id, timeoutMs) {
  await page.waitForFunction(
    (targetId) => window.location.hash === "#" + targetId,
    id,
    { timeout: timeoutMs },
  )
  await page.waitForTimeout(450)
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
    await settle(page, args.timeoutMs)

    const variant = viewportName === "desktop" ? "desktop" : "mobile"
    const nav = page.locator(`[data-landing-nav="${variant}"]`)
    const mobileMenu = page.locator("[data-landing-mobile-menu]")
    const moreMenu = page.locator("[data-landing-nav-more]")

    if (variant === "desktop") {
      await nav.waitFor({ state: "visible", timeout: args.timeoutMs })
      await moreMenu.locator("summary").click()
      await moreMenu.locator('[data-landing-nav-link="trust"]').waitFor({ state: "visible" })
    } else {
      await mobileMenu.locator("summary").click()
      await nav.waitFor({ state: "visible", timeout: args.timeoutMs })
    }

    const links = await nav.locator("[data-landing-nav-link]").evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute("data-landing-nav-link"),
        href: node.getAttribute("href"),
        text: (node.textContent || "").trim(),
      })),
    )
    const startLabel = locale === "fr" ? "Planifier" : "Plan rollout"
    const startActionVisible = await page
      .locator("[data-landing-header]")
      .getByText(startLabel, { exact: true })
      .evaluateAll((nodes) => nodes.filter((node) => node.getClientRects().length > 0).length)
    const initialActiveIds = await nav.locator("[aria-current=location]").evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-landing-nav-link")),
    )
    const domSectionOrder = await page.evaluate((ids) =>
      [...document.querySelectorAll("main section[id]")]
        .map((section) => section.id)
        .filter((id) => ids.includes(id)),
    SECTION_IDS)
    const targetCounts = await page.evaluate((ids) =>
      Object.fromEntries(ids.map((id) => [id, document.querySelectorAll(`#${id}`).length])),
    SECTION_IDS)

    const screenshot = await capture(
      page,
      args,
      `landing-navigation-${locale}-${viewportName}`,
    )

    const targetId = variant === "desktop" ? "trust" : "people-to-pay"
    await nav.locator(`[data-landing-nav-link="${targetId}"]`).click()
    await waitForAnchor(page, targetId, args.timeoutMs)

    const targetTop = await page.locator("#" + targetId).evaluate((node) =>
      Math.round(node.getBoundingClientRect().top),
    )
    const activeState = await nav
      .locator(`[data-landing-nav-link="${targetId}"]`)
      .getAttribute("aria-current")
    const disclosureClosed = variant === "desktop"
      ? !(await moreMenu.evaluate((node) => node.open))
      : !(await mobileMenu.evaluate((node) => node.open))
    const navText = ((await nav.textContent()) || "").replace(/\s+/g, " ").trim()
    const localizedLabels = locale === "fr"
      ? ["Contrôle quotidien", "Scénarios"]
      : ["Daily control", "Scenarios"]
    const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ")
    const horizontalOverflow = await hasHorizontalOverflow(page)
    const linkIds = links.map((link) => link.id)
    const hrefsMatch = links.every((link) => link.href && link.href.endsWith("#" + link.id))
    const targetsUnique = Object.values(targetCounts).every((count) => count === 1)
    const labelsPresent = localizedLabels.every((label) => navText.includes(label)) && startActionVisible === 1

    const ok =
      JSON.stringify(linkIds) === JSON.stringify(SECTION_IDS) &&
      JSON.stringify(domSectionOrder) === JSON.stringify(SECTION_IDS) &&
      hrefsMatch &&
      targetsUnique &&
      initialActiveIds.length === 0 &&
      labelsPresent &&
      activeState === "location" &&
      disclosureClosed &&
      targetTop >= 64 &&
      targetTop <= 112 &&
      !/Ã|Â|�|synchronisationhronisation/.test(bodyText) &&
      !horizontalOverflow &&
      pageErrors.length === 0

    return {
      kind: "landing",
      locale,
      viewport: viewportName,
      ok,
      linkIds,
      hrefsMatch,
      domSectionOrder,
      targetCounts,
      initialActiveIds,
      targetId,
      targetTop,
      activeState,
      disclosureClosed,
      labelsPresent,
      startActionVisible,
      navText,
      horizontalOverflow,
      pageErrors,
      screenshot,
    }
  } finally {
    await page.close()
    await context.close()
  }
}

async function inspectFrenchAuth(browser, args, route, viewportName) {
  const context = await browser.newContext({ viewport: VIEWPORTS[viewportName] })
  const page = await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  try {
    await page.goto(routeUrl(args.baseUrl, "/fr/" + route), {
      waitUntil: "domcontentloaded",
      timeout: args.timeoutMs,
    })
    await settle(page, args.timeoutMs)

    const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ")
    const expected = route === "login"
      ? ["Session d'espace sécurisée", "Retrouvez votre espace opérationnel", "Vérification récente"]
      : ["Créer espace OHADA", "Construisez l'espace opérationnel", "Prénom"]
    const normalizedBodyText = bodyText.toLocaleLowerCase("fr")
    const expectedTextPresent = expected.every((value) =>
      normalizedBodyText.includes(value.toLocaleLowerCase("fr")),
    )
    const horizontalOverflow = await hasHorizontalOverflow(page)
    const screenshot = await capture(page, args, `auth-${route}-fr-${viewportName}`)
    const ok =
      expectedTextPresent &&
      !/Ã|Â|�|\b(?:Systeme|operationnel|acces|Creer|prenom|verification)\b/.test(bodyText) &&
      !horizontalOverflow &&
      pageErrors.length === 0

    return {
      kind: "auth",
      locale: "fr",
      route,
      viewport: viewportName,
      ok,
      expected,
      expectedTextPresent,
      horizontalOverflow,
      pageErrors,
      screenshot,
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
    for (const route of ["login", "register"]) {
      for (const viewportName of Object.keys(VIEWPORTS)) {
        checks.push(await inspectFrenchAuth(browser, args, route, viewportName))
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
  console.log("Landing navigation/localization browser smoke: " + (ok ? "ok" : "failed"))
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
