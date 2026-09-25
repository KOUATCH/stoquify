import { expect, test, type Page } from "@playwright/test"
import axe from "axe-core"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { measureFinanceX1Route, readFinanceX1Result, waitForFinanceX1Result, type FinanceX1Result } from "./finance-x1-route-observation"

import {
  financeX1ExternalAccountantForbiddenPermissions,
  financeX1RequiredEvidenceRoutes,
} from "../../components/DataTableComponents/finance-x1-evidence-binding"

test.describe.configure({ mode: "serial", timeout: 240_000 })

const runId = process.env.FINANCE_X1_EVIDENCE_RUN_ID ?? "missing-local-run-id"
const runDirectory = join(
  process.cwd(),
  "what-next",
  "evidence",
  "finance-x1",
  "local-simulation",
  runId,
)
const preflightPath = join(
  process.cwd(),
  "what-next",
  "evidence",
  "finance-x1",
  "local-simulation",
  "local-evidence-preflight.json",
)

type Viewport = "desktop" | "tablet" | "mobile"
type LocalArtifact = {
  artifactId: string
  artifactPath: string
  runId: string
  organizationId: "rds_org_001"
  foreignIsolationProbeTenantId: "rds_org_002"
  personaRole: "external_accountant"
  locale: "en" | "fr"
  viewport: Viewport
  route: string
  browser: string
  capturedAt: string
  authenticated: true
  authoritative: false
  approvedForReleaseEvidence: false
  checks: {
    routeLoaded: true
    authorizationVerified: true
    tenantIsolationVerified: true
    redactionBoundaryVerified: true
    layoutUsable: true
    accessibilityReviewed: true
  }
  measurements: {
    viewportWidthPx: number
    renderedRowCount: number
    measurementVersion: 2
    resultKind: FinanceX1Result["resultKind"]
    navigationMs: number
    authCheckMs: number
    accessibilityMs: number
    screenshotMs: number
    captureElapsedMs: number
    usefulResultMs: number
    bodyOverflowPx: number
  }
}

const artifacts: LocalArtifact[] = []
let projectFailed = false

function viewportFromProject(projectName: string): Viewport {
  if (projectName.endsWith("-desktop")) return "desktop"
  if (projectName.endsWith("-tablet")) return "tablet"
  if (projectName.endsWith("-mobile")) return "mobile"
  throw new Error(`Unknown local finance X1 viewport project: ${projectName}`)
}

async function verifyAuthenticatedBoundary(page: Page, requiredPermissions: readonly string[]) {
  const response = await page.request.get("/api/auth/permissions")
  expect(response.ok()).toBe(true)
  const payload = (await response.json()) as {
    organizationId?: string
    permissions?: string[]
    roles?: Array<{ code?: string }>
  }
  const permissions = payload.permissions ?? []
  const roles = (payload.roles ?? []).map((role) => role.code)

  expect(payload.organizationId).toBe("rds_org_001")
  expect(roles).toContain("external_accountant")
  expect(requiredPermissions.some((permission) => permissions.includes(permission))).toBe(true)
  for (const forbiddenPermission of financeX1ExternalAccountantForbiddenPermissions) {
    expect(permissions).not.toContain(forbiddenPermission)
  }

  const isolationResponse = await page.request.get("/api/auth/permissions", {
    headers: { "x-organization-id": "rds_org_002" },
  })
  expect(isolationResponse.ok()).toBe(true)
  const isolationPayload = (await isolationResponse.json()) as { organizationId?: string }
  expect(isolationPayload.organizationId).toBe("rds_org_001")
}

async function verifyAccessibility(page: Page) {
  await page.addScriptTag({ content: axe.source })
  const violations = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: typeof axe }).axe
    const result = await engine.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    })
    return result.violations.filter((violation) =>
      violation.impact === "serious" || violation.impact === "critical",
    )
  })
  expect(violations).toEqual([])
}

test.beforeAll(async () => {
  expect(process.env.X1_ALLOW_LOCAL_SIMULATION).toBe("true")
  expect(runId).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]{5,80}$/)
  const preflight = JSON.parse(await readFile(preflightPath, "utf8")) as {
    status?: string
    classification?: string
    storageStatePresent?: boolean
    blockerCount?: number
  }
  expect(preflight).toMatchObject({
    status: "ready-for-local-authenticated-capture",
    classification: "LOCAL_SIMULATION_PREFLIGHT_NOT_RELEASE_EVIDENCE",
    storageStatePresent: true,
    blockerCount: 0,
  })
})

test.afterEach(async ({}, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) projectFailed = true
})

test.afterAll(async ({}, testInfo) => {
  const viewport = viewportFromProject(testInfo.project.name)
  await mkdir(runDirectory, { recursive: true })
  await writeFile(
    join(runDirectory, `fragment-${viewport}.json`),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        classification: "LOCAL_SIMULATION_AUTHENTICATED_EVIDENCE_FRAGMENT",
        authoritative: false,
        approvedForReleaseEvidence: false,
        releaseGate: "BLOCKED_EXTERNAL_APPROVAL_REQUIRED",
        status:
          !projectFailed && artifacts.length === financeX1RequiredEvidenceRoutes.length * 2
            ? "PASS"
            : "FAIL",
        runId,
        viewport,
        artifacts,
      },
      null,
      2,
    )}\n`,
    "utf8",
  )
})

for (const locale of ["en", "fr"] as const) {
  for (const route of financeX1RequiredEvidenceRoutes) {
    test(`${locale} ${route.key} local authenticated evidence`, async ({ page, browserName }, testInfo) => {
      const viewport = viewportFromProject(testInfo.project.name)
      const routePath = `/${locale}${route.path}`
      const startedAt = Date.now()

      const routeTiming = await measureFinanceX1Route(page, routePath, route.key)
      await expect(page).not.toHaveURL(/\/(?:login|unauthorized)(?:\?|$)/)
      await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i)
      const authStartedAt = Date.now()
      await verifyAuthenticatedBoundary(page, route.requiredPermissions)
      const authCheckMs = Date.now() - authStartedAt
      await expect(page.locator("body")).not.toContainText("rds_org_002")
      const accessibilityStartedAt = Date.now()
      await verifyAccessibility(page)
      const accessibilityMs = Date.now() - accessibilityStartedAt

      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      const bodyOverflowPx = Math.max(0, layout.scrollWidth - layout.clientWidth)
      expect(bodyOverflowPx).toBeLessThanOrEqual(2)

      const screenshotPath = join(
        runDirectory,
        "screenshots",
        viewport,
        locale,
        `${route.key}.png`,
      )
      await mkdir(join(runDirectory, "screenshots", viewport, locale), { recursive: true })
      const result = await waitForFinanceX1Result(page, route.key)
      const screenshotStartedAt = Date.now()
      await page.screenshot({ path: screenshotPath, fullPage: true })
      const screenshotMs = Date.now() - screenshotStartedAt
      expect(await page.evaluate(readFinanceX1Result, route.key)).toEqual(result)

      const viewportSize = page.viewportSize()
      expect(viewportSize).not.toBeNull()
      artifacts.push({
        artifactId: `${runId}-${viewport}-${locale}-${route.key}`,
        artifactPath: relative(process.cwd(), screenshotPath).replace(/\\/g, "/"),
        runId,
        organizationId: "rds_org_001",
        foreignIsolationProbeTenantId: "rds_org_002",
        personaRole: "external_accountant",
        locale,
        viewport,
        route: routePath,
        browser: browserName,
        capturedAt: new Date().toISOString(),
        authenticated: true,
        authoritative: false,
        approvedForReleaseEvidence: false,
        checks: {
          routeLoaded: true,
          authorizationVerified: true,
          tenantIsolationVerified: true,
          redactionBoundaryVerified: true,
          layoutUsable: true,
          accessibilityReviewed: true,
        },
        measurements: {
          viewportWidthPx: viewportSize!.width,
          measurementVersion: 2,
          renderedRowCount: result.renderedRowCount,
          resultKind: result.resultKind,
          ...routeTiming,
          authCheckMs,
          accessibilityMs,
          screenshotMs,
          captureElapsedMs: Date.now() - startedAt,
          bodyOverflowPx,
        },
      })
    })
  }
}
