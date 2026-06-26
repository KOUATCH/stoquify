import { render, screen } from "@testing-library/react"

import { getAPWorkbenchAction } from "@/actions/purchasing/ap-control.actions"
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import { getAuthenticatedUser } from "@/config/useAuth"

import PurchasePayablesPage from "../page"

jest.mock("@/actions/purchasing/ap-control.actions", () => ({
  getAPWorkbenchAction: jest.fn(),
}))

jest.mock("@/config/useAuth", () => ({
  getAuthenticatedUser: jest.fn(),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/purchasing/APControlWorkbench", () => ({
  __esModule: true,
  default: () => <div>AP workbench rendered</div>,
}))

jest.mock("@/components/dashboard/DashboardErrorState", () => ({
  DashboardErrorState: jest.fn(() => (
    <section>
      <h1>Dashboard page could not load</h1>
      <p>One command source failed or timed out. Retry the read-only dashboard without exposing internal details.</p>
      <button type="button">Try again</button>
    </section>
  )),
}))

describe("PurchasePayablesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthenticatedUser as jest.Mock).mockResolvedValue({ organizationId: "org-1" })
  })

  it("renders the shared dashboard fallback when the AP read model fails", async () => {
    ;(getAPWorkbenchAction as jest.Mock).mockResolvedValue({
      success: false,
      error: "raw supplier AP SQL failure",
    })

    const ui = await PurchasePayablesPage({ params: Promise.resolve({ locale: "en" }) })
    render(ui)

    expect(DashboardErrorState).toHaveBeenCalledWith(
      expect.objectContaining({ error: "AP workbench data unavailable" }),
      undefined,
    )
    expect(screen.getByRole("heading", { name: "Dashboard page could not load" })).toBeInTheDocument()
    expect(screen.getByText(/Retry the read-only dashboard without exposing internal details/)).toBeInTheDocument()
    expect(screen.queryByText(/raw supplier AP SQL failure/)).not.toBeInTheDocument()
    expect(screen.queryByText("AP workbench rendered")).not.toBeInTheDocument()
  })
})

