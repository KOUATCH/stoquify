import { render, screen } from "@testing-library/react"

import { getTrialBalanceAction } from "@/actions/accounting/reports.actions"
import { checkPermission } from "@/config/useAuth"

import TrialBalancePage from "../page"

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
    expect(screen.getByText("Trial balance access")).toBeInTheDocument()
    expect(screen.getByText("Trial balance unavailable")).toBeInTheDocument()
  })
})
