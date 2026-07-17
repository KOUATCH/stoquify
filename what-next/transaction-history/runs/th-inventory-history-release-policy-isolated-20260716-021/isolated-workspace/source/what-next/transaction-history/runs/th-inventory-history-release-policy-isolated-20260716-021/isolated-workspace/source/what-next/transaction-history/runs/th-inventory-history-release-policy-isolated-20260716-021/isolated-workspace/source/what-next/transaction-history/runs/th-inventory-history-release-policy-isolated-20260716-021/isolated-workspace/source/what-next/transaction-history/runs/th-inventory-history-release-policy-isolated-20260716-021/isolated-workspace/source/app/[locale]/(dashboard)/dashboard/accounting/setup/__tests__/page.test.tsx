import { render, screen } from "@testing-library/react"

import { getAccountingSetupDataAction } from "@/actions/accounting/settings.actions"
import { checkPermission } from "@/config/useAuth"

import AccountingSetupPage from "../page"

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}))

jest.mock("@/actions/accounting/settings.actions", () => ({
  closeAccountingPeriodAction: jest.fn(),
  createFiscalYearAction: jest.fn(),
  ensureDefaultJournalsAction: jest.fn(),
  getAccountingSetupDataAction: jest.fn(),
  markAccountingSetupReadyAction: jest.fn(),
  updateAccountingSettingsAction: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}))

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)

  return {
    BookOpenCheck: Icon,
    CalendarDays: Icon,
    CheckCircle2: Icon,
    Landmark: Icon,
    Settings2: Icon,
  }
})

jest.mock("../../_components/accounting-ui", () => ({
  AccountingMessage: ({ error, notice }: { error?: unknown; notice?: unknown }) => (
    <div>
      {error ? <p>{String(error)}</p> : null}
      {notice ? <p>{String(notice)}</p> : null}
    </div>
  ),
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
    actions,
    children,
  }: {
    title: string
    description?: string
    actions?: React.ReactNode
    children: React.ReactNode
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {actions}
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
}))

const mockCheckPermission = checkPermission as jest.Mock
const mockGetAccountingSetupDataAction = getAccountingSetupDataAction as jest.Mock

const pageProps = {
  params: Promise.resolve({ locale: "en" }),
  searchParams: Promise.resolve({ notice: "Ready" }),
}

const setupData = {
  settings: {
    accountingEnabled: true,
    setupStatus: "READY",
    baseCurrency: "XAF",
    countryPack: "OHADA",
    fiscalYearStartMonth: 1,
    fiscalYearStartDay: 1,
  },
  fiscalYears: [
    {
      id: "fy-1",
      name: "FY 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      status: "OPEN",
    },
  ],
  periods: [
    {
      id: "period-1",
      name: "January 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
      status: "OPEN",
    },
  ],
  journals: [
    {
      id: "journal-1",
      code: "OD",
      nameEn: "Operations journal",
      type: "GENERAL",
      isActive: true,
      allowManualEntries: true,
    },
  ],
}

describe("AccountingSetupPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetAccountingSetupDataAction.mockResolvedValue({
      success: true,
      data: setupData,
    })
  })

  it("requires accounting setup manage permission before loading setup data", async () => {
    render(await AccountingSetupPage(pageProps))

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.setup.manage")
    expect(mockGetAccountingSetupDataAction).toHaveBeenCalledWith({})
    expect(screen.getByRole("heading", { name: "Ledger Setup" })).toBeInTheDocument()
    expect(screen.getByText("READY")).toBeInTheDocument()
    expect(screen.getByText("Operations journal")).toBeInTheDocument()
  })

  it("stops before setup data access when setup permission is denied", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(AccountingSetupPage(pageProps)).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.setup.manage")
    expect(mockGetAccountingSetupDataAction).not.toHaveBeenCalled()
  })

  it("keeps setup data action errors inside the setup access panel after permission succeeds", async () => {
    mockGetAccountingSetupDataAction.mockResolvedValue({
      success: false,
      status: "error",
      error: "Setup data unavailable",
    })

    render(await AccountingSetupPage(pageProps))

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.setup.manage")
    expect(mockGetAccountingSetupDataAction).toHaveBeenCalledWith({})
    expect(screen.getByText("Accounting setup access")).toBeInTheDocument()
    expect(screen.getByText("Setup data unavailable")).toBeInTheDocument()
  })
})