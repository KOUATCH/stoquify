import fs from "node:fs"
import path from "node:path"
import type { SVGProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"

import { DashboardErrorState } from "../DashboardErrorState"

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

describe("DashboardErrorState", () => {
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it("renders a redacted dashboard retry state and calls reset", () => {
    const reset = jest.fn()
    const error = new Error("raw provider token sk_live_sensitive_value")

    render(<DashboardErrorState error={error} reset={reset} title="Inventory could not load" />)

    expect(screen.getByRole("heading", { name: "Inventory could not load" })).toBeInTheDocument()
    expect(screen.getByText(/Retry the read-only dashboard without exposing internal details/)).toBeInTheDocument()
    expect(screen.queryByText(/sk_live_sensitive_value/)).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith(error)

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("uses the default dashboard title and keeps string errors out of the UI", () => {
    render(<DashboardErrorState error="raw SQL provider failure" reset={jest.fn()} />)

    expect(screen.getByRole("heading", { name: "Dashboard page could not load" })).toBeInTheDocument()
    expect(screen.getByText(/Retry the read-only dashboard without exposing internal details/)).toBeInTheDocument()
    expect(screen.queryByText(/raw SQL provider failure/)).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith("raw SQL provider failure")
  })

  it("renders optional recovery actions inside the shared error page", () => {
    render(
      <DashboardErrorState
        error="stale organization session"
        actions={<button type="button">Sign out</button>}
      />,
    )

    expect(screen.getByRole("heading", { name: "Dashboard page could not load" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument()
    expect(screen.queryByText(/stale organization session/)).not.toBeInTheDocument()
  })

  it("keeps the root dashboard session recovery on the shared error page", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app", "[locale]", "(dashboard)", "dashboard", "page.tsx"),
      "utf8",
    )

    expect(source).toContain("<DashboardErrorState")
    expect(source).toContain("actions={<SessionRecoverySignOutButton")
    expect(source).not.toContain("<Package")
    expect(source).not.toContain("dashboard-glass-panel rounded-lg px-6 py-12")
  })
})
