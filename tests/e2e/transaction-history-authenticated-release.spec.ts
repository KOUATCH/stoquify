import { expect, test, type Page } from "@playwright/test"
import axe from "axe-core"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

test.describe.configure({ timeout: 180_000 })

const routes = [
  {
    id: "cash-payment-history",
    name: "cash/payment history",
    path: "/en/dashboard/finance/cash-payment-history",
    heading: /cash and payment history/i,
  },
  {
    id: "supplier-ap-history",
    name: "supplier AP history",
    path: "/en/dashboard/purchases/payables/history",
    heading: /supplier payable history/i,
  },
  {
    id: "customer-ar-history",
    name: "customer AR history",
    path: "/en/dashboard/finance/receivables/history",
    heading: /customer receivable history/i,
  },
]

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1100 },
]

type BrowserEvidence = {
  routeId: string
  routeName: string
  path: string
  viewport: string
  finalUrl: string
  seriousViolationCount: number
  hasDocumentOverflow: boolean
}

declare global {
  interface Window {
    axe: {
      run: (
        context: Document,
        options: Record<string, unknown>,
      ) => Promise<{
        violations: Array<{
          id: string
          impact?: string | null
          help: string
          helpUrl: string
          nodes: unknown[]
        }>
      }>
    }
  }
}

const evidencePath = join(
  process.cwd(),
  "what-next",
  "transaction-history",
  "runs",
  "th-transaction-history-discoverability-release-hardening-20260717-030",
  "transaction-history-authenticated-browser-a11y-output.json",
)
const evidence: BrowserEvidence[] = []

async function countSeriousViolations(page: Page) {
  await page.addScriptTag({ content: axe.source })
  return page.evaluate(async () => {
    const results = await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    })
    return results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    ).length
  })
}

async function hasDocumentOverflow(page: Page) {
  return page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth
    const bodyWidth = document.body?.scrollWidth ?? documentWidth
    return Math.max(documentWidth, bodyWidth) > window.innerWidth + 8
  })
}

test.describe("authenticated transaction-history browser accessibility release", () => {
  test.afterAll(async () => {
    await mkdir(
      join(
        process.cwd(),
        "what-next",
        "transaction-history",
        "runs",
        "th-transaction-history-discoverability-release-hardening-20260717-030",
      ),
      { recursive: true },
    )
    await writeFile(
      evidencePath,
      JSON.stringify(
        {
          status:
            evidence.length === routes.length * viewports.length &&
            evidence.every(
              (item) =>
                item.seriousViolationCount === 0 && !item.hasDocumentOverflow,
            )
              ? "PASS"
              : "FAIL",
          checkedAt: new Date().toISOString(),
          auth: {
            role: "TRANSACTION_HISTORY_E2E",
            organizationId:
              process.env.AQSTOQFLOW_TRANSACTION_HISTORY_E2E_ORG_ID ??
              "org_transaction_history_e2e_local",
            fixtureSource: "scripts/seed-transaction-history-e2e-user.js",
          },
          viewports,
          routes: routes.map(({ heading: _heading, ...route }) => route),
          results: evidence,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    )
  })

  for (const route of routes) {
    for (const viewport of viewports) {
      test(`${route.name} opens for transaction-history role on ${viewport.name}`, async ({
        page,
      }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        })
        await page.goto(route.path, { waitUntil: "domcontentloaded" })

        await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
        await expect(page.locator("body")).not.toContainText(
          "Application error",
        )
        await expect(page.locator("body")).not.toContainText(
          "Internal Server Error",
        )
        await expect(page.locator("body")).not.toContainText(
          /could not load|History cursor signing is not configured/i,
        )
        await expect(
          page.getByRole("heading", { name: route.heading }).first(),
        ).toBeVisible({ timeout: 60_000 })
        await expect(
          page.getByText(/not available for this role|permission required/i),
        ).toHaveCount(0)

        const seriousViolationCount = await countSeriousViolations(page)
        const overflow = await hasDocumentOverflow(page)

        evidence.push({
          routeId: route.id,
          routeName: route.name,
          path: route.path,
          viewport: viewport.name,
          finalUrl: page.url(),
          seriousViolationCount,
          hasDocumentOverflow: overflow,
        })

        expect(seriousViolationCount).toBe(0)
        expect(overflow).toBe(false)
      })
    }
  }
})


