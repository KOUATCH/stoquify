import { render, screen } from "@testing-library/react"

import { getTrialBalanceAction } from "@/actions/accounting/reports.actions"
import { checkPermission } from "@/config/useAuth"

import TrialBalancePage from "../page"

jest.mock("@/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access", () => ({
  routeByKey: jest.fn(() => ({ key: "accounting-test" })),
  withAccountingSurfaceAccess: jest.fn(async ({ params, onAllowed }) => onAllowed({ orgId: "org-1" }, (await params).locale)),
}))

jest.mock("@/i18n/routing", () => ({ localizePath: (href: string, locale: string) => `/${locale}${href}` }))

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}))

jest.mock("@/actions/accounting/reports.actions", () => ({
  getTrialBalanceAction: jest.fn(),
}))

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)

  return {
    Search: Icon,
    X: Icon,
    Check: Icon,
    ChevronDown: Icon,
    ChevronUp: Icon,
    Scale: Icon,
  }
})

jest.mock("../../../_components/accounting-ui", () => ({
  AccountingPageShell: ({
    title,
    children,
  }: {
    title: string
    children: React.ReactNode
  }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
  AccountingPanel: ({
    title,
    description,
    children,
  }: {
    title: string
    description?: string
    children: React.ReactNode
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
  AccountingStatCard: ({ label, value }: { label: string; value: string }) => (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  ),
  formatAccountingMoney: (value: string | number) => `XAF ${Number(value).toFixed(0)}`,
}))

const mockCheckPermission = checkPermission as jest.Mock
const mockGetTrialBalanceAction = getTrialBalanceAction as jest.Mock

describe("TrialBalancePage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetTrialBalanceAction.mockResolvedValue({
      success: true,
      data: {
        rows: [
          {
            accountId: "account-1",
            code: "571000",
            nameEn: "Cash",
            type: "ASSET",
            normalBalance: "DEBIT",
            activityDebit: "1000",
            activityCredit: "250",
            debitBalance: "750",
            creditBalance: "0",
          },
        ],
        totals: {
          activityDebit: "1000",
          activityCredit: "250",
          debitBalance: "750",
          creditBalance: "0",
          isBalanced: true,
        },
      },
    })
  })

  it("requires accounting report read permission before loading trial balance data", async () => {
    render(await TrialBalancePage())

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.reports.read")
    expect(mockGetTrialBalanceAction).toHaveBeenCalledWith({ includeZeroBalance: true })
    expect(screen.getByRole("heading", { name: "Trial Balance" })).toBeInTheDocument()
    expect(screen.getByText("571000")).toBeInTheDocument()
    expect(screen.getByText("Cash")).toBeInTheDocument()
    expect(screen.getByText("Balanced")).toBeInTheDocument()
  })

  it("stops before trial balance data access when the permission guard denies access", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(TrialBalancePage()).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.reports.read")
    expect(mockGetTrialBalanceAction).not.toHaveBeenCalled()
  })

  it("keeps report read errors inside the accounting panel after permission succeeds", async () => {
    mockGetTrialBalanceAction.mockResolvedValue({
      success: false,
      status: "error",
      error: "Trial balance unavailable",
    })

    render(await TrialBalancePage())

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.reports.read")
    expect(mockGetTrialBalanceAction).toHaveBeenCalledWith({ includeZeroBalance: true })
    expect(screen.getByRole("heading", { name: "Trial balance unavailable" })).toBeInTheDocument()
    expect(screen.getAllByText("Trial balance unavailable")).toHaveLength(2)
    expect(screen.getByRole("link", { name: "Reload report" })).toHaveAttribute("href", "/en/dashboard/accounting/reports/trial-balance")
    expect(screen.queryByText(/Check accounting report permissions/)).not.toBeInTheDocument()
  })

  it.each([
    ["en", "Trial balance unavailable", "Review journal entries", /Totals are withheld/],
    ["fr", "Balance générale indisponible", "Consulter les écritures", /Les totaux restent masqués/],
  ] as const)("routes incomplete currency evidence to journal review in %s without displaying totals", async (locale, title, link, message) => {
    mockGetTrialBalanceAction.mockResolvedValue({
      success: false, code: "BUSINESS_RULE_VIOLATION", status: 422,
      error: "Functional-currency evidence is missing from a journal line. Review the historical entry before reporting.",
    })
    render(await TrialBalancePage({ params: Promise.resolve({ locale }) }))
    expect(screen.getByRole("heading", { name: title })).toBeVisible()
    expect(screen.getByText(message)).toBeVisible()
    expect(screen.getByRole("link", { name: link })).toHaveAttribute("href", `/${locale}/dashboard/accounting/journals`)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByText(/Balanced|Équilibrée|Check accounting report permissions/)).not.toBeInTheDocument()
    if (locale === "fr") expect(screen.queryByText(/Functional-currency evidence/)).not.toBeInTheDocument()
  })

  it("offers access review only when the protected action actually denies access", async () => {
    mockGetTrialBalanceAction.mockResolvedValue({ success: false, code: "FORBIDDEN", status: 403, error: "Access denied" })
    render(await TrialBalancePage({ params: Promise.resolve({ locale: "fr" }) }))
    expect(screen.getByRole("heading", { name: "Accès à la balance générale" })).toBeVisible()
    expect(screen.getByRole("link", { name: "Vérifier mes autorisations" })).toHaveAttribute("href", "/fr/dashboard/access-requests")
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("passes the French route locale into the existing table and summary", async () => {
    render(await TrialBalancePage({ params: Promise.resolve({ locale: "fr" }) }))
    expect(screen.getByRole("heading", { name: "Balance générale", level: 1 })).toBeVisible()
    expect(screen.getByText("Équilibrée")).toBeVisible()
    expect(screen.getByRole("searchbox", { name: "Rechercher des comptes" })).toBeVisible()
  })
})
