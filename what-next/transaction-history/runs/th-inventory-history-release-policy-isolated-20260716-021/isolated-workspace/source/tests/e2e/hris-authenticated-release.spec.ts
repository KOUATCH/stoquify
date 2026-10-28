import { expect, test, type Page } from "@playwright/test"
import axe from "axe-core"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

test.describe.configure({ timeout: 240_000 })

const hrisRoutes = [
  {
    id: "people-directory",
    name: "employee directory",
    path: "/en/dashboard/people",
    heading: /employee directory/i,
  },
  {
    id: "people-profile",
    name: "employee profile",
    path: "/en/dashboard/people/payroll_e2e_browser_2026_06_employee",
    heading: /HR Manager Payroll Demo/i,
  },
  {
    id: "people-self-service",
    name: "employee self-service",
    path: "/en/dashboard/people/me",
    heading: /my hr/i,
  },
  {
    id: "people-team",
    name: "managed workforce",
    path: "/en/dashboard/people/team",
    heading: /managed workforce/i,
  },
  {
    id: "people-approvals",
    name: "approval inbox",
    path: "/en/dashboard/people/approvals",
    heading: /approval inbox/i,
  },
  {
    id: "people-history",
    name: "movement history",
    path: "/en/dashboard/people/history",
    heading: /movement history/i,
  },
]

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 1100 },
]

type AxeViolationSummary = {
  id: string
  impact: string | null
  help: string
  helpUrl: string
  nodeCount: number
}

type LayoutEvidence = {
  viewportWidth: number
  documentWidth: number
  bodyWidth: number
  hasDocumentOverflow: boolean
  overlappingElements: string[]
  clippedElements: string[]
}

type BrowserEvidence = {
  routeId: string
  routeName: string
  path: string
  viewport: string
  screenshot: string
  finalUrl: string
  seriousViolationCount: number
  seriousViolations: AxeViolationSummary[]
  layout: LayoutEvidence
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

const evidenceDir = join(
  process.cwd(),
  "what-next",
  "payroll",
  "screenshots",
  "hris-browser-accessibility-rbac-release-2026-07-16",
)
const evidencePath = join(
  process.cwd(),
  "what-next",
  "payroll",
  "STOQUIFY_HRIS_BROWSER_ACCESSIBILITY_RELEASE_EVIDENCE_2026-07-16.json",
)
const evidence: BrowserEvidence[] = []

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

  return violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  )
}

async function getLayoutEvidence(page: Page): Promise<LayoutEvidence> {
  return page.evaluate(() => {
    const main = document.querySelector("main")
    const candidates = main
      ? Array.from(main.querySelectorAll<HTMLElement>("h1, h2, a, button"))
      : []
    const visible = candidates.filter((element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 1 &&
        rect.height > 1
      )
    })
    const label = (element: HTMLElement) => {
      const text = (
        element.innerText ||
        element.getAttribute("aria-label") ||
        ""
      )
        .trim()
        .replace(/\s+/g, " ")
      return `${element.tagName.toLowerCase()}:${text.slice(0, 80) || "unnamed"}`
    }
    const clippedElements = visible
      .filter(
        (element) =>
          element.scrollWidth > element.clientWidth + 2 ||
          element.scrollHeight > element.clientHeight + 2,
      )
      .map(label)
    const overlappingElements: string[] = []

    for (let leftIndex = 0; leftIndex < visible.length; leftIndex += 1) {
      const left = visible[leftIndex]
      const leftRect = left.getBoundingClientRect()
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < visible.length;
        rightIndex += 1
      ) {
        const right = visible[rightIndex]
        if (left.contains(right) || right.contains(left)) continue
        const rightRect = right.getBoundingClientRect()
        const overlapWidth =
          Math.min(leftRect.right, rightRect.right) -
          Math.max(leftRect.left, rightRect.left)
        const overlapHeight =
          Math.min(leftRect.bottom, rightRect.bottom) -
          Math.max(leftRect.top, rightRect.top)
        if (overlapWidth > 2 && overlapHeight > 2) {
          overlappingElements.push(`${label(left)} <> ${label(right)}`)
        }
      }
    }

    const documentWidth = document.documentElement.scrollWidth
    const bodyWidth = document.body?.scrollWidth ?? documentWidth
    const viewportWidth = window.innerWidth
    return {
      viewportWidth,
      documentWidth,
      bodyWidth,
      hasDocumentOverflow:
        Math.max(documentWidth, bodyWidth) > viewportWidth + 8,
      overlappingElements,
      clippedElements,
    }
  })
}

test.describe("authenticated HRIS browser accessibility release", () => {
  test.afterAll(async () => {
    await mkdir(join(process.cwd(), "what-next", "payroll"), {
      recursive: true,
    })
    await writeFile(
      evidencePath,
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          auth: {
            role: "PAYROLL_E2E",
            organizationId:
              process.env.AQSTOQFLOW_E2E_ORG_ID ?? "org_payroll_e2e_local",
            fixtureSource: "scripts/seed-payroll-e2e-user.js",
          },
          viewports,
          routes: hrisRoutes.map(({ heading: _heading, ...route }) => route),
          results: evidence,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    )
  })

  for (const route of hrisRoutes) {
    for (const viewport of viewports) {
      test(`${route.name} passes ${viewport.name} accessibility and layout checks`, async ({
        page,
      }, testInfo) => {
        await mkdir(evidenceDir, { recursive: true })
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
        await expect(
          page.getByRole("heading", { name: route.heading }).first(),
        ).toBeVisible({ timeout: 60_000 })
        await expect(
          page.getByText(/not available for this role|permission required/i),
        ).toHaveCount(0)

        const seriousViolations = await runSeriousAxeScan(page)
        const layout = await getLayoutEvidence(page)
        const screenshotPath = join(
          evidenceDir,
          `${route.id}-${viewport.name}.png`,
        )
        await page.screenshot({ path: screenshotPath, fullPage: true })

        const item: BrowserEvidence = {
          routeId: route.id,
          routeName: route.name,
          path: route.path,
          viewport: viewport.name,
          screenshot: relativeEvidencePath(screenshotPath),
          finalUrl: page.url(),
          seriousViolationCount: seriousViolations.length,
          seriousViolations,
          layout,
        }
        evidence.push(item)
        await testInfo.attach(`${route.id}-${viewport.name}-evidence`, {
          body: JSON.stringify(item, null, 2),
          contentType: "application/json",
        })

        expect(
          seriousViolations,
          JSON.stringify(seriousViolations, null, 2),
        ).toHaveLength(0)
        expect(
          layout.hasDocumentOverflow,
          JSON.stringify(layout, null, 2),
        ).toBe(false)
        expect(
          layout.overlappingElements,
          JSON.stringify(layout, null, 2),
        ).toHaveLength(0)
        expect(
          layout.clippedElements,
          JSON.stringify(layout, null, 2),
        ).toHaveLength(0)
      })
    }
  }
})
