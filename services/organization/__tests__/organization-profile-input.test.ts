jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { organization: { update: jest.fn().mockResolvedValue({ id: "org-1" }) } } }))
import { db } from "@/prisma/db"
import { updateFiscalYearStartForOrg, updateInventoryStartDateForOrg, updateOrganizationCurrencyForOrg, updateOrganizationSettingsForOrg, updateOrganizationTimezoneForOrg } from "../organization-settings.service"

beforeEach(() => jest.clearAllMocks())
it.each([
  { currency: "not-a-currency" }, { currency: "12A" }, { timezone: "not/a/timezone" },
  { defaultLocale: "unsupported" }, { fiscalYearStart: "13-01" }, { fiscalYearStart: "02-31" },
  { industry: "x".repeat(101) }, { address: "x".repeat(501) }, { state: "x".repeat(101) }, { country: "x".repeat(101) },
])("rejects invalid operating defaults before a database write: %j", async input => {
  await expect(updateOrganizationSettingsForOrg("org-1", input as Parameters<typeof updateOrganizationSettingsForOrg>[1])).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  expect(db.organization.update).not.toHaveBeenCalled()
})
it("applies the same validation to all exported shortcuts", async () => {
  for (const operation of [
    () => updateOrganizationCurrencyForOrg("org-1", "bad-currency"),
    () => updateOrganizationTimezoneForOrg("org-1", "bad/timezone"),
    () => updateInventoryStartDateForOrg("org-1", new Date("invalid")),
    () => updateFiscalYearStartForOrg("org-1", "02-31"),
  ]) await expect(operation()).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
  expect(db.organization.update).not.toHaveBeenCalled()
})
