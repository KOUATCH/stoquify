import { render, screen } from "@testing-library/react"

import TaxRatesManagementDashboard from "@/components/tax-rates/TaxRatesManagementDashboard"

import CreateFinanceTaxRatePage from "../page"

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

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({ kind }: { kind: string }) => <div>{`route:${kind}`}</div>,
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class RbacError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly status: number,
    ) {
      super(message)
      this.name = "RbacError"
    }
  },
  requireAnyPermission: jest.fn(),
}))

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockTaxRatesManagementDashboard = TaxRatesManagementDashboard as jest.Mock

const pageProps = {
  params: Promise.resolve({ locale: "en" }),
}

describe("CreateFinanceTaxRatePage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-tax",
      userId: "user-tax",
      permissions: ["taxes.create"],
      roles: [{ code: "tax_admin" }],
      isSuperUser: false,
    })
  })

  it("requires tax-rate create permission before rendering tenant-scoped dashboard", async () => {
    render(await CreateFinanceTaxRatePage(pageProps))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["taxes.create"], { resource: "FinanceTaxRatesCreate" })
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

  it("renders permission denied when tax-rate create permission is denied", async () => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await CreateFinanceTaxRatePage(pageProps))

    expect(screen.getByText("route:permission_denied")).toBeInTheDocument()
    expect(mockTaxRatesManagementDashboard).not.toHaveBeenCalled()
  })

  it("renders no-active-org state when tenant scope is unavailable", async () => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("No active org", "NO_ACTIVE_ORG", 401))

    render(await CreateFinanceTaxRatePage(pageProps))

    expect(screen.getByText("route:no_active_org")).toBeInTheDocument()
    expect(mockTaxRatesManagementDashboard).not.toHaveBeenCalled()
  })
})
