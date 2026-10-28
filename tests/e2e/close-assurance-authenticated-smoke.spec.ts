import { expect, test, type Page } from "@playwright/test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

test.describe.configure({ timeout: 240_000 })
test.use({ acceptDownloads: true })

const accountingPeriodId =
  process.env.AQSTOQFLOW_CLOSE_E2E_PERIOD_ID ??
  "payroll_e2e_browser_2026_06_accounting_period"
const evidenceDir = join(
  process.cwd(),
  "what-next",
  "accounting",
  "close-assurance-browser-smoke",
)
const evidencePath = join(
  process.cwd(),
  "what-next",
  "accounting",
  "AQSTOQFLOW_CLOSE_ASSURANCE_BROWSER_SMOKE_2026-07-20.json",
)

type BrowserSmokeEvidence = {
  scenario: string
  path: string
  finalUrl: string
  screenshot?: string
  downloadedFile?: string
  contentHash?: string
  watermarkId?: string
  mode?: string
}

const evidence: BrowserSmokeEvidence[] = []

function relativeEvidencePath(absolutePath: string) {
  return absolutePath
    .replace(process.cwd(), "")
    .replace(/^[/\\]/, "")
    .replace(/\\/g, "/")
}

async function expectNoServerError(page: Page) {
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
  await expect(page.locator("body")).not.toContainText("Application error")
  await expect(page.locator("body")).not.toContainText("Internal Server Error")
  await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error")
}

async function expectCloseSurface(page: Page) {
  await expect(
    page.getByRole("heading", { name: /Close & Assurance Center/i }),
  ).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText("Close readiness checklist")).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByRole("heading", { name: "Close pack export" })).toBeVisible()
  await expect(page.getByText(/System evidence pack only/i)).toBeVisible()
  await expect(page.getByTestId("close-readiness-workspace")).toHaveAttribute(
    "data-client-ready",
    "true",
    { timeout: 60_000 },
  )
}

async function saveScreenshot(page: Page, scenario: string) {
  await mkdir(evidenceDir, { recursive: true })
  const screenshotPath = join(evidenceDir, `${scenario}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  return relativeEvidencePath(screenshotPath)
}

test.afterAll(async () => {
  await mkdir(join(process.cwd(), "what-next", "accounting"), {
    recursive: true,
  })
  await writeFile(
    evidencePath,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        auth: {
          storageState:
            process.env.PLAYWRIGHT_STORAGE_STATE ??
            "playwright/.auth/payroll.json",
          fixtureSource: "scripts/seed-payroll-e2e-user.js",
          organizationId:
            process.env.AQSTOQFLOW_E2E_ORG_ID ?? "org_payroll_e2e_local",
          accountingPeriodId,
        },
        results: evidence,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  )
})

test.describe("authenticated close assurance browser smoke", () => {
  test("close dashboard renders as an authenticated tenant route", async ({
    page,
  }) => {
    const routePath = "/en/dashboard/accounting/close"
    await page.goto(routePath, { waitUntil: "domcontentloaded" })
    await expectNoServerError(page)
    await expectCloseSurface(page)

    evidence.push({
      scenario: "close-dashboard",
      path: routePath,
      finalUrl: page.url(),
      screenshot: await saveScreenshot(page, "close-dashboard"),
    })
  })

  test("period dashboard runs assessment and downloads a draft close pack", async ({
    page,
  }) => {
    const routePath = `/en/dashboard/accounting/close/${accountingPeriodId}`
    await page.goto(routePath, { waitUntil: "domcontentloaded" })
    await expectNoServerError(page)
    await expectCloseSurface(page)

    const runButton = page.getByRole("button", { name: /Run assessment/i })
    await expect(runButton).toBeEnabled({ timeout: 60_000 })
    await runButton.click()

    const draftButton = page.getByRole("button", {
      name: /Export draft JSON/i,
    })
    await expect(draftButton).toBeEnabled({ timeout: 90_000 })

    const downloadPromise = page.waitForEvent("download", { timeout: 90_000 })
    await draftButton.click()
    const download = await downloadPromise
    const suggestedFileName = download.suggestedFilename()
    expect(suggestedFileName).toMatch(/close-pack-draft-not-certified.*\.json$/)

    await mkdir(evidenceDir, { recursive: true })
    const downloadedPath = join(evidenceDir, suggestedFileName)
    await download.saveAs(downloadedPath)
    const content = await readFile(downloadedPath, "utf8")
    const payload = JSON.parse(content) as {
      kind?: string
      export?: {
        mode?: string
        contentHash?: string
        watermarkId?: string
        redaction?: string
      }
      certificationScope?: { statutoryReadinessStatus?: string }
    }

    expect(payload.kind).toBe("AQSTOQFLOW_CLOSE_ASSURANCE_PACK")
    expect(payload.export?.mode).toBe("DRAFT_NOT_CERTIFIED")
    expect(payload.export?.contentHash).toMatch(/^sha256:/)
    expect(payload.export?.watermarkId).toContain("draft-not-certified")
    expect(payload.export?.redaction).toContain("Secrets")
    expect(payload.certificationScope?.statutoryReadinessStatus).toBe(
      "STATUTORY_BLOCKED",
    )
    expect(content).not.toMatch(
      /super-secret|provider-token|Bearer raw-token|private-salary|private-payment/i,
    )

    const certificationRow = page.getByTestId("close-certification-row")
    await expect(certificationRow.getByText("Last export")).toBeVisible({ timeout: 30_000 })
    await expect(certificationRow.getByText(payload.export?.contentHash ?? "")).toBeVisible()

    evidence.push({
      scenario: "close-pack-draft-download",
      path: routePath,
      finalUrl: page.url(),
      screenshot: await saveScreenshot(page, "close-pack-draft-download"),
      downloadedFile: relativeEvidencePath(downloadedPath),
      contentHash: payload.export?.contentHash,
      watermarkId: payload.export?.watermarkId,
      mode: payload.export?.mode,
    })
  })
})