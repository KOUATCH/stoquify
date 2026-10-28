import { render, screen } from "@testing-library/react"

import { getAccountingDashboardSummaryAction } from "@/actions/accounting/reports.actions"
import { checkPermission } from "@/config/useAuth"

import AccountingDashboardPage from "../page"

jest.mock("@/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access", () => ({
  routeByKey: jest.fn(() => ({ key: "accounting-dashboard" })),
  withAccountingSurfaceAccess: jest.fn(({ onAllowed }) => onAllowed({ orgId: "org-1" }, "en")),
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
    expect(screen.getByText("READY")).toBeInTheDocument()
    expect(screen.getByText("JE-2026-001")).toBeInTheDocument()
  })

  it("stops before accounting summary data access when reports permission is denied", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(AccountingDashboardPage()).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.reports.read")
    expect(mockGetAccountingDashboardSummaryAction).not.toHaveBeenCalled()
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
