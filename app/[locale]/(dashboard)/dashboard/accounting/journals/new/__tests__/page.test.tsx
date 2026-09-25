import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { listChartAccountsAction } from "@/actions/accounting/accounts.actions"
import {
  createManualJournalEntryAction,
  listJournalsAction,
} from "@/actions/accounting/journals.actions"
import { checkPermission } from "@/config/useAuth"

import NewJournalEntryPage from "../page"

const mockPush = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock("next-intl/server", () => ({
  getTranslations: async ({ locale }: { locale: string }) => {
    const messages = jest.requireActual(locale === "fr" ? "@/messages/fr.json" : "@/messages/en.json")
    return (key: string) => messages.moduleComposition.accountingCreate[key]
  },
}))

jest.mock("@/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access", () => ({
  routeByKey: jest.fn(() => ({ key: "accounting-test" })),
  withAccountingSurfaceAccess: jest.fn(({ onAllowed }) => onAllowed({ orgId: "org-1" }, "en")),
}))

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

function fillDraft(container: HTMLElement) {
  const values: Record<string, string> = { journalId: "journal-1", entryDate: "2026-09-04", currency: "XAF", reference: "REF-RETAINED", memo: "Keep this draft" }
  for (let index = 0; index < 6; index++) {
    Object.assign(values, { [`accountId-${index}`]: "account-1", [`description-${index}`]: `Line ${index + 1}`, [`debit-${index}`]: index % 2 === 0 ? "125.00" : "", [`credit-${index}`]: index % 2 === 1 ? "125.00" : "" })
  }
  for (const [name, value] of Object.entries(values)) fireEvent.change(container.querySelector(`[name="${name}"]`)!, { target: { value } })
  return () => {
    for (const [name, value] of Object.entries(values)) expect((container.querySelector(`[name="${name}"]`) as HTMLInputElement).value).toBe(value)
  }
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

  it.each(["accounts", "journals"])("withholds the form when the %s setup lookup fails after permission succeeds", async source => {
    const lookup = source === "accounts" ? mockListChartAccountsAction : mockListJournalsAction
    lookup.mockResolvedValue({
      success: false,
      status: "error",
      error: "Private setup failure detail",
    })

    render(await NewJournalEntryPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    }))

    expect(mockCheckPermission).toHaveBeenNthCalledWith(1, "accounting.journal.create")
    expect(mockCheckPermission).toHaveBeenNthCalledWith(2, "accounting.journal.read")
    expect(mockListChartAccountsAction).toHaveBeenCalledWith({})
    expect(mockListJournalsAction).toHaveBeenCalledWith({})
    expect(screen.getByText("Accounting setup could not be loaded")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Retry setup loading" })).toHaveAttribute("href", "/dashboard/accounting/journals/new")
    expect(screen.queryByText("Private setup failure detail")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Create draft" })).not.toBeInTheDocument()
    expect(document.querySelector("form")).toBeNull()
    expect(createManualJournalEntryAction).not.toHaveBeenCalled()
  })

  it("localizes a failed setup load in French without displaying an empty creation form", async () => {
    mockListJournalsAction.mockResolvedValue({ success: false, error: "Unavailable" })
    render(await NewJournalEntryPage({ params: Promise.resolve({ locale: "fr" }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText("La configuration comptable n’a pas pu être chargée")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Réessayer le chargement" })).toBeInTheDocument()
    expect(document.querySelector("form")).toBeNull()
    expect(createManualJournalEntryAction).not.toHaveBeenCalled()
  })

  it.each(["accounts", "journals"])("shows successful empty %s as missing setup, distinct from failed lookup", async source => {
    const lookup = source === "accounts" ? mockListChartAccountsAction : mockListJournalsAction
    lookup.mockResolvedValue({ success: true, data: [] })
    render(await NewJournalEntryPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) }))
    expect(screen.getByText("No eligible accounts or manual journals are configured. Ask the accounting owner to complete setup before creating a draft.")).toBeInTheDocument()
    expect(screen.queryByText("Accounting setup could not be loaded")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Retry setup loading" })).not.toBeInTheDocument()
    expect(document.querySelector("form")).toBeNull()
    expect(createManualJournalEntryAction).not.toHaveBeenCalled()
  })

  it.each(["en", "fr"])("keeps every draft field after the stopped-write result and explains it in %s", async locale => {
    ;(createManualJournalEntryAction as jest.Mock).mockResolvedValue({ success: false, code: "FORBIDDEN", reason: "MODULE_NEW_WORK_STOPPED", error: "Forbidden" })
    const { container } = render(await NewJournalEntryPage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) }))
    const assertDraft = fillDraft(container)
    expect(screen.getByRole("button", { name: locale === "fr" ? "Créer le brouillon" : "Create draft" })).toBeEnabled()
    fireEvent.submit(container.querySelector("form")!)
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(locale === "fr" ? "Les nouvelles écritures manuelles sont arrêtées" : "New manual journals are stopped")
    expect(alert).toHaveTextContent(locale === "fr" ? "responsable autorisé" : "authorized configuration owner")
    expect(alert).toHaveFocus()
    expect(screen.getByRole("link", { name: locale === "fr" ? "Ouvrir la liste des écritures" : "Open journal queue" })).toHaveAttribute("href", `/${locale}/dashboard/accounting/journals`)
    assertDraft()
    expect(createManualJournalEntryAction).toHaveBeenCalledTimes(1)
    expect(createManualJournalEntryAction).toHaveBeenCalledWith(expect.objectContaining({ journalId: "journal-1", entryDate: "2026-09-04", reference: "REF-RETAINED", memo: "Keep this draft", lines: expect.arrayContaining([expect.objectContaining({ description: "Line 6", credit: "125.00", currency: "XAF" })]) }))
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("preserves the draft and does not relabel validation failure as stopped work", async () => {
    ;(createManualJournalEntryAction as jest.Mock).mockResolvedValue({ success: false, code: "VALIDATION_ERROR", reason: "MODULE_NEW_WORK_STOPPED", error: "The journal is not balanced" })
    const { container } = render(await NewJournalEntryPage(pageProps))
    const assertDraft = fillDraft(container)
    fireEvent.submit(container.querySelector("form")!)
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("The journal is not balanced")
    expect(alert).not.toHaveTextContent("New manual journals are stopped")
    assertDraft()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("keeps fields on an unknown network outcome and asks the user to check before retrying", async () => {
    ;(createManualJournalEntryAction as jest.Mock).mockRejectedValue(new Error("private transport detail"))
    const { container } = render(await NewJournalEntryPage(pageProps))
    const assertDraft = fillDraft(container)
    fireEvent.submit(container.querySelector("form")!)
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Check the journal queue before submitting again")
    expect(alert).not.toHaveTextContent("private transport detail")
    assertDraft()
    expect(createManualJournalEntryAction).toHaveBeenCalledTimes(1)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("navigates to the existing journal queue only after confirmed creation", async () => {
    ;(createManualJournalEntryAction as jest.Mock).mockResolvedValue({ success: true, data: { id: "journal-created" } })
    const { container } = render(await NewJournalEntryPage(pageProps))
    fillDraft(container)
    fireEvent.submit(container.querySelector("form")!)
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/en/dashboard/accounting/journals?notice=Journal%20draft%20created"))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    fireEvent.submit(container.querySelector("form")!)
    expect(createManualJournalEntryAction).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Creating draft…" })).toBeDisabled()
  })
})
