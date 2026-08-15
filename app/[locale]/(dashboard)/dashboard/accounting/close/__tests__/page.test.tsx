import { render, screen } from "@testing-library/react"

import { getCloseAssuranceDashboardAction } from "@/actions/accounting/close-assurance.actions"
import { checkPermission } from "@/config/useAuth"

import CloseAssurancePage from "../page"
import CloseAssurancePeriodPage from "../[periodId]/page"

jest.mock("@/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access", () => ({
  routeByKey: jest.fn(() => ({ key: "accounting-test" })),
  withAccountingSurfaceAccess: jest.fn(({ onAllowed }) => onAllowed({ orgId: "org-1" }, "en")),
}))

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}))

jest.mock("@/actions/accounting/close-assurance.actions", () => ({
  getCloseAssuranceDashboardAction: jest.fn(),
}))

jest.mock("@/components/accounting/CloseAssuranceCenter", () => ({
  CloseAssuranceCenter: ({
    initialData,
    initialError,
    initialPeriodId,
    locale,
  }: {
    initialData: unknown
    initialError?: string | null
    initialPeriodId?: string
    locale: string
  }) => (
    <section>
      <h2>Close assurance center</h2>
      <span>locale:{locale}</span>
      <span>period:{initialPeriodId || "all"}</span>
      <span>data:{initialData ? "loaded" : "empty"}</span>
      {initialError ? <span>{initialError}</span> : null}
    </section>
  ),
}))

jest.mock("@/components/accounting/CloseReadinessJourneyPanel", () => ({
  CloseReadinessJourneyPanel: ({ locale, data }: { locale: string; data: unknown }) => (
    <section>
      <h2>Close readiness journey</h2>
      <span>journey-locale:{locale}</span>
      <span>journey-data:{data ? "loaded" : "empty"}</span>
    </section>
  ),
}))

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)

  return {
    ClipboardCheck: Icon,
    FileSearch: Icon,
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
}))

const mockCheckPermission = checkPermission as jest.Mock
const mockGetCloseAssuranceDashboardAction = getCloseAssuranceDashboardAction as jest.Mock

const closeDashboardData = {
  activePeriodId: "period-1",
  readiness: {
    status: "ready",
  },
}

describe("CloseAssurancePage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetCloseAssuranceDashboardAction.mockResolvedValue({
      success: true,
      data: closeDashboardData,
    })
  })

  it("requires accounting close read permission before loading close assurance data", async () => {
    render(await CloseAssurancePage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.close.read")
    expect(mockGetCloseAssuranceDashboardAction).toHaveBeenCalledWith({})
    expect(screen.getByRole("heading", { name: "Close & Assurance Center" })).toBeInTheDocument()
    expect(screen.getByText("Close readiness journey")).toBeInTheDocument()
    expect(screen.getByText("period:all")).toBeInTheDocument()
    expect(screen.getByText("data:loaded")).toBeInTheDocument()
  })

  it("stops before close assurance data access when close read permission is denied", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(CloseAssurancePage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.close.read")
    expect(mockGetCloseAssuranceDashboardAction).not.toHaveBeenCalled()
  })

  it("keeps close assurance action errors inside the close center after permission succeeds", async () => {
    mockGetCloseAssuranceDashboardAction.mockResolvedValue({
      success: false,
      status: "error",
      error: "Close assurance unavailable",
    })

    render(await CloseAssurancePage({ params: Promise.resolve({ locale: "fr" }) }))

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.close.read")
    expect(mockGetCloseAssuranceDashboardAction).toHaveBeenCalledWith({})
    expect(screen.getByRole("heading", { name: "Centre De Cloture" })).toBeInTheDocument()
    expect(screen.getByText("Close assurance unavailable")).toBeInTheDocument()
  })
})

describe("CloseAssurancePeriodPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetCloseAssuranceDashboardAction.mockResolvedValue({
      success: true,
      data: closeDashboardData,
    })
  })

  it("requires accounting close read permission before loading period close assurance data", async () => {
    render(
      await CloseAssurancePeriodPage({
        params: Promise.resolve({ locale: "en", periodId: "period-1" }),
      }),
    )

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.close.read")
    expect(mockGetCloseAssuranceDashboardAction).toHaveBeenCalledWith({ periodId: "period-1" })
    expect(screen.getByRole("heading", { name: "Close & Assurance Center" })).toBeInTheDocument()
    expect(screen.getByText("period:period-1")).toBeInTheDocument()
    expect(screen.getByText("data:loaded")).toBeInTheDocument()
  })

  it("stops before period close assurance data access when close read permission is denied", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(
      CloseAssurancePeriodPage({
        params: Promise.resolve({ locale: "en", periodId: "period-1" }),
      }),
    ).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.close.read")
    expect(mockGetCloseAssuranceDashboardAction).not.toHaveBeenCalled()
  })
})
