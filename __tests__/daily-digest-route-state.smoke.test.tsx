import type { ReactNode, SVGProps } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import DailyDigestError from "@/app/[locale]/(dashboard)/dashboard/daily-digest/error"
import DailyDigestLoading from "@/app/[locale]/(dashboard)/dashboard/daily-digest/loading"
import DailyHabitDigestPage from "@/app/[locale]/(dashboard)/dashboard/daily-digest/page"
import { requireAnyPermission } from "@/lib/security/rbac"
import { getDailyHabitDigestData } from "@/services/daily-habit/daily-habit-digest.service"

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

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
}))

jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error {
    code: string
    status: number

    constructor(message = "Forbidden", code = "FORBIDDEN", status = 403) {
      super(message)
      this.name = "RbacError"
      this.code = code
      this.status = status
    }
  }

  return {
    RbacError,
    requireAnyPermission: jest.fn(),
  }
})

jest.mock("@/services/daily-habit/daily-habit-digest.service", () => ({
  getDailyHabitDigestData: jest.fn(),
}))

jest.mock("@/components/daily-habit/DailyHabitDigestDashboard", () => {
  const React = require("react")

  return {
    DailyHabitDigestDashboard: ({ data, locale }: { data: { marker?: string }; locale: string }) =>
      React.createElement(
        "section",
        { "data-testid": "daily-digest-shell" },
        React.createElement("h1", null, "Daily digest dashboard smoke"),
        React.createElement("span", null, locale),
        React.createElement("span", null, data.marker ?? "no-data"),
      ),
  }
})

const authContext = {
  orgId: "org-1",
  userId: "user-1",
  permissions: ["dashboard.read", "finance.read"],
}

function params(locale = "en") {
  return Promise.resolve({ locale })
}

describe("daily digest dashboard route state smoke", () => {
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    consoleError.mockRestore()
  })

  it("loads the route shell through RBAC and the tenant-scoped digest service", async () => {
    ;(requireAnyPermission as jest.Mock).mockResolvedValue(authContext)
    ;(getDailyHabitDigestData as jest.Mock).mockResolvedValue({ marker: "digest-data" })

    render(await DailyHabitDigestPage({ params: params("fr") }))

    expect(screen.getByRole("heading", { name: "Daily digest dashboard smoke" })).toBeInTheDocument()
    expect(screen.getByText("fr")).toBeInTheDocument()
    expect(screen.getByText("digest-data")).toBeInTheDocument()
    expect(requireAnyPermission).toHaveBeenCalledWith(
      ["dashboard.read", "finance.read", "accounting.close.read", "inventory.read"],
      { resource: "KontavaDailyHabitDigest" },
    )
    expect(getDailyHabitDigestData).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorPermissions: ["dashboard.read", "finance.read"],
      currency: "XAF",
    })
  })

  it("preserves permission and no-active-org safe states without calling the digest service", async () => {
    const { RbacError } = jest.requireMock("@/lib/security/rbac")
    const cases = [
      {
        code: "FORBIDDEN",
        title: "Daily Digest is not available for this role",
        message: "Daily Digest is read-only, but it still requires dashboard, finance, accounting, or inventory access.",
      },
      {
        code: "NO_ACTIVE_ORG",
        title: "Daily Digest needs an active organization",
        message: "Refresh your session from the dashboard so Daily Digest can load tenant-scoped signals.",
      },
    ]

    for (const routeCase of cases) {
      ;(requireAnyPermission as jest.Mock).mockRejectedValueOnce(new RbacError("Denied", routeCase.code, 403))

      render(await DailyHabitDigestPage({ params: params("en") }))

      expect(screen.getByRole("heading", { name: routeCase.title })).toBeInTheDocument()
      expect(screen.getByText(routeCase.message)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/en/dashboard")
      expect(getDailyHabitDigestData).not.toHaveBeenCalled()

      cleanup()
      jest.clearAllMocks()
    }
  })

  it("exposes route-native loading and safe retryable error states", () => {
    render(<DailyDigestLoading />)
    expect(screen.getByRole("heading", { name: "Preparing Daily Digest" })).toBeInTheDocument()
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
    cleanup()

    const reset = jest.fn()
    render(<DailyDigestError error={new Error("raw daily digest SQL failure")} reset={reset} />)

    expect(screen.getByRole("heading", { name: "Daily Digest could not load" })).toBeInTheDocument()
    expect(screen.queryByText(/raw daily digest SQL failure/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
