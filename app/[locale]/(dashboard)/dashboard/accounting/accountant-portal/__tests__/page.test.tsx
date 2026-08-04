import { render, screen } from "@testing-library/react"

import { getAccountantPortalAction } from "@/actions/accounting/data-trust.actions"
import { checkPermission } from "@/config/useAuth"

import AccountantPortalPage from "../page"

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}))

jest.mock("@/actions/accounting/data-trust.actions", () => ({
  getAccountantPortalAction: jest.fn(),
}))

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)

  return {
    FileSearch: Icon,
  }
})

jest.mock("@/components/accounting/AccountantPortal", () => ({
  AccountantPortal: ({
    initialData,
    initialError,
    locale,
  }: {
    initialData: { title?: string } | null
    initialError?: string
    locale: string
  }) => (
    <section>
      <h2>Accountant Portal Body</h2>
      <p>Locale: {locale}</p>
      {initialData?.title ? <p>{initialData.title}</p> : null}
      {initialError ? <p>{initialError}</p> : null}
    </section>
  ),
}))

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
}))

const mockCheckPermission = checkPermission as jest.Mock
const mockGetAccountantPortalAction = getAccountantPortalAction as jest.Mock

const params = Promise.resolve({ locale: "fr" as const })

describe("AccountantPortalPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetAccountantPortalAction.mockResolvedValue({
      success: true,
      data: { title: "Ledger evidence ready" },
    })
  })

  it("requires accounting audit read permission before loading accountant portal data", async () => {
    render(await AccountantPortalPage({ params }))

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.audit.read")
    expect(mockGetAccountantPortalAction).toHaveBeenCalledWith({ limit: 12, clientOrganizationId: undefined })
    expect(screen.getByRole("heading", { name: "Accountant Portal" })).toBeInTheDocument()
    expect(screen.getByText("Ledger evidence ready")).toBeInTheDocument()
    expect(screen.getByText("Locale: fr")).toBeInTheDocument()
  })

  it("stops before accountant portal data access when the permission guard denies access", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(AccountantPortalPage({ params })).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.audit.read")
    expect(mockGetAccountantPortalAction).not.toHaveBeenCalled()
  })

  it("keeps accountant portal action errors inside the portal after permission succeeds", async () => {
    mockGetAccountantPortalAction.mockResolvedValue({
      success: false,
      status: "error",
      error: "Accountant portal unavailable",
    })

    render(await AccountantPortalPage({ params }))

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.audit.read")
    expect(mockGetAccountantPortalAction).toHaveBeenCalledWith({ limit: 12, clientOrganizationId: undefined })
    expect(screen.getByText("Accountant portal unavailable")).toBeInTheDocument()
  })
})