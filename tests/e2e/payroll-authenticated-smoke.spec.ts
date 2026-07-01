import { expect, test, type Page } from "@playwright/test"
import axe from "axe-core"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

test.describe.configure({ timeout: 240_000 })

const payrollRoutes = [
  {
    name: "command center",
    path: "/en/dashboard/payroll",
    heading: /HR, payroll, evidence, and close control/i,
  },
  {
    name: "attendance",
    path: "/en/dashboard/payroll/attendance",
    heading: /payment and attendance readiness/i,
  },
  {
    name: "compensation",
    path: "/en/dashboard/payroll/compensation",
    heading: /compensation approval readiness/i,
  },
  {
    name: "contracts",
    path: "/en/dashboard/payroll/contracts",
    heading: /contract lifecycle readiness/i,
  },
  {
    name: "employees",
    path: "/en/dashboard/payroll/employees",
    heading: /employee source-data readiness/i,
  },
  {
    name: "declarations",
    path: "/en/dashboard/payroll/declarations",
    heading: /declaration evidence workbench/i,
  },
  {
    name: "payments",
    path: "/en/dashboard/payroll/payments",
    heading: /employee balance recovery/i,
  },
  {
    name: "runs",
    path: "/en/dashboard/payroll/runs",
    heading: /run lifecycle workbench/i,
  },
  {
    name: "payslips",
    path: "/en/dashboard/payroll/payslips",
    heading: /payslips|my payslips/i,
  },
  {
    name: "register",
    path: "/en/dashboard/payroll/register",
    heading: /PAY-|payroll register|register unavailable/i,
  },
  {
    name: "setup",
    path: "/en/dashboard/payroll/setup",
    heading: /setup readiness and dry-run control plane/i,
  },
]


type AxeViolationSummary = {
  id: string
  impact: string | null
  help: string
  helpUrl: string
  nodeCount: number
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

const payrollAccessibilityRoutes = [
  {
    id: "payroll",
    name: "command center",
    path: "/en/dashboard/payroll",
    heading: /HR, payroll, evidence, and close control/i,
  },
  {
    id: "payroll-runs",
    name: "runs",
    path: "/en/dashboard/payroll/runs",
    heading: /run lifecycle workbench/i,
  },
  {
    id: "payroll-payments",
    name: "payments",
    path: "/en/dashboard/payroll/payments",
    heading: /employee balance recovery/i,
  },
  {
    id: "payroll-declarations",
    name: "declarations",
    path: "/en/dashboard/payroll/declarations",
    heading: /declaration evidence workbench/i,
  },
  {
    id: "payroll-attendance",
    name: "attendance",
    path: "/en/dashboard/payroll/attendance",
    heading: /payment and attendance readiness/i,
  },
  {
    id: "payroll-payslips",
    name: "payslips",
    path: "/en/dashboard/payroll/payslips",
    heading: /payslips|my payslips/i,
  },
]

const accessibilityViewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1100 },
]

type AccessibilityEvidence = {
  routeId: string
  routeName: string
  path: string
  viewport: string
  screenshot: string
  finalUrl: string
  renderState: "surface" | "safe-error"
  seriousViolationCount: number
  seriousViolations: AxeViolationSummary[]
  mobileLayout?: {
    viewportWidth: number
    documentWidth: number
    bodyWidth: number
    hasDocumentOverflow: boolean
  }
}

const payrollEvidenceDir = join(
  process.cwd(),
  "what-next",
  "payroll",
  "screenshots",
  "payroll-authenticated-accessibility-mobile",
)
const payrollEvidencePath = join(
  process.cwd(),
  "what-next",
  "payroll",
  "AQSTOQFLOW_PAYROLL_AUTHENTICATED_ACCESSIBILITY_MOBILE_BROWSER.json",
)
const accessibilityEvidence: AccessibilityEvidence[] = []

function relativeEvidencePath(absolutePath: string) {
  return absolutePath
    .replace(process.cwd(), "")
    .replace(/^[/\\]/, "")
    .replace(/\\/g, "/")
}

async function runSeriousAxeScan(page: Page) {
  await page.addScriptTag({ content: axe.source })

  const violations = await page.evaluate(async () => {
    const results = await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    })

    return results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodeCount: violation.nodes.length,
    }))
  })

  return violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical",
  )
}

async function getMobileLayoutEvidence(page: Page) {
  return page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth
    const bodyWidth = document.body?.scrollWidth ?? documentWidth
    const viewportWidth = window.innerWidth

    return {
      viewportWidth,
      documentWidth,
      bodyWidth,
      hasDocumentOverflow: Math.max(documentWidth, bodyWidth) > viewportWidth + 8,
    }
  })
}

async function expectPayrollSurfaceOrSafeState(page: Page, heading: RegExp) {
  const primaryHeading = page.getByRole("heading", { name: heading }).first()
  if (await primaryHeading.isVisible({ timeout: 60_000 }).catch(() => false)) {
    return "surface" as const
  }

  const safeHeading = page
    .getByRole("heading", {
      name: /payroll .*unavailable|payslips? .*unavailable|not available for this role|not enabled/i,
    })
    .first()
  await expect(safeHeading).toBeVisible({ timeout: 10_000 })
  return "safe-error" as const
}


test.describe("authenticated payroll browser smoke", () => {
  for (const route of payrollRoutes) {
    test(`${route.name} renders as an authenticated tenant route`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" })

      await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
      await expect(page.locator("body")).not.toContainText("Application error")
      await expect(page.locator("body")).not.toContainText("Internal Server Error")
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible({ timeout: 60_000 })
    })
  }

  test("command center renders proof action or local blocker state", async ({ page }) => {
    await page.goto("/en/dashboard/payroll", { waitUntil: "domcontentloaded" })
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
    await expect(page.getByRole("heading", { name: /HR, payroll, evidence, and close control/i })).toBeVisible({ timeout: 60_000 })

    const proofButton = page.getByRole("button", { name: /proof/i }).first()
    if (await proofButton.isVisible().catch(() => false)) {
      await proofButton.click()
      const proofDialog = page.getByRole("dialog").first()
      if (await proofDialog.isVisible().catch(() => false)) {
        await expect(proofDialog.getByText(/payroll|proof|hash|evidence/i).first()).toBeVisible()
        return
      }
    }

    await expect(page.getByRole("heading", { name: /Blocker flow|Action board|Run review/i }).first()).toBeVisible()
  })
})

test.describe("authenticated payroll accessibility and mobile validation", () => {
  test.afterAll(async () => {
    await mkdir(join(process.cwd(), "what-next", "payroll"), { recursive: true })
    const payload = JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        auth: {
          storageState: process.env.PLAYWRIGHT_STORAGE_STATE ?? "playwright/.auth/payroll.json",
          fixtureSource: "scripts/seed-payroll-e2e-user.js",
          fixturePurpose: "authenticated payroll browser accessibility and mobile validation",
        },
        viewports: accessibilityViewports,
        routes: payrollAccessibilityRoutes.map(({ heading: _heading, ...route }) => route),
        results: accessibilityEvidence,
      },
      null,
      2,
    ) + "\n"
    await writeFile(payrollEvidencePath, payload, "utf8")
  })

  for (const route of payrollAccessibilityRoutes) {
    for (const viewport of accessibilityViewports) {
      test(route.name + " passes authenticated accessibility and " + viewport.name + " viewport checks", async ({ page }, testInfo) => {
        await mkdir(payrollEvidenceDir, { recursive: true })
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(route.path, { waitUntil: "domcontentloaded" })

        await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
        await expect(page.locator("body")).not.toContainText("Application error")
        await expect(page.locator("body")).not.toContainText("Internal Server Error")
        const renderState = await expectPayrollSurfaceOrSafeState(page, route.heading)
        expect(
          renderState,
          `${route.name} rendered a safe-error fallback instead of the authenticated payroll surface`,
        ).toBe("surface")

        const seriousViolations = await runSeriousAxeScan(page)
        const screenshotPath = join(payrollEvidenceDir, route.id + "-" + viewport.name + ".png")
        await page.screenshot({ path: screenshotPath, fullPage: true })
        const mobileLayout =
          viewport.name === "mobile"
            ? await getMobileLayoutEvidence(page)
            : undefined

        const evidence: AccessibilityEvidence = {
          routeId: route.id,
          routeName: route.name,
          path: route.path,
          viewport: viewport.name,
          screenshot: relativeEvidencePath(screenshotPath),
          finalUrl: page.url(),
          renderState,
          seriousViolationCount: seriousViolations.length,
          seriousViolations,
          ...(mobileLayout ? { mobileLayout } : {}),
        }
        accessibilityEvidence.push(evidence)

        await testInfo.attach(route.id + "-" + viewport.name + "-evidence", {
          body: JSON.stringify(evidence, null, 2),
          contentType: "application/json",
        })

        expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toHaveLength(0)
        if (mobileLayout) {
          expect(mobileLayout.hasDocumentOverflow, JSON.stringify(mobileLayout, null, 2)).toBe(false)
        }
      })
    }
  }
})

