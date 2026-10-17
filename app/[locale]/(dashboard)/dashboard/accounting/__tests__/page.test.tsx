import { render, screen } from "@testing-library/react"

import { getAccountingDashboardSummaryAction } from "@/actions/accounting/reports.actions"
import { checkPermission } from "@/config/useAuth"

import AccountingDashboardPage from "../page"

jest.mock("@/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access", () => ({
  routeByKey: jest.fn(() => ({ key: "accounting-dashboard" })),
  withAccountingSurfaceAccess: jest.fn(async ({ onAllowed, params }) => onAllowed({ orgId: "org-1" }, (await params).locale)),
}))

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}))

jest.mock("@/actions/accounting/reports.actions", () => ({
  getAccountingDashboardSummaryAction: jest.fn(),
}))

jest.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
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
    BookOpenCheck: Icon,
    ClipboardCheck: Icon,
    FilePlus2: Icon,
    FileSearch: Icon,
    Landmark: Icon,
    ListTree: Icon,
    Scale: Icon,
    Settings2: Icon,
    ShieldCheck: Icon,
  }
})

jest.mock("../_components/accounting-ui", () => ({
  AccountingLinkButton: ({
    href,
    children,
    variant,
  }: {
    href: string
    children: React.ReactNode
    variant?: string
  }) => (
    <a href={href} data-variant={variant}>
      {children}
    </a>
  ),
  AccountingPageShell: ({
    title,
    actions,
    children,
  }: {
    title: string
    actions?: React.ReactNode
    children: React.ReactNode
  }) => (
    <main>
      <h1>{title}</h1>
      {actions}
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
  AccountingStatCard: ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  ),
  accountingDate: (value: Date) => value.toISOString().slice(0, 10),
  formatAccountingMoney: (value: string | number, currency = "XAF") => `${currency} ${Number(value).toFixed(0)}`,
}))

const mockCheckPermission = checkPermission as jest.Mock
const mockGetAccountingDashboardSummaryAction = getAccountingDashboardSummaryAction as jest.Mock

const summaryData = {
  settings: {
    accountingEnabled: true,
    setupStatus: "READY",
    baseCurrency: "XAF",
  },
  counts: {
    accounts: 12,
    journals: 4,
    openPeriods: 2,
    draftEntries: 3,
    postedEntries: 9,
  },
  latestEntries: [
    {
      id: "entry-1",
      entryNumber: "JE-2026-001",
      entryDate: new Date("2026-01-05"),
      status: "POSTED",
      journalCode: "OD",
      periodName: "January 2026",
      debit: "1500",
      credit: "1500",
    },
  ],
}

describe("AccountingDashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetAccountingDashboardSummaryAction.mockResolvedValue({
      success: true,
      data: summaryData,
    })
  })

  it("requires accounting reports read permission before loading accounting summary data", async () => {
    render(await AccountingDashboardPage())

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.reports.read")
    expect(mockGetAccountingDashboardSummaryAction).toHaveBeenCalledWith({})
    expect(screen.getByRole("heading", { name: "Accounting Ledger" })).toBeInTheDocument()
    expect(screen.getByText("Ready")).toBeInTheDocument()
    expect(screen.getByText("JE-2026-001")).toBeInTheDocument()
  })

  it("stops before accounting summary data access when reports permission is denied", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(AccountingDashboardPage()).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.reports.read")
    expect(mockGetAccountingDashboardSummaryAction).not.toHaveBeenCalled()
  })

  it("localizes the French overview, table controls, statuses and dates without changing amounts", async () => {
    render(await AccountingDashboardPage({ params: Promise.resolve({ locale: "fr" }) }))
    expect(screen.getByRole("heading", { name: "Grand livre comptable" })).toBeInTheDocument()
    expect(screen.getByText("Prête")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Nouvelle écriture" })).toHaveAttribute("href", "/dashboard/accounting/journals/new")
    expect(screen.getByText("Comptabilisée")).toBeInTheDocument()
    expect(screen.queryByText("POSTED")).not.toBeInTheDocument()
    expect(screen.getByText("5 janv. 2026")).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: "Rechercher: Dernières écritures comptables" })).toBeInTheDocument()
    expect(screen.getAllByText("XAF 1500")).toHaveLength(2)
    expect(screen.getByText("January 2026")).toBeInTheDocument()
  })

  it("keeps unknown states truthful and localizes the empty report", async () => {
    mockGetAccountingDashboardSummaryAction.mockResolvedValue({ success: true, data: {
      ...summaryData, settings: { ...summaryData.settings, setupStatus: "FUTURE_STATE" }, latestEntries: [],
    } })
    render(await AccountingDashboardPage({ params: Promise.resolve({ locale: "fr" }) }))
    expect(screen.getByText("État inconnu")).toBeInTheDocument()
    expect(screen.getByText("Aucune écriture comptable pour le moment.")).toBeInTheDocument()
    expect(screen.queryByText("Prête")).not.toBeInTheDocument()
  })

  it("localizes the French unavailable fallback without inventing zero figures", async () => {
    mockGetAccountingDashboardSummaryAction.mockResolvedValue({ success: false })
    render(await AccountingDashboardPage({ params: Promise.resolve({ locale: "fr" }) }))
    expect(screen.getByText("Les données comptables sont indisponibles.")).toBeInTheDocument()
    expect(screen.queryByText("Écritures comptabilisées")).not.toBeInTheDocument()
  })

  it("keeps accounting summary action errors inside the accounting access panel after permission succeeds", async () => {
    mockGetAccountingDashboardSummaryAction.mockResolvedValue({
      success: false,
      status: "error",
      error: "Accounting summary unavailable",
    })

    render(await AccountingDashboardPage())

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.reports.read")
    expect(mockGetAccountingDashboardSummaryAction).toHaveBeenCalledWith({})
    expect(screen.getByText("Accounting access")).toBeInTheDocument()
    expect(screen.getByText("Accounting summary unavailable")).toBeInTheDocument()
  })
})
