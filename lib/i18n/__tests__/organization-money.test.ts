import {
  OrganizationCurrencyUnavailableError,
  createOrganizationMoneyFormatter,
  currencyFractionDigits,
} from "@/lib/i18n/organization-money"

describe("createOrganizationMoneyFormatter", () => {
  it("reports ISO currency precision for cash comparisons", () => {
    expect(currencyFractionDigits("XAF")).toBe(0)
    expect(currencyFractionDigits("xof")).toBe(0)
    expect(currencyFractionDigits("USD")).toBe(2)
  })

  it.each(["XAF", "XOF"])("uses ISO minor-unit precision for %s", (currency) => {
    const formatter = createOrganizationMoneyFormatter({
      organizationId: "org-1",
      locale: "en-US",
      currency,
    })

    expect(formatter.resolvedOptions()).toMatchObject({
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    expect(formatter.formatToParts(1234).some((part) => part.type === "fraction")).toBe(false)
  })

  it("honors a non-default locale while retaining the organization currency", () => {
    const formatter = createOrganizationMoneyFormatter({
      organizationId: "org-xof",
      locale: "fr-FR",
      currency: "XOF",
    })
    const parts = formatter.formatToParts(1234567)

    expect(formatter.resolvedOptions()).toMatchObject({ locale: "fr-FR", currency: "XOF" })
    expect(parts.filter((part) => part.type === "group").map((part) => part.value)).toEqual([
      "\u202f",
      "\u202f",
    ])
    expect(parts.findIndex((part) => part.type === "currency")).toBeGreaterThan(
      parts.findIndex((part) => part.type === "integer"),
    )
  })

  it("reports a missing organization currency instead of choosing a default", () => {
    expect(() =>
      createOrganizationMoneyFormatter({
        organizationId: "org-missing-currency",
        locale: "fr-FR",
        currency: "",
      }),
    ).toThrow(OrganizationCurrencyUnavailableError)
  })
})
