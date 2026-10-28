import { render, screen } from "@testing-library/react"

import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import NotificationsDemoPage from "../page"

jest.mock("@/components/notifications/EnhancedNotificationTest", () => ({
  EnhancedNotificationTest: () => <section aria-label="notification-demo-client">Notification demo client</section>,
}))

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "EMAIL_NOT_VERIFIED" | "ACCOUNT_LOCKED" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    requirePermission: jest.fn(),
  }
})

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({
    kind,
    title,
    message,
    primaryHref,
  }: {
    kind: string
    title: string
    message: string
    primaryHref: string
  }) => (
    <main data-kind={kind} data-primary-href={primaryHref}>
      <h1>{title}</h1>
      <p>{message}</p>
    </main>
  ),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

function params(locale = "en") {
  return Promise.resolve({ locale })
}

describe("notifications demo route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["communication.notifications.read"],
    })
    mockObserveModuleAccess.mockResolvedValue({
      allowed: false,
      wouldBlock: true,
      result: "would_block",
      mode: "observe",
      moduleSlug: "settings",
    })
  })

  it("guards the notification demo with read permission and settings module observation", async () => {
    render(await NotificationsDemoPage({ params: params("en") }))

    expect(mockRequirePermission).toHaveBeenCalledWith("communication.notifications.read", {
      resource: "NotificationSystemDemo",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["communication.notifications.read"],
      moduleSlug: "settings",
      surfaceType: "page",
      surface: "/dashboard/notifications-demo",
      accessIntent: "read",
      mode: "observe",
    }))
    expect(screen.getByRole("heading", { name: "Notification System Demo" })).toBeInTheDocument()
    expect(screen.getByLabelText("notification-demo-client")).toBeInTheDocument()
  })

  it("fails closed before rendering when RBAC denies notification diagnostics", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await NotificationsDemoPage({ params: params("fr") }))

    expect(screen.getByRole("heading", { name: "Notification demo is not available for this role" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "permission_denied")
    expect(screen.getByRole("main")).toHaveAttribute("data-primary-href", "/fr/dashboard/settings/notifications")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(screen.queryByLabelText("notification-demo-client")).not.toBeInTheDocument()
  })

  it("fails closed before rendering when no active organization is available", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("No active organization", "NO_ACTIVE_ORG", 403))

    render(await NotificationsDemoPage({ params: params("en") }))

    expect(screen.getByRole("heading", { name: "Notification demo needs an active organization" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "no_active_org")
    expect(screen.getByRole("main")).toHaveAttribute("data-primary-href", "/en/dashboard")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(screen.queryByLabelText("notification-demo-client")).not.toBeInTheDocument()
  })
})