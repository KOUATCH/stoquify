import { render, screen } from "@testing-library/react"

import { getAccountingControlCenterAction } from "@/actions/accounting/settings.actions"
import { checkPermission } from "@/config/useAuth"

import AccountingControlCenterPage from "../page"

jest.mock("@/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access", () => ({
  routeByKey: jest.fn(() => ({ key: "accounting-test" })),
  withAccountingSurfaceAccess: jest.fn(({ onAllowed }) => onAllowed({ orgId: "org-1" }, "en")),
}))

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}))

jest.mock("@/actions/accounting/settings.actions", () => ({
  getAccountingControlCenterAction: jest.fn(),
}))

jest.mock("@/components/accounting/AccountingControlCenter", () => ({
  AccountingControlCenter: ({
    initialData,
    initialError,
    locale,
  }: {
    initialData: unknown
    initialError: string | null
    locale: string
  }) => (
    <section>
      <span>Control center {locale}</span>
      {initialData ? <p>Loaded control data</p> : null}
      {initialError ? <p>{initialError}</p> : null}
    </section>
  ),
}))

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)

  return {
    Settings2: Icon,
    ShieldCheck: Icon,
  }
})

jest.mock("../../_components/accounting-ui", () => ({
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
const mockGetAccountingControlCenterAction = getAccountingControlCenterAction as jest.Mock

const pageProps = {
  params: Promise.resolve({ locale: "en" }),
}

describe("AccountingControlCenterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetAccountingControlCenterAction.mockResolvedValue({
      success: true,
      data: { readinessStatus: "ready" },
    })
  })

  it("requires accounting setup manage permission before loading control center data", async () => {
    render(await AccountingControlCenterPage(pageProps))

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.setup.manage")
    expect(mockGetAccountingControlCenterAction).toHaveBeenCalledWith({})
    expect(screen.getByRole("heading", { name: "Accounting Control Center" })).toBeInTheDocument()
    expect(screen.getByText("Loaded control data")).toBeInTheDocument()
  })

  it("stops before control center data access when setup permission is denied", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(AccountingControlCenterPage(pageProps)).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.setup.manage")
    expect(mockGetAccountingControlCenterAction).not.toHaveBeenCalled()
  })
})
