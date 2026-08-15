import { render, screen } from "@testing-library/react"

import {
  listJournalEntriesAction,
  listJournalsAction,
} from "@/actions/accounting/journals.actions"
import { checkPermission } from "@/config/useAuth"

import AccountingJournalsPage from "../page"

jest.mock("@/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access", () => ({
  routeByKey: jest.fn(() => ({ key: "accounting-test" })),
  withAccountingSurfaceAccess: jest.fn(({ onAllowed }) => onAllowed({ orgId: "org-1" }, "en")),
}))

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}))

jest.mock("@/actions/accounting/journals.actions", () => ({
  listJournalEntriesAction: jest.fn(),
  listJournalsAction: jest.fn(),
  postJournalEntryAction: jest.fn(),
  reverseJournalEntryAction: jest.fn(),
}))

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)

  return {
    BookOpenCheck: Icon,
    FilePlus2: Icon,
    RotateCcw: Icon,
    Scale: Icon,
  }
})

jest.mock("../../_components/accounting-ui", () => ({
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
  AccountingStatCard: ({ label, value }: { label: string; value: string }) => (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  ),
  accountingDate: (value: Date) => value.toISOString().slice(0, 10),
  formatAccountingMoney: (value: number) => `XAF ${value.toFixed(0)}`,
}))

const mockCheckPermission = checkPermission as jest.Mock
const mockListJournalsAction = listJournalsAction as jest.Mock
const mockListJournalEntriesAction = listJournalEntriesAction as jest.Mock

const pageProps = {
  params: Promise.resolve({ locale: "en" }),
  searchParams: Promise.resolve({ notice: "Ready" }),
}

describe("AccountingJournalsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockListJournalsAction.mockResolvedValue({
      success: true,
      data: [
        {
          id: "journal-1",
          code: "GEN",
          isActive: true,
        },
      ],
    })
    mockListJournalEntriesAction.mockResolvedValue({
      success: true,
      data: [
        {
          id: "entry-1",
          entryNumber: "JE-0001",
          entryDate: new Date("2026-01-15T00:00:00.000Z"),
          status: "DRAFT",
          memo: "Opening balance",
          journal: { code: "GEN", nameEn: "General journal" },
          period: { name: "January 2026" },
          lines: [
            { debit: "1000", credit: "0" },
            { debit: "0", credit: "1000" },
          ],
        },
      ],
    })
  })

  it("requires accounting journal read permission before loading journal data", async () => {
    render(await AccountingJournalsPage(pageProps))

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.journal.read")
    expect(mockListJournalsAction).toHaveBeenCalledWith({})
    expect(mockListJournalEntriesAction).toHaveBeenCalledWith({ take: 100 })
    expect(screen.getByRole("heading", { name: "Journal Entries" })).toBeInTheDocument()
    expect(screen.getByText("JE-0001")).toBeInTheDocument()
    expect(screen.getByText("Ready")).toBeInTheDocument()
  })

  it("stops before journal data access when the permission guard denies access", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(AccountingJournalsPage(pageProps)).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.journal.read")
    expect(mockListJournalsAction).not.toHaveBeenCalled()
    expect(mockListJournalEntriesAction).not.toHaveBeenCalled()
  })

  it("keeps journal entry read errors inside the accounting panel after permission succeeds", async () => {
    mockListJournalEntriesAction.mockResolvedValue({
      success: false,
      status: "error",
      error: "Entries unavailable",
    })

    render(await AccountingJournalsPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    }))

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.journal.read")
    expect(mockListJournalsAction).toHaveBeenCalledWith({})
    expect(mockListJournalEntriesAction).toHaveBeenCalledWith({ take: 100 })
    expect(screen.getByText("Entries unavailable")).toBeInTheDocument()
    expect(screen.getByText("No journal entries yet.")).toBeInTheDocument()
  })
})
