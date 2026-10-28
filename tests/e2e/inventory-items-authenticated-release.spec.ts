import { expect, test, type Page } from "@playwright/test"
import axe from "axe-core"
import { mkdir, writeFile } from "node:fs/promises"
import { join, relative } from "node:path"

test.describe.configure({ mode: "serial", timeout: 240_000 })

const organizationId =
  process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_ORG_ID ??
  "org_inventory_items_e2e_local"
const itemId = "item_inventory_items_e2e_editable"
const foreignItemId = "item_inventory_items_e2e_foreign"
const createPath = "/en/dashboard/inventory/items/create"
const editPath = `/en/dashboard/inventory/items/${itemId}/edit`
const foreignEditPath =
  `/en/dashboard/inventory/items/${foreignItemId}/edit`
const itemsPath = "/en/dashboard/inventory/items"
const evidenceDir = join(
  process.cwd(),
  "what-next",
  "evidence",
  "inventory-item-create-edit-2026-08-07",
)
const evidencePath = join(evidenceDir, "browser-matrix.json")

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
] as const

type EvidenceRecord = {
  surface: "create" | "edit" | "tenant-isolation"
  phase: "render" | "before-save" | "after-save" | "not-found"
  viewport: string
  path: string
  finalUrl: string
  screenshot: string
  seriousViolationCount: number
  seriousViolations: Array<{
    id: string
    impact: string | null
    help: string
    nodeCount: number
  }>
  layout: {
    viewportWidth: number
    documentWidth: number
    bodyWidth: number
    hasDocumentOverflow: boolean
    horizontallyClippedControls: string[]
  }
}

const evidence: EvidenceRecord[] = []

function relativeEvidencePath(absolutePath: string) {
  return relative(process.cwd(), absolutePath).replace(/\\/g, "/")
}

async function expectAuthorizedPage(page: Page) {
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
  await expect(page).not.toHaveURL(/\/unauthorized(?:\?|$)/)
  await expect(page.locator("body")).not.toContainText(
    /Application error|Internal Server Error/i,
  )
}

async function captureEvidence(input: {
  page: Page
  surface: EvidenceRecord["surface"]
  phase: EvidenceRecord["phase"]
  viewport: string
  path: string
}) {
  await mkdir(evidenceDir, { recursive: true })
  const screenshotPath = join(
    evidenceDir,
    `${input.surface}-${input.phase}-${input.viewport}.png`,
  )

  await input.page.addScriptTag({ content: axe.source })
  const seriousViolations = await input.page.evaluate(async () => {
    const browserAxe = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: Record<string, unknown>,
          ) => Promise<{
            violations: Array<{
              id: string
              impact?: string | null
              help: string
              nodes: unknown[]
            }>
          }>
        }
      }
    ).axe
    const results = await browserAxe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    })

    return results.violations
      .filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      )
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact ?? null,
        help: violation.help,
        nodeCount: violation.nodes.length,
      }))
  })

  const layout = await input.page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth
    const bodyWidth = document.body?.scrollWidth ?? documentWidth
    const viewportWidth = window.innerWidth
    const horizontallyClippedControls = Array.from(
      document.querySelectorAll<HTMLElement>(
        "h1, h2, h3, a, button, input, textarea, select, [role='button'], [role='tab']",
      ),
    )
      .filter((element) => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity || "1") > 0 &&
          rect.width > 1 &&
          rect.height > 1 &&
          (rect.left < -2 || rect.right > viewportWidth + 2)
        )
      })
      .map((element) => {
        const label = (
          element.innerText ||
          element.getAttribute("aria-label") ||
          element.getAttribute("name") ||
          element.id ||
          "unnamed"
        )
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 100)
        return `${element.tagName.toLowerCase()}:${label}`
      })

    return {
      viewportWidth,
      documentWidth,
      bodyWidth,
      hasDocumentOverflow:
        Math.max(documentWidth, bodyWidth) > viewportWidth + 8,
      horizontallyClippedControls,
    }
  })

  await input.page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
  })

  evidence.push({
    surface: input.surface,
    phase: input.phase,
    viewport: input.viewport,
    path: input.path,
    finalUrl: input.page.url(),
    screenshot: relativeEvidencePath(screenshotPath),
    seriousViolationCount: seriousViolations.length,
    seriousViolations,
    layout,
  })

  expect(
    seriousViolations,
    `Serious or critical Axe violations: ${JSON.stringify(seriousViolations)}`,
  ).toEqual([])
  expect(layout.hasDocumentOverflow).toBe(false)
  expect(layout.horizontallyClippedControls).toEqual([])
}

test.describe("authorized inventory item create/edit browser matrix", () => {
  test.afterAll(async () => {
    await mkdir(evidenceDir, { recursive: true })
    const expectedEvidenceCount = viewports.length * 3 + 1
    const passed =
      evidence.length === expectedEvidenceCount &&
      evidence.every(
        (record) =>
          record.seriousViolationCount === 0 &&
          !record.layout.hasDocumentOverflow &&
          record.layout.horizontallyClippedControls.length === 0 &&
          !/\/(?:login|unauthorized)(?:\?|$)/.test(record.finalUrl),
      )

    await writeFile(
      evidencePath,
      `${JSON.stringify(
        {
          status: passed ? "PASS" : "FAIL",
          checkedAt: new Date().toISOString(),
          fixture: {
            source: "scripts/inventory-items-e2e-fixture.js",
            organizationId,
            roleCode: "INVENTORY_ITEMS_E2E",
            seededItemId: itemId,
            foreignItemId,
            requiredPermissions: [
              "inventory.items.read",
              "inventory.items.create",
              "inventory.items.update",
            ],
            productionBackfill: false,
          },
          cleanup: {
            mechanism: "Playwright project teardown",
            project: "inventory-items-cleanup",
            residualEvidence: "cleanup.json",
          },
          expectedEvidenceCount,
          viewports,
          results: evidence,
        },
        null,
        2,
      )}\n`,
      "utf8",
    )
  })

  for (const viewport of viewports) {
    test(`create item renders on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto(createPath, { waitUntil: "domcontentloaded" })

      await expectAuthorizedPage(page)
      await expect(
        page.getByRole("heading", { name: "Create New Product" }),
      ).toBeVisible({ timeout: 60_000 })
      await expect(
        page.getByRole("heading", { name: "Basic Information" }),
      ).toBeVisible()
      await expect(
        page.getByText("Some optional reference data is unavailable"),
      ).toHaveCount(0)
      await expect(page.getByLabel("Product Name (English) *")).toBeVisible()

      await captureEvidence({
        page,
        surface: "create",
        phase: "render",
        viewport: viewport.name,
        path: createPath,
      })
    })

    test(`edit item loads and saves on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto(itemsPath, { waitUntil: "domcontentloaded" })
      await expectAuthorizedPage(page)
      await expect(
        page.getByRole("heading", { name: "Inventory Items" }),
      ).toBeVisible({ timeout: 60_000 })

      await page.goto(editPath, { waitUntil: "domcontentloaded" })

      await expectAuthorizedPage(page)
      await expect(
        page.getByRole("heading", {
          name: "Edit Playwright Inventory Item",
        }),
      ).toBeVisible({ timeout: 60_000 })
      await expect(page.getByLabel("English name")).toHaveValue(
        "Playwright Inventory Item",
        { timeout: 60_000 },
      )

      await captureEvidence({
        page,
        surface: "edit",
        phase: "before-save",
        viewport: viewport.name,
        path: editPath,
      })

      const updatedDescription =
        `Organization-scoped browser update verified on ${viewport.name}.`
      await page.getByLabel("English description").fill(updatedDescription)
      await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled()
      await page.getByRole("button", { name: "Save changes" }).click()
      await expect(page).toHaveURL(
        /\/en\/dashboard\/inventory\/items(?:\?|$)/,
        { timeout: 60_000 },
      )
      await expect(
        page.getByRole("heading", { name: "Inventory Items" }),
      ).toBeVisible({ timeout: 60_000 })

      await page.goto(editPath, { waitUntil: "domcontentloaded" })
      await expectAuthorizedPage(page)
      await expect(page.getByLabel("English description")).toHaveValue(
        updatedDescription,
        { timeout: 60_000 },
      )

      await captureEvidence({
        page,
        surface: "edit",
        phase: "after-save",
        viewport: viewport.name,
        path: editPath,
      })
    })
  }

  test("foreign tenant item remains indistinguishable from missing", async ({
    page,
  }) => {
    const viewport = viewports[0]
    await page.setViewportSize(viewport)
    await page.goto(foreignEditPath, { waitUntil: "domcontentloaded" })

    await expectAuthorizedPage(page)
    await expect(
      page.getByRole("heading", { name: "Item not found" }),
    ).toBeVisible({ timeout: 60_000 })
    await expect(page.locator("body")).not.toContainText(
      "Foreign Tenant Inventory Item",
    )

    await captureEvidence({
      page,
      surface: "tenant-isolation",
      phase: "not-found",
      viewport: viewport.name,
      path: foreignEditPath,
    })
  })
})
