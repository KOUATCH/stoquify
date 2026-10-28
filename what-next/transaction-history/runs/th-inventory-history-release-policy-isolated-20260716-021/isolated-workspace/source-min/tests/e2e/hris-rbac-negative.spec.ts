import { expect, test, type Page } from "@playwright/test"
import axe from "axe-core"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

test.describe.configure({ timeout: 180_000 })

const deniedRoutes = [
  {
    id: "people-directory-denied",
    path: "/en/dashboard/people",
    heading: /People workspace is not available for this role/i,
  },
  {
    id: "people-profile-denied",
    path: "/en/dashboard/people/payroll_e2e_browser_2026_06_employee",
    heading: /Employee profile is not available/i,
  },
  {
    id: "people-self-service-denied",
    path: "/en/dashboard/people/me",
    heading: /Employee self-service is not available/i,
  },
  {
    id: "people-team-denied",
    path: "/en/dashboard/people/team",
    heading: /Managed workforce is not available/i,
  },
  {
    id: "people-approvals-denied",
    path: "/en/dashboard/people/approvals",
    heading: /Approval inbox is not available for this role/i,
  },
  {
    id: "people-history-denied",
    path: "/en/dashboard/people/history",
    heading: /People history is not available for this role/i,
  },
]

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
  "STOQUIFY_HRIS_RBAC_NEGATIVE_BROWSER_EVIDENCE_2026-07-16.json",
)
const evidence: Array<Record<string, unknown>> = []

async function getLayoutEvidence(page: Page) {
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
    const clippedElements = visible
      .filter(
        (element) =>
          element.scrollWidth > element.clientWidth + 2 ||
          element.scrollHeight > element.clientHeight + 2,
      )
      .map(label)
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

async function runSeriousAxeScan(page: Page) {
  await page.addScriptTag({ content: axe.source })
  return page.evaluate(async () => {
    const results = await window.axe.run(document, {
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
}

test.describe("authenticated HRIS RBAC negative routes", () => {
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
            role: "PAYROLL_E2E_REQUESTER",
            organizationId:
              process.env.AQSTOQFLOW_E2E_ORG_ID ?? "org_payroll_e2e_local",
            expectedHrisAccess: "DENIED",
          },
          routes: deniedRoutes.map(({ heading: _heading, ...route }) => route),
          results: evidence,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    )
  })

  test("requester storage state is authenticated but has no HRIS permissions", async ({
    page,
  }) => {
    const response = await page.request.get("/api/me/permissions")
    expect(response.ok()).toBe(true)
    const payload = (await response.json()) as {
      organizationId?: string
      permissions?: string[]
    }
    expect(payload.organizationId).toBe(
      process.env.AQSTOQFLOW_E2E_ORG_ID ?? "org_payroll_e2e_local",
    )
    expect(payload.permissions ?? []).toContain("payroll.command.read")
    expect(payload.permissions ?? []).not.toEqual(
      expect.arrayContaining([
        "hris.people.read",
        "hris.people.manage",
        "hris.self_service.read",
      ]),
    )
  })

  for (const route of deniedRoutes) {
    test(`${route.id} returns a redacted permission state`, async ({
      page,
    }, testInfo) => {
      await mkdir(evidenceDir, { recursive: true })
      await page.goto(route.path, { waitUntil: "domcontentloaded" })

      await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
      await expect(
        page.getByRole("heading", { name: route.heading }),
      ).toBeVisible({ timeout: 60_000 })
      await expect(page.locator("body")).not.toContainText(
        "HR Manager Payroll Demo",
      )
      await expect(page.locator("body")).not.toContainText("PAY-BROWSER-001")
      await expect(page.locator("body")).not.toContainText("+237")
      await expect(page.locator("body")).not.toContainText(
        "Internal Server Error",
      )

      const layout = await getLayoutEvidence(page)
      const screenshotPath = join(evidenceDir, `${route.id}-desktop.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true })
      const item = {
        routeId: route.id,
        path: route.path,
        finalUrl: page.url(),
        permissionState: "DENIED",
        screenshot: screenshotPath
          .replace(process.cwd(), "")
          .replace(/^[/\\]/, "")
          .replace(/\\/g, "/"),
        layout,
      }
      evidence.push(item)
      await testInfo.attach(`${route.id}-evidence`, {
        body: JSON.stringify(item, null, 2),
        contentType: "application/json",
      })

      expect(layout.hasDocumentOverflow, JSON.stringify(layout, null, 2)).toBe(
        false,
      )
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

  test("denied HRIS links stay out of the requester sidebar", async ({
    page,
  }) => {
    await page.goto("/en/dashboard/payroll", { waitUntil: "domcontentloaded" })
    await expect(
      page.getByRole("heading", {
        name: /HR, payroll, evidence, and close control/i,
      }),
    ).toBeVisible({ timeout: 60_000 })
    await expect(
      page.locator('aside a[href$="/dashboard/people"]'),
    ).toHaveCount(0)
    await expect(
      page.locator('aside a[href$="/dashboard/people/me"]'),
    ).toHaveCount(0)
    await expect(
      page.locator('aside a[href$="/dashboard/people/team"]'),
    ).toHaveCount(0)
  })

  test("permission-denied state is accessible and stable on mobile", async ({
    page,
  }, testInfo) => {
    await mkdir(evidenceDir, { recursive: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en/dashboard/people", { waitUntil: "domcontentloaded" })
    await expect(
      page.getByRole("heading", {
        name: /People workspace is not available for this role/i,
      }),
    ).toBeVisible({ timeout: 60_000 })

    const seriousViolations = await runSeriousAxeScan(page)
    const layout = await getLayoutEvidence(page)
    const screenshotPath = join(
      evidenceDir,
      "people-directory-denied-mobile.png",
    )
    await page.screenshot({ path: screenshotPath, fullPage: true })
    const item = {
      routeId: "people-directory-denied-mobile",
      path: "/en/dashboard/people",
      finalUrl: page.url(),
      permissionState: "DENIED",
      viewport: "mobile",
      seriousViolations,
      screenshot: screenshotPath
        .replace(process.cwd(), "")
        .replace(/^[/\\]/, "")
        .replace(/\\/g, "/"),
      layout,
    }
    evidence.push(item)
    await testInfo.attach("people-directory-denied-mobile-evidence", {
      body: JSON.stringify(item, null, 2),
      contentType: "application/json",
    })

    expect(
      seriousViolations,
      JSON.stringify(seriousViolations, null, 2),
    ).toHaveLength(0)
    expect(layout.hasDocumentOverflow, JSON.stringify(layout, null, 2)).toBe(
      false,
    )
    expect(
      layout.overlappingElements,
      JSON.stringify(layout, null, 2),
    ).toHaveLength(0)
    expect(
      layout.clippedElements,
      JSON.stringify(layout, null, 2),
    ).toHaveLength(0)
  })
})
