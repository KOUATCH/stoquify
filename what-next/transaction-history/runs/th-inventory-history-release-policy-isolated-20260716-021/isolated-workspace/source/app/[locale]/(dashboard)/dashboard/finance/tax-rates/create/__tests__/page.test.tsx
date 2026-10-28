import { render, screen } from "@testing-library/react"
import { redirect } from "next/navigation"

import TaxRatesManagementDashboard from "@/components/tax-rates/TaxRatesManagementDashboard"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"

import CreateFinanceTaxRatePage from "../page"

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/tax-rates/TaxRatesManagementDashboard", () =>
  jest.fn(({ organizationId, locale, initialAction }) => (
    <section>
      <h1>Tax rate dashboard</h1>
      <p>organization:{organizationId}</p>
      <p>locale:{locale}</p>
      <p>action:{initialAction}</p>
    </section>
  )),
)

const mockCheckPermission = checkPermission as jest.Mock
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock
const mockRedirect = redirect as unknown as jest.Mock
const mockTaxRatesManagementDashboard = TaxRatesManagementDashboard as jest.Mock

const pageProps = {
  params: Promise.resolve({ locale: "en" }),
}

describe("CreateFinanceTaxRatePage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetAuthenticatedUser.mockResolvedValue({ organizationId: "org-tax" })
  })

  it("requires tax-rate create permission before rendering the tenant-scoped create dashboard", async () => {
    render(await CreateFinanceTaxRatePage(pageProps))

    expect(mockCheckPermission).toHaveBeenCalledWith("taxes.create")
    expect(mockGetAuthenticatedUser).toHaveBeenCalledTimes(1)
    expect(mockTaxRatesManagementDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-tax",
        locale: "en",
        initialAction: "create",
      }),
      undefined,
    )
    expect(screen.getByRole("heading", { name: "Tax rate dashboard" })).toBeInTheDocument()
    expect(screen.getByText("organization:org-tax")).toBeInTheDocument()
  })

  it("stops before tenant lookup and rendering when tax-rate create permission is denied", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(CreateFinanceTaxRatePage(pageProps)).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("taxes.create")
    expect(mockGetAuthenticatedUser).not.toHaveBeenCalled()
    expect(mockTaxRatesManagementDashboard).not.toHaveBeenCalled()
  })

  it("redirects to the localized unauthorized page when tenant scope is unavailable", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ organizationId: null })

    await expect(CreateFinanceTaxRatePage(pageProps)).rejects.toThrow("NEXT_REDIRECT:/en/unauthorized")

    expect(mockCheckPermission).toHaveBeenCalledWith("taxes.create")
    expect(mockRedirect).toHaveBeenCalledWith("/en/unauthorized")
    expect(mockTaxRatesManagementDashboard).not.toHaveBeenCalled()
  })
})