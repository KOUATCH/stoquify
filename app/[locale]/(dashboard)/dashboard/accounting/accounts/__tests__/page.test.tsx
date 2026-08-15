import { render, screen } from "@testing-library/react"

import { listChartAccountsAction } from "@/actions/accounting/accounts.actions"
import { checkPermission } from "@/config/useAuth"

import AccountingAccountsPage from "../page"

jest.mock("@/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access", () => ({
  routeByKey: jest.fn(() => ({ key: "accounting-test" })),
  withAccountingSurfaceAccess: jest.fn(({ onAllowed }) => onAllowed({ orgId: "org-1" }, "en")),
}))

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}))

jest.mock("@/actions/accounting/accounts.actions", () => ({
  archiveChartAccountAction: jest.fn(),
  createChartAccountAction: jest.fn(),
  listChartAccountsAction: jest.fn(),
}))

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)

  return {
    Archive: Icon,
    ListTree: Icon,
    Plus: Icon,
  }
})

jest.mock("../../_components/accounting-ui", () => ({
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
  AccountingMessage: ({ error, notice }: { error?: string; notice?: string }) => (
    <div>
      {error ? <p>{error}</p> : null}
      {notice ? <p>{notice}</p> : null}
    </div>
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
}))

const mockCheckPermission = checkPermission as jest.Mock
const mockListChartAccountsAction = listChartAccountsAction as jest.Mock

const pageProps = {
  params: Promise.resolve({ locale: "en" }),
  searchParams: Promise.resolve({ notice: "Ready" }),
}

describe("AccountingAccountsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockListChartAccountsAction.mockResolvedValue({
      success: true,
      data: [
        {
          id: "account-1",
          code: "411000",
          nameEn: "Customers",
          nameFr: null,
          type: "ASSET",
          normalBalance: "DEBIT",
          isActive: true,
          allowManualPost: true,
          isControlAccount: false,
          currency: "XAF",
          _count: { children: 0, journalLines: 2 },
        },
      ],
    })
  })

  it("requires accounting account read permission before loading chart accounts", async () => {
    render(await AccountingAccountsPage(pageProps))

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.accounts.read")
    expect(mockListChartAccountsAction).toHaveBeenCalledWith({ includeInactive: true })
    expect(screen.getByRole("heading", { name: "Accounting Accounts" })).toBeInTheDocument()
    expect(screen.getByText("Customers")).toBeInTheDocument()
    expect(screen.getByText("Ready")).toBeInTheDocument()
  })

  it("stops before chart account data access when the permission guard denies access", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(AccountingAccountsPage(pageProps)).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.accounts.read")
    expect(mockListChartAccountsAction).not.toHaveBeenCalled()
  })

  it("keeps safe action errors inside the accounting panel after permission succeeds", async () => {
    mockListChartAccountsAction.mockResolvedValue({
      success: false,
      status: "error",
      error: "Accounts unavailable",
    })

    render(await AccountingAccountsPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    }))

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.accounts.read")
    expect(mockListChartAccountsAction).toHaveBeenCalledWith({ includeInactive: true })
    expect(screen.getByText("Accounts unavailable")).toBeInTheDocument()
    expect(screen.getByText("No accounts yet.")).toBeInTheDocument()
  })
})
