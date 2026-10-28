import { expect, test, type Page } from "@playwright/test"
import axe from "axe-core"
import { mkdir, writeFile } from "node:fs/promises"
import { join, relative } from "node:path"

test.describe.configure({ mode: "serial", timeout: 240_000 })

const evidenceDir = join(process.cwd(), "what-next", "evidence", "master-data-onboarding-2026-08-16")
const evidence: Array<{
  locale: "en" | "fr"
  viewport: "desktop" | "mobile"
  state: "empty"
  screenshot: string
  seriousViolationCount: number
  hasDocumentOverflow: boolean
}> = []

async function capture(page: Page, locale: "en" | "fr", viewport: "desktop" | "mobile") {
  await mkdir(evidenceDir, { recursive: true })
  await page.addScriptTag({ content: axe.source })
  const seriousViolations = await page.evaluate(async () => {
    const results = await (window as unknown as { axe: typeof axe }).axe.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    })
    return results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")
  })
  const hasDocumentOverflow = await page.evaluate(
    () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 8,
  )
  const screenshotPath = join(evidenceDir, `${locale}-${viewport}-empty.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" })
  evidence.push({
    locale,
    viewport,
    state: "empty",
    screenshot: relative(process.cwd(), screenshotPath).replace(/\\/g, "/"),
    seriousViolationCount: seriousViolations.length,
    hasDocumentOverflow,
  })
  expect(seriousViolations).toEqual([])
  expect(hasDocumentOverflow).toBe(false)
}

test.afterAll(async () => {
  await mkdir(evidenceDir, { recursive: true })
  const passed = evidence.length === 4 && evidence.every(
    (item) => item.seriousViolationCount === 0 && !item.hasDocumentOverflow,
  )
  await writeFile(
    join(evidenceDir, "browser-matrix.json"),
    `${JSON.stringify({
      status: passed ? "PASS" : "FAIL",
      checkedAt: new Date().toISOString(),
      workflowKey: "governed_master_data_onboarding",
      canonicalModule: "settings",
      fixture: {
        source: "scripts/inventory-items-e2e-fixture.js",
        productionBackfill: false,
        permissions: ["inventory.items.read", "inventory.items.create"],
      },
      results: evidence,
    }, null, 2)}\n`,
    "utf8",
  )
})

for (const locale of ["en", "fr"] as const) {
  for (const viewport of ["desktop", "mobile"] as const) {
    test(`renders the ${locale} governed empty state on ${viewport}`, async ({ page }) => {
      await page.setViewportSize(viewport === "desktop" ? { width: 1440, height: 1000 } : { width: 390, height: 844 })
      await page.goto(`/${locale}/dashboard/settings/data-onboarding`, { waitUntil: "domcontentloaded" })

      await expect(page).not.toHaveURL(/\/(?:login|unauthorized)(?:\?|$)/)
      await expect(page.getByRole("heading", {
        name: locale === "fr" ? "Préparation de l’import des données de référence" : "Master-data import readiness",
      })).toBeVisible({ timeout: 60_000 })
      await expect(page.getByRole("heading", {
        name: locale === "fr" ? "Aucun lot sélectionné" : "No batch selected",
      })).toBeVisible()
      await expect(page.getByLabel(locale === "fr" ? "Cible" : "Target")).toHaveValue("ITEM")
      await expect(page.getByText(
        locale === "fr" ? "Soldes comptables d’ouverture" : "Opening accounting balances",
      )).toBeVisible()

      await page.keyboard.press("Tab")
      await expect(page.locator(":focus")).toBeVisible()
      await capture(page, locale, viewport)
    })
  }
}
