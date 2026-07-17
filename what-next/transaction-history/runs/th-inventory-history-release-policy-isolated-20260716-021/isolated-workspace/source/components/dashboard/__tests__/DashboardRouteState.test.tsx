import type { SVGProps } from "react"
import { render, screen } from "@testing-library/react"

import { DashboardRouteState } from "../DashboardRouteState"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})

describe("DashboardRouteState", () => {
  it("renders permission failures without leaking protected details", () => {
    render(
      <DashboardRouteState
        kind="permission_denied"
        primaryHref="/en/dashboard"
        secondaryHref="/en/dashboard/settings/users"
        secondaryLabel="Contact admin"
      />,
    )

    expect(screen.getByRole("heading", { name: "This dashboard surface is not available for this role" })).toBeInTheDocument()
    expect(screen.getByText(/server-side permissions/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/en/dashboard")
    expect(screen.getByRole("link", { name: "Contact admin" })).toHaveAttribute("href", "/en/dashboard/settings/users")
  })

  it("renders not-found and loading states from shared dashboard copy", () => {
    const { rerender } = render(<DashboardRouteState kind="not_found" primaryHref="/en/dashboard" />)

    expect(screen.getByRole("heading", { name: "Dashboard page not found" })).toBeInTheDocument()
    expect(screen.getByText(/Return to the command center/)).toBeInTheDocument()

    rerender(<DashboardRouteState kind="loading" primaryHref="/en/dashboard" />)

    expect(screen.getByRole("heading", { name: "Preparing command surface" })).toBeInTheDocument()
    expect(screen.getByText(/layout is reserved/)).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true")
  })
})
