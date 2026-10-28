import { render, screen } from "@testing-library/react"

import { listChartAccountsAction } from "@/actions/accounting/accounts.actions"
import {
  createManualJournalEntryAction,
  listJournalsAction,
} from "@/actions/accounting/journals.actions"
import { checkPermission } from "@/config/useAuth"

import NewJournalEntryPage from "../page"

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}))

jest.mock("@/actions/accounting/accounts.actions", () => ({
  listChartAccountsAction: jest.fn(),
}))

jest.mock("@/actions/accounting/journals.actions", () => ({
  createManualJournalEntryAction: jest.fn(),
  listJournalsAction: jest.fn(),
}))

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)

  return {
    FilePlus2: Icon,
    Scale: Icon,
  }
})

jest.mock("../../../_components/accounting-ui", () => ({
  AccountingLinkButton: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href}>{children}</a>,
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
}))

const mockCheckPermission = checkPermission as jest.Mock
const mockListChartAccountsAction = listChartAccountsAction as jest.Mock
const mockListJournalsAction = listJournalsAction as jest.Mock

const pageProps = {
  params: Promise.resolve({ locale: "en" }),
  searchParams: Promise.resolve({ notice: "Ready" }),
}

describe("NewJournalEntryPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockListChartAccountsAction.mockResolvedValue({
      success: true,
      data: [
        {
          id: "account-1",
          code: "571000",
          nameEn: "Cash",
          allowManualPost: true,
          isActive: true,
          currency: "XAF",
          _count: { children: 0 },
        },
      ],
    })
    mockListJournalsAction.mockResolvedValue({
      success: true,
      data: [
        {
          id: "journal-1",
          code: "GEN",
          nameEn: "General journal",
          allowManualEntries: true,
          isActive: true,
        },
      ],
    })
  })

  it("requires create and read permissions before loading setup data", async () => {
    render(await NewJournalEntryPage(pageProps))

    expect(mockCheckPermission).toHaveBeenNthCalledWith(1, "accounting.journal.create")
    expect(mockCheckPermission).toHaveBeenNthCalledWith(2, "accounting.journal.read")
    expect(mockListChartAccountsAction).toHaveBeenCalledWith({})
    expect(mockListJournalsAction).toHaveBeenCalledWith({})
    expect(createManualJournalEntryAction).not.toHaveBeenCalled()
    expect(screen.getByRole("heading", { name: "New Journal Entry" })).toBeInTheDocument()
    expect(screen.getAllByText("571000 - Cash")).toHaveLength(6)
    expect(screen.getByText("GEN - General journal")).toBeInTheDocument()
    expect(screen.getByText("Ready")).toBeInTheDocument()
  })

  it("stops before setup data access when create permission is denied", async () => {
    mockCheckPermission.mockRejectedValueOnce(new Error("Forbidden"))

    await expect(NewJournalEntryPage(pageProps)).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.journal.create")
    expect(mockListChartAccountsAction).not.toHaveBeenCalled()
    expect(mockListJournalsAction).not.toHaveBeenCalled()
  })

  it("stops before setup data access when read permission is denied", async () => {
    mockCheckPermission
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error("Forbidden"))

    await expect(NewJournalEntryPage(pageProps)).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenNthCalledWith(1, "accounting.journal.create")
    expect(mockCheckPermission).toHaveBeenNthCalledWith(2, "accounting.journal.read")
    expect(mockListChartAccountsAction).not.toHaveBeenCalled()
    expect(mockListJournalsAction).not.toHaveBeenCalled()
  })

  it("keeps setup read errors inside the accounting panel after permission succeeds", async () => {
    mockListChartAccountsAction.mockResolvedValue({
      success: false,
      status: "error",
      error: "Accounts unavailable",
    })

    render(await NewJournalEntryPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    }))

    expect(mockCheckPermission).toHaveBeenNthCalledWith(1, "accounting.journal.create")
    expect(mockCheckPermission).toHaveBeenNthCalledWith(2, "accounting.journal.read")
    expect(mockListChartAccountsAction).toHaveBeenCalledWith({})
    expect(mockListJournalsAction).toHaveBeenCalledWith({})
    expect(screen.getByText("Accounts unavailable")).toBeInTheDocument()
  })
})
