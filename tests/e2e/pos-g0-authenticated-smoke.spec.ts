import { expect, test } from "@playwright/test"

const expectedOrganizationId = process.env.AQSTOQFLOW_POS_G0_ORG_ID
const locales = ["en", "fr"] as const
const protectedRoutes = [
  "/dashboard/pos",
  "/dashboard/finance/reconciliation",
  "/dashboard/finance/cash-command",
  "/dashboard/accounting/close",
  "/dashboard/owner-war-room",
  "/dashboard/manager-action-center",
] as const

test.setTimeout(600_000)

test.beforeEach(async ({ request }) => {
  expect(
    expectedOrganizationId,
    "AQSTOQFLOW_POS_G0_ORG_ID must name the tenant bound to the supplied authenticated storage state.",
  ).toBeTruthy()
  const response = await request.get("/api/me/permissions")
  expect(
    response.ok(),
    "The POS G0 browser gate requires a real authenticated session; an unauthenticated redirect is not evidence.",
  ).toBe(true)
  const session = (await response.json()) as { organizationId?: string }
  expect(session.organizationId).toBe(expectedOrganizationId)
})

for (const locale of locales) {
  test(`${locale} protected operating routes render for the authenticated tenant`, async ({
    page,
  }) => {
    for (const route of protectedRoutes) {
      const expectedPath = `/${locale}${route}`
      const response = await page.goto(expectedPath, { waitUntil: "domcontentloaded" })
      expect(response, `${expectedPath} returned no document response`).not.toBeNull()
      expect(response?.status(), `${expectedPath} returned a server error`).toBeLessThan(500)
      await expect(page).toHaveURL(new RegExp(`${expectedPath.replaceAll("/", "\\/")}(?:[?#].*)?$`))
      expect(page.url()).not.toMatch(/\/(?:sign-in|login)(?:[/?#]|$)/i)
      await expect(page.locator("main:visible").first()).toBeVisible()
      await expect(page.locator("body")).not.toContainText("Application error: a server-side exception")
    }

    await page.goto(`/${locale}/dashboard/finance/cash-command`)
    await expect(
      page.locator(`a[href="/${locale}/dashboard/finance/cash-command"]`).first(),
      "The authenticated Finance navigation must expose Cash Command.",
    ).toBeAttached()
    await expect(
      page.locator(`a[href="/${locale}/dashboard/finance/reconciliation"]`).first(),
      "The authenticated Finance navigation must expose Reconciliation.",
    ).toBeAttached()
  })
}
